import { useThemeStore } from "@/app/theme-store";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import { Moon, Sun, ShieldAlert, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { cn } from "@/lib/utils";

export function TeacherSettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { teachers, activeTeacher, activeTeacherId, setSelectedTeacherId } = useActiveTeacher();

  return (
    <section className="space-y-5">
      {/* Header */}
      <PageHeader title="Settings & Profile" />

      {/* Profile Overview Card */}
      <div className="rounded-md border border-border bg-surface p-5 space-y-4">
        <h2 className="text-base font-semibold text-primary border-b border-border pb-3">Teacher Profile Information</h2>
        {activeTeacher ? (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <QuietLabel>Display Name</QuietLabel>
                <p className="text-sm font-semibold text-primary mt-0.5">{activeTeacher.teacher.display_name}</p>
              </div>
              <div>
                <QuietLabel>Linked Account Name</QuietLabel>
                <p className="text-sm font-semibold text-primary mt-0.5">{activeTeacher.user.full_name}</p>
              </div>
              <div>
                <QuietLabel>Email</QuietLabel>
                <p className="text-sm text-primary mt-0.5">{activeTeacher.user.email}</p>
              </div>
              <div>
                <QuietLabel>Phone</QuietLabel>
                <p className="text-sm text-primary mt-0.5">{activeTeacher.user.phone ?? "Not provided"}</p>
              </div>
            </div>
            {activeTeacher.teacher.bio && (
              <div className="pt-2">
                <QuietLabel>Bio</QuietLabel>
                <p className="text-xs text-primary leading-relaxed mt-1">{activeTeacher.teacher.bio}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted">No active teacher profile loaded.</p>
        )}
      </div>

      {/* Appearance card */}
      <div className="rounded-md border border-border bg-surface p-5 space-y-4">
        <h2 className="text-base font-semibold text-primary border-b border-border pb-3">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Theme Mode</p>
            <p className="text-xs text-muted">Switch between light and dark visual themes across the application.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium transition",
                theme === "light"
                  ? "border-brand bg-brand/5 text-brand ring-1 ring-brand/20 font-semibold"
                  : "border-border bg-background text-primary hover:bg-surface-subtle"
              )}
            >
              <Sun className="h-3.5 w-3.5" /> Light
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium transition",
                theme === "dark"
                  ? "border-brand bg-brand/5 text-brand ring-1 ring-brand/20 font-semibold"
                  : "border-border bg-background text-primary hover:bg-surface-subtle"
              )}
            >
              <Moon className="h-3.5 w-3.5" /> Dark
            </button>
          </div>
        </div>
      </div>

      {/* Pre-auth Developer Context card */}
      <div className="rounded-md border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <ShieldAlert className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold text-primary">Development Teacher Context (Pre-Auth Mode)</h2>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Select which teacher profile to operate as during pre-auth development. All `/teacher/*` pages will fetch schedules, availability, and student assignments for the chosen teacher.
        </p>

        <div className="space-y-2 pt-2">
          <label className="text-xs font-medium text-primary flex items-center gap-1.5 mb-1.5">
            <UserCheck className="h-3.5 w-3.5 text-brand" /> Active Teacher Context
          </label>
          <FilterSelect
            value={activeTeacherId ?? ""}
            onChange={(val) => setSelectedTeacherId(val || null)}
            options={teachers.map(t => ({
              value: t.teacher.id,
              label: `${t.teacher.display_name} (${t.user.full_name} - ${t.user.email})`
            }))}
            includeAll={false}
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
