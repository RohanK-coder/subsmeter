import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm ${isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`;

export default function AppShell() {
  const { user, tenant, logout } = useAuth();

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="font-semibold">SubsMeter</span>
              <span className="hidden text-sm text-muted-foreground sm:inline">/ {tenant?.name}</span>
            </div>
            <nav className="flex items-center gap-4">
              <NavLink to="/" end className={navClass}>
                Dashboard
              </NavLink>
              <NavLink to="/plans" className={navClass}>
                Plans
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm md:inline">{user?.email}</span>
            <Badge variant="secondary">{user?.role}</Badge>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}