import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/features/auth/auth-context";
import { isDevAuthBypassEnabled } from "@/features/auth/dev-bypass";
import { homeForRole } from "@/features/auth/roles";
import type { UserRole } from "@/features/auth/api";

export function RequireAuth({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading && !isDevAuthBypassEnabled()) return <SessionLoading />;
  if (!user && !isDevAuthBypassEnabled()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user && !roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return <>{children}</>;
}

function SessionLoading() {
  return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted">Restoring your session…</div>;
}
