import PlanCard from "@/components/PlanCard";
import { usePlans, useSubscription } from "@/lib/queries";

export default function PricingPage() {
  const plans = usePlans();
  const subscription = useSubscription();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Every workspace starts on Free. Upgrading arrives with Stripe in a later stage.
        </p>
      </div>

      {plans.isLoading && <p className="text-sm text-muted-foreground">Loading plans…</p>}
      {plans.isError && <p className="text-sm text-destructive">{(plans.error as Error).message}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.data?.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={subscription.data?.plan.key === plan.key}
          />
        ))}
      </div>
    </div>
  );
}