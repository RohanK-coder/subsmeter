import type { EnforcementMode } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { createFreeSubscription } from "../subscriptions/subscription.service";

interface PlanSeed {
  key: string;
  name: string;
  description: string;
  priceCents: number;
  sortOrder: number;
  features: string[];
  quotas: { metric: string; limitValue: number; enforcement: EnforcementMode }[];
}

const PLAN_SEEDS: PlanSeed[] = [
  {
    key: "free",
    name: "Free",
    description: "For trying things out",
    priceCents: 0,
    sortOrder: 1,
    features: ["1 workspace", "Community support"],
    quotas: [
      { metric: "api_calls", limitValue: 1_000, enforcement: "HARD" },
      { metric: "storage_mb", limitValue: 100, enforcement: "HARD" },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    description: "For growing teams",
    priceCents: 4_900,
    sortOrder: 2,
    features: ["Unlimited API keys", "Email support", "Overage allowed"],
    quotas: [
      { metric: "api_calls", limitValue: 100_000, enforcement: "SOFT" },
      { metric: "storage_mb", limitValue: 5_000, enforcement: "SOFT" },
    ],
  },
  {
    key: "business",
    name: "Business",
    description: "For high-volume workloads",
    priceCents: 19_900,
    sortOrder: 3,
    features: ["Unlimited API keys", "Priority support", "Overage allowed", "Usage exports"],
    quotas: [
      { metric: "api_calls", limitValue: 1_000_000, enforcement: "SOFT" },
      { metric: "storage_mb", limitValue: 100_000, enforcement: "SOFT" },
    ],
  },
];

/** Idempotent: safe to run any number of times. Does not touch stripe-related fields. */
export async function seedPlans() {
  for (const { quotas, ...data } of PLAN_SEEDS) {
    const plan = await prisma.plan.upsert({
      where: { key: data.key },
      update: data,
      create: data,
    });

    for (const q of quotas) {
      await prisma.planQuota.upsert({
        where: { planId_metric: { planId: plan.id, metric: q.metric } },
        update: { limitValue: q.limitValue, period: "MONTHLY", enforcement: q.enforcement },
        create: {
          planId: plan.id,
          metric: q.metric,
          limitValue: q.limitValue,
          period: "MONTHLY",
          enforcement: q.enforcement,
        },
      });
    }
  }
}

/** Gives every tenant created before Stage 2 a Free subscription. Returns how many it fixed. */
export async function backfillSubscriptions(): Promise<number> {
  const tenants = await prisma.tenant.findMany({
    where: { subscription: null },
    select: { id: true },
  });
  for (const t of tenants) {
    await createFreeSubscription(t.id);
  }
  return tenants.length;
}