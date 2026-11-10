import type { AuthUser, UserRole } from "@/features/auth/api";

export function hasRole(user: AuthUser, role: UserRole) {
  return (user.roles ?? [user.role]).includes(role);
}

export function loginDestination(user: AuthUser, admin: boolean, from?: string) {
  const allowed: UserRole[] = admin ? ["admin"] : ["teacher", "student", "lead_manager"];
  const role = allowed.find((candidate) => hasRole(user, candidate));
  if (!role) return null;
  const path = from?.split("?")[0];
  if (from && path && allowed.some((candidate) => hasRole(user, candidate) &&
    (path === homeForRole(candidate) || path.startsWith(`${homeForRole(candidate)}/`)))) return from;
  return homeForRole(role);
}

export function homeForRole(role: UserRole) {
  switch (role) {
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
    case "lead_manager":
      return "/leads";
    case "admin":
      return "/admin";
  }
}
