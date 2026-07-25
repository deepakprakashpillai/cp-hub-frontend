import { useThemeStore } from "@/app/theme-store";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import { Moon, Sun, ShieldAlert, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export function TeacherSettingsPage() {
  const { theme, toggleTheme } = useThemeStore();
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
                <p className="font-medium text-muted">Display Name</p>
                <p className="text-sm font-semibold text-primary">{activeTeacher.teacher.display_name}</p>
              </div>
              <div>
                <p className="font-medium text-muted">Linked Account Name</p>
                <p className="text-sm font-semibold text-primary">{activeTeacher.user.full_name}</p>
              </div>
              <div>
                <p className="font-medium text-muted">Email</p>
                <p className="text-sm text-primary">{activeTeacher.user.email}</p>
              </div>
              <div>
                <p className="font-medium text-muted">Phone</p>
                <p className="text-sm text-primary">{activeTeacher.user.phone ?? "Not provided"}</p>
              </div>
            </div>
            {activeTeacher.teacher.bio && (
              <div className="pt-2">
                <p className="font-medium text-muted">Bio</p>
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
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface-subtle px-3 text-xs font-medium text-primary transition hover:bg-border"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" /> Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-slate-700" /> Dark Mode
              </>
            )}
          </button>
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
          <label className="text-xs font-medium text-primary flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-brand" /> Active Teacher Context
          </label>
          <select
            value={activeTeacherId ?? ""}
            onChange={(e) => setSelectedTeacherId(e.target.value || null)}
            className="w-full rounded-md border border-border bg-surface p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {teachers.map((t) => (
              <option key={t.teacher.id} value={t.teacher.id}>
                {t.teacher.display_name} ({t.user.full_name} - {t.user.email})
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
