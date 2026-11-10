import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

const app = createApp();
const run = `test-${Date.now()}`;
const PASSWORD = "correct-horse-battery";

const signupBody = (label: string) => ({
  name: `User ${label}`,
  tenantName: `${run}-tenant-${label}`,
  email: `${run}-${label}@example.com`,
  password: PASSWORD,
});

const cookieFrom = (res: { headers: Record<string, unknown> }): string =>
  (res.headers["set-cookie"] as unknown as string[])[0].split(";")[0];

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("auth and tenant isolation", () => {
  let a: { token: string; cookie: string; tenantId: string; email: string };
  let b: { token: string; cookie: string; tenantId: string; email: string };

  beforeAll(async () => {
    const resA = await request(app).post("/auth/signup").send(signupBody("a"));
    const resB = await request(app).post("/auth/signup").send(signupBody("b"));
    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
    a = {
      token: resA.body.accessToken,
      cookie: cookieFrom(resA),
      tenantId: resA.body.tenant.id,
      email: resA.body.user.email,
    };
    b = {
      token: resB.body.accessToken,
      cookie: cookieFrom(resB),
      tenantId: resB.body.tenant.id,
      email: resB.body.user.email,
    };
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { name: { startsWith: run } } }); // cascades
    await prisma.$disconnect();
  });

  it("signup creates an OWNER in a new tenant and sets an httpOnly cookie", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ ...signupBody("c") });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("OWNER");
    expect(res.body.refreshToken).toBeUndefined();
    expect(res.headers["set-cookie"][0]).toContain("HttpOnly");
  });

  it("rejects duplicate emails with 409", async () => {
    const res = await request(app).post("/auth/signup").send(signupBody("a"));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects invalid input with 400", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ ...signupBody("x"), password: "short" });
    expect(res.status).toBe(400);
  });

  it("rejects wrong passwords with 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: a.email, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("requires a token for /me", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
  });

  it("returns the right user and tenant from /me", async () => {
    const res = await request(app).get("/me").set(bearer(a.token));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(a.email);
    expect(res.body.tenant.id).toBe(a.tenantId);
  });

  it("isolates tenants: each owner only sees their own members", async () => {
    const resA = await request(app).get("/tenant/members").set(bearer(a.token));
    const resB = await request(app).get("/tenant/members").set(bearer(b.token));
    const emailsA = resA.body.members.map((m: { email: string }) => m.email);
    const emailsB = resB.body.members.map((m: { email: string }) => m.email);

    expect(emailsA).toContain(a.email);
    expect(emailsA).not.toContain(b.email);
    expect(emailsB).toContain(b.email);
    expect(emailsB).not.toContain(a.email);
  });

  it("ignores a tenantId supplied by the client", async () => {
    const res = await request(app)
      .get("/tenant/members")
      .query({ tenantId: b.tenantId })
      .set(bearer(a.token));
    const emails = res.body.members.map((m: { email: string }) => m.email);
    expect(emails).toContain(a.email);
    expect(emails).not.toContain(b.email);
  });

  it("forbids MEMBER role from listing members", async () => {
    const email = `${run}-member@example.com`;
    await prisma.user.create({
      data: {
        tenantId: a.tenantId,
        email,
        name: "Member",
        passwordHash: await hashPassword(PASSWORD),
        role: "MEMBER",
      },
    });
    const login = await request(app).post("/auth/login").send({ email, password: PASSWORD });
    expect(login.status).toBe(200);

    const res = await request(app).get("/tenant/members").set(bearer(login.body.accessToken));
    expect(res.status).toBe(403);
  });

  it("rotates refresh tokens and detects reuse", async () => {
    const first = await request(app).post("/auth/refresh").set("Cookie", a.cookie);
    expect(first.status).toBe(200);
    const newCookie = cookieFrom(first);
    expect(newCookie).not.toBe(a.cookie);

    // Replaying the old token fails...
    const reuse = await request(app).post("/auth/refresh").set("Cookie", a.cookie);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe("REFRESH_TOKEN_REUSED");

    // ...and revokes the whole family, including the new token.
    const afterReuse = await request(app).post("/auth/refresh").set("Cookie", newCookie);
    expect(afterReuse.status).toBe(401);
  });

  it("logout revokes the refresh token", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ email: b.email, password: PASSWORD });
    const cookie = cookieFrom(login);

    const out = await request(app).post("/auth/logout").set("Cookie", cookie);
    expect(out.status).toBe(204);

    const res = await request(app).post("/auth/refresh").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });
});