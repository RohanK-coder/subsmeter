import { Prisma, type Tenant, type User } from "@prisma/client";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { signAccessToken } from "../../lib/jwt";
import { hashPassword, verifyPassword } from "../../lib/password";
import { prisma } from "../../lib/prisma";
import { generateRefreshToken, hashToken } from "../../lib/tokens";
import type { LoginInput, SignupInput } from "./auth.schemas";

const REFRESH_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

// Used to keep login timing similar when the email doesn't exist.
const dummyHash = hashPassword("dummy-password-for-timing");

export interface Session {
  accessToken: string;
  refreshToken: string; // goes into the cookie, never into the JSON body
  user: { id: string; email: string; name: string; role: User["role"] };
  tenant: { id: string; name: string; status: Tenant["status"] };
}

function buildSession(user: User, tenant: Tenant, refreshToken: string): Session {
  return {
    accessToken: signAccessToken(user),
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    tenant: { id: tenant.id, name: tenant.name, status: tenant.status },
  };
}

async function createRefreshToken(userId: string, client: Prisma.TransactionClient) {
  const token = generateRefreshToken();
  await client.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return token;
}

function assertTenantActive(tenant: Tenant) {
  if (tenant.status === "SUSPENDED") {
    throw new AppError(403, "TENANT_SUSPENDED", "This workspace has been suspended");
  }
}

export async function signup(input: SignupInput): Promise<Session> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    // Tenant + owner + first refresh token are created atomically.
    const { tenant, user, refreshToken } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: input.tenantName } });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.email,
          name: input.name,
          passwordHash,
          role: "OWNER",
        },
      });
      const refreshToken = await createRefreshToken(user.id, tx);
      return { tenant, user, refreshToken };
    });

    return buildSession(user, tenant, refreshToken);
  } catch (err) {
    // Two simultaneous signups with the same email: the unique index catches the loser.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }
    throw err;
  }
}

export async function login(input: LoginInput): Promise<Session> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { tenant: true },
  });

  const valid = await verifyPassword(input.password, user ? user.passwordHash : await dummyHash);
  if (!user || !valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
  }

  assertTenantActive(user.tenant);

  const refreshToken = await prisma.$transaction((tx) => createRefreshToken(user.id, tx));
  return buildSession(user, user.tenant, refreshToken);
}

export async function refresh(rawToken: string | undefined): Promise<Session> {
  if (!rawToken) {
    throw new AppError(401, "NO_REFRESH_TOKEN", "No refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { include: { tenant: true } } },
  });

  if (!stored) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }

  // A revoked token being presented again means it was probably stolen: kill every session.
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError(401, "REFRESH_TOKEN_REUSED", "Session is no longer valid");
  }

  if (stored.expiresAt < new Date()) {
    throw new AppError(401, "REFRESH_TOKEN_EXPIRED", "Session expired, please log in again");
  }

  assertTenantActive(stored.user.tenant);

  // Rotate: revoke the old token and issue a new one in a single transaction.
  const newToken = await prisma.$transaction(async (tx) => {
    const { count } = await tx.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null }, // guards against concurrent use
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
    }
    return createRefreshToken(stored.userId, tx);
  });

  return buildSession(stored.user, stored.user.tenant, newToken);
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}