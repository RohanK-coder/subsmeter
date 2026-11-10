import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: Role;
}

export function signAccessToken(user: { id: string; tenantId: string; role: Role }): string {
  return jwt.sign({ tid: user.tenantId, role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): AuthContext {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
  }) as jwt.JwtPayload;

  if (!payload.sub || typeof payload.tid !== "string" || typeof payload.role !== "string") {
    throw new Error("Malformed token payload");
  }

  return { userId: payload.sub, tenantId: payload.tid, role: payload.role as Role };
}