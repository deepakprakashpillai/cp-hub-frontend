import { Moon, Sun } from "lucide-react";
import { NavLink, Outlet } from "react-router";

import { useThemeStore } from "@/app/theme-store";
import logoUrl from "@/assets/logo.png";
import { cn } from "@/lib/utils";

const portalLinks = [
  { to: "/admin", label: "Admin" },
  { to: "/teacher", label: "Teacher" },
  { to: "/student", label: "Student" },
  { to: "/leads", label: "Leads" },
];

export function AppShell() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <div className="min-h-screen bg-background text-primary">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="CP Hub" className="h-8 w-8 object-contain" />
            <span className="text-sm font-semibold">CP Hub</span>
          </div>
          <nav className="flex items-center gap-1 rounded-md border border-border bg-surface-subtle p-1">
            {portalLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "rounded px-3 py-1.5 text-xs font-medium text-muted transition hover:text-primary",
                    isActive && "bg-background text-primary shadow-sm",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md border border-border bg-background text-muted transition hover:text-primary"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
