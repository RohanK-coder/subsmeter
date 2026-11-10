import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Member } from "@/types";

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const isOwner = user?.role === "OWNER";

  const members = useQuery({
    queryKey: ["tenant", "members"],
    queryFn: () => api<{ members: Member[] }>("/tenant/members"),
    enabled: isOwner,
  });

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