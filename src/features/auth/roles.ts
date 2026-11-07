import type { UserRole } from "@/features/auth/api";

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
