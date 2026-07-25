import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, GraduationCap, UsersRound, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { Link } from "react-router";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import { listTeacherClasses, listTeacherRules } from "@/features/teacher/api";
import { formatTime } from "@/features/admin/teachers/teacher-utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";

export function TeacherDashboard() {
  const { activeTeacher, activeTeacherId, isLoading: isTeacherLoading } = useActiveTeacher();

  // Get today start and end in UTC ISO format
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  // Query today's classes
  const { data: todayClassesData, isLoading: isTodayClassesLoading, refetch: refetchToday } = useQuery({
    queryKey: ["teacher", activeTeacherId, "classes", "today", startOfDay, endOfDay],
    queryFn: () =>
      listTeacherClasses({
        teacherId: activeTeacherId!,
        startsFrom: startOfDay,
        startsTo: endOfDay,
      }),
    enabled: Boolean(activeTeacherId),
  });

  // Query overall upcoming classes
  const { data: upcomingClassesData } = useQuery({
    queryKey: ["teacher", activeTeacherId, "classes", "upcoming"],
    queryFn: () =>
      listTeacherClasses({
        teacherId: activeTeacherId!,
        startsFrom: new Date().toISOString(),
        pageSize: 5,
      }),
    enabled: Boolean(activeTeacherId),
  });

  // Query rules for total weekly availability count
  const { data: rulesData } = useQuery({
    queryKey: ["teacher", activeTeacherId, "rules"],
    queryFn: () => listTeacherRules(activeTeacherId!),
    enabled: Boolean(activeTeacherId),
  });

  const todayClasses = todayClassesData?.items ?? [];
  const rules = rulesData?.items ?? [];

  const weeklyHours = rules.reduce((acc, rule) => {
    const startHour = Number(rule.start_time_utc.split(":")[0]);
    const endHour = Number(rule.end_time_utc.split(":")[0]);
    return acc + Math.max(0, endHour - startHour);
  }, 0);

  return (
    <section className="space-y-5">
      {/* Header section */}
      <PageHeader
        title="Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetchToday()}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary transition hover:bg-surface-subtle"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <Link
              to="/teacher/classes"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-xs font-medium text-white transition hover:opacity-90"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              View Schedule
            </Link>
          </div>
        }
      />

      {/* Quick metrics grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-md border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted">Today's Classes</p>
              <p className="mt-3 text-3xl font-semibold text-primary">{todayClasses.length}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-surface-subtle text-brand">
              <CalendarDays className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs text-muted">Scheduled for today</p>
        </article>

        <article className="rounded-md border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted">Upcoming Sessions</p>
              <p className="mt-3 text-3xl font-semibold text-primary">{upcomingClassesData?.total ?? 0}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-surface-subtle text-brand">
              <GraduationCap className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs text-muted">Upcoming in queue</p>
        </article>

        <article className="rounded-md border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted">Weekly Availability</p>
              <p className="mt-3 text-3xl font-semibold text-primary">{weeklyHours} hrs</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-surface-subtle text-brand">
              <Clock className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs text-muted">{rules.length} active recurring rules</p>
        </article>

        <article className="rounded-md border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted">1-on-1 Assignments</p>
              <p className="mt-3 text-3xl font-semibold text-primary">{activeTeacher?.permanent_one_on_one_students?.length ?? 0}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-surface-subtle text-brand">
              <UsersRound className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs text-muted">Direct assigned students</p>
        </article>
      </div>

      {/* Main Content Sections */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Today's Schedule Card */}
        <section className="rounded-md border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-semibold text-primary">Today's Schedule</h2>
            <Link to="/teacher/classes" className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isTodayClassesLoading || isTeacherLoading ? (
            <div className="py-8 text-center text-xs text-muted">Loading today's schedule...</div>
          ) : todayClasses.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-muted/50" />
              <p className="mt-2 text-sm font-medium text-primary">No classes scheduled for today</p>
              <p className="mt-1 text-xs text-muted">Check your upcoming schedule or configure availability rules.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todayClasses.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-primary">
                        {item.display_label ?? item.batch_group?.name ?? (item.program_type === "one_on_one" ? "1-on-1 Session" : "Batch Session")}
                      </p>
                      <StatusBadge tone={item.status === "scheduled" ? "indigo" : item.status === "completed" ? "green" : "rose"}>
                        {item.status}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-muted">
                      {formatTime(item.starts_at)} - {formatTime(item.ends_at)} • {item.program_type === "one_on_one" ? "1-on-1 Student" : `${item.booking_status_counts?.booked ?? 0} Students`}
                    </p>
                  </div>
                  <Link
                    to={`/teacher/classes?session=${item.id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-primary transition hover:bg-surface-subtle"
                  >
                    Manage Roster
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Links / Navigation Panel */}
        <section className="rounded-md border border-border bg-surface p-5 space-y-4">
          <h2 className="text-base font-semibold text-primary border-b border-border pb-3">Quick Navigation</h2>
          
          <div className="space-y-2">
            <Link
              to="/teacher/classes"
              className="flex items-center justify-between rounded-md border border-border p-3 transition hover:bg-surface-subtle"
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-brand" />
                <div>
                  <p className="text-xs font-medium text-primary">Classes & Roster</p>
                  <p className="text-[11px] text-muted">View upcoming sessions & attendance</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>

            <Link
              to="/teacher/availability"
              className="flex items-center justify-between rounded-md border border-border p-3 transition hover:bg-surface-subtle"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-brand" />
                <div>
                  <p className="text-xs font-medium text-primary">Manage Availability</p>
                  <p className="text-[11px] text-muted">Weekly rules & slot generation</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>

            <Link
              to="/teacher/students"
              className="flex items-center justify-between rounded-md border border-border p-3 transition hover:bg-surface-subtle"
            >
              <div className="flex items-center gap-3">
                <UsersRound className="h-4 w-4 text-brand" />
                <div>
                  <p className="text-xs font-medium text-primary">My Students</p>
                  <p className="text-[11px] text-muted">1-on-1 & batch student lists</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
