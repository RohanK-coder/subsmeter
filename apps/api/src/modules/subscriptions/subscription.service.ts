import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { toPlanDto } from "../plans/plans.service";

export const FREE_PLAN_KEY = "free";

/** Calendar month in UTC: [start, end). `end` is the first instant of next month. */
export function currentMonthPeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/** Works with the normal client or inside a transaction (pass `tx`). */
export async function createFreeSubscription(
  tenantId: string,
  client: Prisma.TransactionClient = prisma
) {
  const plan = await client.plan.findUnique({ where: { key: FREE_PLAN_KEY } });
  if (!plan) {
    throw new AppError(
      500,
      "PLANS_NOT_SEEDED",
      "Plans have not been seeded. Run: npm run db:seed -w apps/api"
    );
  }
  const { start, end } = currentMonthPeriod();
  return client.subscription.create({
    data: {
      tenantId,
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: start,
      currentPeriodEnd: end,
    },
  });
}

const include = { plan: { include: { quotas: true } } } satisfies Prisma.SubscriptionInclude;
type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{ include: typeof include }>;

function toSubscriptionDto(sub: SubscriptionWithPlan) {
  return {
    status: sub.status,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    plan: toPlanDto(sub.plan),
  };
}

export async function getSubscription(tenantId: string) {
  let sub = await prisma.subscription.findUnique({ where: { tenantId }, include });

  // Self-heal: an account that has no subscription (for example created before Stage 2).
  if (!sub) {
    try {
      await createFreeSubscription(tenantId);
    } catch (err) {
      // A concurrent request created it first: that's fine, we just read it below.
      const raced = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!raced) throw err;
    }
    sub = await prisma.subscription.findUnique({ where: { tenantId }, include });
  }
  if (!sub) throw new AppError(404, "NOT_FOUND", "Subscription not found");

  // Without Stripe, nothing advances the billing period, so roll it forward here.
  // (Stage 6 will let Stripe webhooks own the period for paid subscriptions.)
  const now = new Date();
  if (now >= sub.currentPeriodEnd) {
    const { start, end } = currentMonthPeriod(now);
    sub = await prisma.subscription.update({
      where: { tenantId },
      data: { currentPeriodStart: start, currentPeriodEnd: end },
      include,
    });
  }

  return toSubscriptionDto(sub);
}