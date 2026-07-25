import { parseISO, format } from "date-fns";
import { User, Moon, Sun, RefreshCw } from "lucide-react";

import { useActiveStudent } from "@/features/student/student-store";
import { useThemeStore } from "@/app/theme-store";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { cn } from "@/lib/utils";

export function StudentSettingsPage() {
  const { activeStudent, students, setSelectedStudentId, isLoading } = useActiveStudent();
  const { theme, setTheme } = useThemeStore();

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Student" title="Settings & Account" />

      {/* Pre-Auth Context Switcher Card */}
      <div className="rounded-md border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-brand" /> Active Student Context Switcher
            </h2>
            <p className="text-xs text-muted">
              Select active seeded student profile for pre-auth testing.
            </p>
          </div>
          <StatusBadge tone="indigo">Dev Context</StatusBadge>
        </div>

        <div className="max-w-xs">
          <FilterSelect
            includeAll={false}
            value={activeStudent?.student.id ?? ""}
            options={students.map((st) => ({
              value: st.student.id,
              label: st.user.full_name,
            }))}
            onChange={(val) => setSelectedStudentId(val)}
            disabled={isLoading || students.length === 0}
          />
        </div>
      </div>

      {/* Profile Overview Card */}
      {activeStudent ? (
        <div className="rounded-md border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <User className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-primary">Student Profile Information</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-md border border-border bg-background px-4 py-3">
              <QuietLabel tone="muted">Full Name</QuietLabel>
              <p className="mt-1 text-xs font-semibold text-primary">{activeStudent.user.full_name}</p>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-3">
              <QuietLabel tone="muted">Email Address</QuietLabel>
              <p className="mt-1 text-xs font-semibold text-primary">{activeStudent.user.email}</p>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-3">
              <QuietLabel tone="muted">Phone</QuietLabel>
              <p className="mt-1 text-xs font-semibold text-primary">{activeStudent.user.phone || "Not set"}</p>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-3">
              <QuietLabel tone="muted">Program Type</QuietLabel>
              <p className="mt-1 text-xs font-semibold text-primary capitalize">
                {activeStudent.student.program_type.replace("_", " ")}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-3">
              <QuietLabel tone="muted">Account Status</QuietLabel>
              <p className="mt-1 text-xs font-semibold text-primary capitalize">{activeStudent.student.status}</p>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-3">
              <QuietLabel tone="muted">Access Validity Window</QuietLabel>
              <p className="mt-1 text-xs font-semibold text-primary">
                {activeStudent.student.access_starts_at && activeStudent.student.access_ends_at
                  ? `${format(parseISO(activeStudent.student.access_starts_at), "MMM d")} - ${format(
                      parseISO(activeStudent.student.access_ends_at),
                      "MMM d, yyyy",
                    )}`
                  : "No active access window"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Theme Preferences Card */}
      <div className="rounded-md border border-border bg-surface p-5 space-y-4 shadow-sm">
        <div className="border-b border-border pb-3">
          <h2 className="text-sm font-semibold text-primary">Appearance Preferences</h2>
          <p className="text-xs text-muted">Customize UI theme mode.</p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-subtle p-1 max-w-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex-1 inline-flex h-7 items-center justify-center gap-1.5 rounded px-3 text-xs font-medium transition",
              theme === "light"
                ? "bg-surface text-brand shadow-sm font-semibold"
                : "text-muted hover:text-primary",
            )}
          >
            <Sun className="h-3.5 w-3.5" /> Light
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex-1 inline-flex h-7 items-center justify-center gap-1.5 rounded px-3 text-xs font-medium transition",
              theme === "dark"
                ? "bg-surface text-brand shadow-sm font-semibold"
                : "text-muted hover:text-primary",
            )}
          >
            <Moon className="h-3.5 w-3.5" /> Dark
          </button>
        </div>
      </div>
    </section>
  );
}
