import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CircleDollarSign,
  GraduationCap,
  Moon,
  Settings,
  Sparkles,
  Sun,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { useThemeStore } from "@/app/theme-store";
import { PageHeader } from "@/components/layout/PageHeader";

const plannedPages: Record<
  string,
  {
    title: string;
    icon: LucideIcon;
  }
> = {
  students: {
    title: "Students",
    icon: GraduationCap,
  },
  teachers: {
    title: "Teachers",
    icon: UsersRound,
  },
  schedule: {
    title: "Schedule",
    icon: CalendarDays,
  },
  programs: {
    title: "Programs",
    icon: TrendingUp,
  },
  payments: {
    title: "Payments",
    icon: CircleDollarSign,
  },
  leads: {
    title: "Leads",
    icon: Sparkles,
  },
  settings: {
    title: "Settings",
    icon: Settings,
  },
};

export function AdminPlannedPage({ page }: { page: keyof typeof plannedPages }) {
  const content = plannedPages[page];
  const Icon = content.icon;
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isSettingsPage = page === "settings";

  return (
    <section className="space-y-6">
      <PageHeader title={content.title} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-md border border-border bg-surface p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-surface-subtle text-brand">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-primary">Not built yet</h2>
            </div>
          </div>
        </section>

        {isSettingsPage ? (
          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="text-base font-semibold text-primary">Appearance</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Switch the workspace theme for this browser.
            </p>
            <button
              type="button"
              className="mt-5 flex h-11 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-sm font-medium text-primary transition hover:bg-surface-subtle"
              onClick={toggleTheme}
            >
              <span>{theme === "light" ? "Light mode" : "Dark mode"}</span>
              {theme === "light" ? (
                <Sun className="h-4 w-4 text-brand" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-brand" aria-hidden="true" />
              )}
            </button>
          </section>
        ) : null}
      </div>
    </section>
  );
}
