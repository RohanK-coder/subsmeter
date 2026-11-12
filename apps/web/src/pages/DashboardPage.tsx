import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDate, formatNumber, formatPrice, metricLabel } from "@/lib/format";
import { useSubscription } from "@/lib/queries";
import type { Member } from "@/types";

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const isOwner = user?.role === "OWNER";
  const subscription = useSubscription();

  const members = useQuery({
    queryKey: ["tenant", "members"],
    queryFn: () => api<{ members: Member[] }>("/tenant/members"),
    enabled: isOwner,
  });

  const sub = subscription.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
        <p className="text-sm text-muted-foreground">
          You are signed in to <span className="font-medium">{tenant?.name}</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Current plan</CardTitle>
              <CardDescription>Your subscription and monthly quotas</CardDescription>
            </div>
            <Link to="/plans" className={buttonVariants({ variant: "outline", size: "sm" })}>
              View plans
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {subscription.isLoading && <p className="text-muted-foreground">Loading…</p>}
          {subscription.isError && (
            <p className="text-destructive">{(subscription.error as Error).message}</p>
          )}

          {sub && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{sub.plan.name}</span>
                  <Badge variant={sub.status === "ACTIVE" ? "default" : "destructive"}>{sub.status}</Badge>
                </div>
                <span className="text-muted-foreground">
                  {formatPrice(sub.plan.priceCents, sub.plan.currency)} / {sub.plan.interval}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Current period</span>
                <span>
                  {formatDate(sub.currentPeriodStart)} to {formatDate(sub.currentPeriodEnd)}
                </span>
              </div>

              <ul className="divide-y rounded-md border">
                {sub.plan.quotas.map((q) => (
                  <li key={q.metric} className="flex items-center justify-between px-3 py-2">
                    <span>{metricLabel(q.metric)}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{formatNumber(q.limit)} / month</span>
                      <Badge variant="outline">
                        {q.enforcement === "HARD" ? "Hard limit" : "Overage allowed"}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Usage tracking against these limits arrives in Stage 3 and 4.</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Your tenant, resolved from your access token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span>{tenant?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge>{tenant?.status}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tenant ID</span>
            <span className="font-mono text-xs">{tenant?.id}</span>
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Only people in your workspace appear here</CardDescription>
          </CardHeader>
          <CardContent>
            {members.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {members.isError && (
              <p className="text-sm text-destructive">{(members.error as Error).message}</p>
            )}
            <ul className="divide-y">
              {members.data?.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-muted-foreground">{m.email}</div>
                  </div>
                  <Badge variant="secondary">{m.role}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}