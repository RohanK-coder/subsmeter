import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

function FullPageMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

/** Only logged-in users get through. */
export function ProtectedRoute() {
  const { status } = useAuth();
  if (status === "loading") return <FullPageMessage text="Loading…" />;
  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Login and signup pages: logged-in users are sent to the dashboard. */
export function GuestRoute() {
  const { status } = useAuth();
  if (status === "loading") return <FullPageMessage text="Loading…" />;
  if (status === "authenticated") return <Navigate to="/" replace />;
  return <Outlet />;
}