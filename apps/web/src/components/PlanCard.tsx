import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPrice, metricLabel } from "@/lib/format";
import type { Plan } from "@/types";

interface Props {
  plan: Plan;
  isCurrent: boolean;
}

export default function PlanCard({ plan, isCurrent }: Props) {
  return (
    <Card className={isCurrent ? "ring-2 ring-primary" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          {isCurrent && <Badge>Current plan</Badge>}
        </div>
        <CardDescription>{plan.description}</CardDescription>
        <div className="pt-2">
          <span className="text-3xl font-semibold">{formatPrice(plan.priceCents, plan.currency)}</span>
          <span className="text-sm text-muted-foreground"> / {plan.interval}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Included each month
          </h3>
          <ul className="space-y-1 text-sm">
            {plan.quotas.map((q) => (
              <li key={q.metric} className="flex items-center justify-between">
                <span>{metricLabel(q.metric)}</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{formatNumber(q.limit)}</span>
                  <Badge variant="outline">{q.enforcement === "HARD" ? "Hard limit" : "Overage allowed"}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <ul className="space-y-1 text-sm text-muted-foreground">
          {plan.features.map((f) => (
            <li key={f}>✓ {f}</li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {/* Enabled in Stage 5 when Stripe Checkout is added */}
        <Button className="w-full" variant={isCurrent ? "secondary" : "default"} disabled>
          {isCurrent ? "Your current plan" : "Available soon"}
        </Button>
      </CardFooter>
    </Card>
  );
}