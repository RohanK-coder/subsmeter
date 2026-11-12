import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { seedPlans } from "../src/modules/plans/plans.seed";

const app = createApp();
const run = `plans-${Date.now()}`;
const PASSWORD = "correct-horse-battery";
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

async function signup(label: string) {
  const res = await request(app)
    .post("/auth/signup")
    .send({
      name: `User ${label}`,
      tenantName: `${run}-tenant-${label}`,
      email: `${run}-${label}@example.com`,
      password: PASSWORD,
    });
  expect(res.status).toBe(201);
  return { token: res.body.accessToken as string, tenantId: res.body.tenant.id as string };
}

describe("plans and subscriptions", () => {
  afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { name: { startsWith: run } } }); // cascades
});

  it("GET /plans is public and returns Free, Pro, Business in order", async () => {
    const res = await request(app).get("/plans");
    expect(res.status).toBe(200);

    const keys = res.body.plans.map((p: { key: string }) => p.key);
    expect(keys).toEqual(["free", "pro", "business"]);

    const free = res.body.plans[0];
    expect(free.priceCents).toBe(0);
    expect(Number.isInteger(res.body.plans[1].priceCents)).toBe(true);
    expect(free.quotas.length).toBeGreaterThan(0);
    expect(free.quotas[0]).toMatchObject({ period: "MONTHLY", enforcement: "HARD" });
    expect(free.stripePriceId).toBeUndefined();
  });

  it("seeding twice does not create duplicates", async () => {
    await seedPlans();
    await seedPlans();
    const count = await prisma.plan.count({ where: { key: { in: ["free", "pro", "business"] } } });
    expect(count).toBe(3);
  });

  it("signup puts the new tenant on the Free plan", async () => {
    const a = await signup("a");
    const res = await request(app).get("/subscription").set(bearer(a.token));
    expect(res.status).toBe(200);
    expect(res.body.subscription.plan.key).toBe("free");
    expect(res.body.subscription.status).toBe("ACTIVE");
    expect(new Date(res.body.subscription.currentPeriodEnd).getTime()).toBeGreaterThan(
      new Date(res.body.subscription.currentPeriodStart).getTime()
    );
  });

  it("requires authentication for /subscription", async () => {
    const res = await request(app).get("/subscription");
    expect(res.status).toBe(401);
  });

  it("keeps subscriptions isolated between tenants", async () => {
    const a = await signup("iso-a");
    const b = await signup("iso-b");

    const pro = await prisma.plan.findUniqueOrThrow({ where: { key: "pro" } });
    await prisma.subscription.update({ where: { tenantId: a.tenantId }, data: { planId: pro.id } });

    const resA = await request(app).get("/subscription").set(bearer(a.token));
    const resB = await request(app).get("/subscription").set(bearer(b.token));
    expect(resA.body.subscription.plan.key).toBe("pro");
    expect(resB.body.subscription.plan.key).toBe("free");
  });

  it("creates a Free subscription for a tenant that has none (pre-Stage-2 account)", async () => {
    const email = `${run}-legacy@example.com`;
    await prisma.tenant.create({
      data: {
        name: `${run}-tenant-legacy`,
        users: {
          create: {
            email,
            name: "Legacy",
            passwordHash: await hashPassword(PASSWORD),
            role: "OWNER",
          },
        },
      },
    });

    const login = await request(app).post("/auth/login").send({ email, password: PASSWORD });
    expect(login.status).toBe(200);

    const res = await request(app).get("/subscription").set(bearer(login.body.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.subscription.plan.key).toBe("free");
  });
});