import type { Plan, PlanQuota } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export type PlanWithQuotas = Plan & { quotas: PlanQuota[] };

// Public shape of a plan. Internal fields (like a future Stripe price id) are never exposed.
export function toPlanDto(plan: PlanWithQuotas) {
  return {
    id: plan.id,
    key: plan.key,
    name: plan.name,
    description: plan.description,
    priceCents: plan.priceCents,
    currency: plan.currency,
    interval: plan.interval,
    features: plan.features,
    quotas: [...plan.quotas]
      .sort((a, b) => a.metric.localeCompare(b.metric))
      .map((q) => ({
        metric: q.metric,
        limit: q.limitValue,
        period: q.period,
        enforcement: q.enforcement,
      })),
  };
}

export async function listActivePlans() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    include: { quotas: true },
    orderBy: { sortOrder: "asc" },
  });
  return plans.map(toPlanDto);
}