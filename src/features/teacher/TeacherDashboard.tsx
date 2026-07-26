import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  GraduationCap,
  UsersRound,
  ArrowRight,
  Coffee,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import { listTeacherClasses, listTeacherRules, listTeacherSlots } from "@/features/teacher/api";
import { formatTime } from "@/features/admin/teachers/teacher-utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { TeacherClassDetailDrawer } from "@/features/teacher/TeacherClassDetailDrawer";

export function TeacherDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeDrawerSessionId = searchParams.get("session");

  const { activeTeacher, activeTeacherId, isLoading: isTeacherLoading } = useActiveTeacher();

  const availabilityWindow = useMemo(() => {
    const startsFrom = new Date();
    const endsAt = new Date(startsFrom);
    endsAt.setDate(endsAt.getDate() + 14);
    return { startsFrom: startsFrom.toISOString(), endsAt: endsAt.toISOString() };
  }, []);

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
  const { data: upcomingClassesData, isLoading: isUpcomingLoading } = useQuery({
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
  const { data: rulesData, isLoading: isRulesLoading } = useQuery({
    queryKey: ["teacher", activeTeacherId, "rules"],
    queryFn: () => listTeacherRules(activeTeacherId!),
    enabled: Boolean(activeTeacherId),
  });

  // A rule alone does not make the teacher bookable; surface whether it has
  // produced an open slot in the next two weeks.
  const { data: availabilitySlotsData, isLoading: isAvailabilitySlotsLoading } = useQuery({
    queryKey: ["teacher", activeTeacherId, "availability-slots", availabilityWindow],
    queryFn: () =>
      listTeacherSlots({
        teacherId: activeTeacherId!,
        startsFrom: availabilityWindow.startsFrom,
        startsTo: availabilityWindow.endsAt,
      }),
    enabled: Boolean(activeTeacherId),
  });

  const todayClasses = todayClassesData?.items ?? [];
  const rules = rulesData?.items ?? [];
  const activeRules = rules.filter((rule) => rule.is_active);
  const upcomingClasses = upcomingClassesData?.items ?? [];

  const weeklyHours = activeRules.reduce((acc, rule) => {
    const startHour = Number(rule.start_time_utc.split(":")[0]);
    const endHour = Number(rule.end_time_utc.split(":")[0]);
    return acc + Math.max(0, endHour - startHour);
  }, 0);
  const upcomingOpenSlots = (availabilitySlotsData?.items ?? []).filter((slot) => slot.status === "available");
  const hasAvailabilityRules = activeRules.length > 0;
  const hasUpcomingOpenSlots = upcomingOpenSlots.length > 0;

  // Find next class for metric context (Item 41)
  const now = new Date();
  const upcomingTodayClasses = todayClasses.filter((c) => new Date(c.starts_at) > now);
  const nextClassToday = upcomingTodayClasses[0] ?? todayClasses[0];
  const nextClass = nextClassToday ?? upcomingClasses[0];

  const nextClassSubtitle = nextClass
    ? `Next: ${formatTime(nextClass.starts_at)}`
    : "No upcoming classes";

  function openSessionDrawer(sessionId: string) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("session", sessionId);
    setSearchParams(nextParams);
  }

  function closeSessionDrawer() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("session");
    setSearchParams(nextParams);
  }

  const isMetricsLoading =
    isTeacherLoading ||
    isTodayClassesLoading ||
    isUpcomingLoading ||
    isRulesLoading ||
    isAvailabilitySlotsLoading;

  return (
    <section className="space-y-6">
      {/* Header section */}
      <PageHeader
        title="Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refetchToday()}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary transition hover:bg-surface-subtle cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <Link
              to="/teacher/classes"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-xs font-medium text-white transition hover:opacity-90 cursor-pointer"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              View Schedule
            </Link>
          </div>
        }
      />

      {!isTeacherLoading && !isRulesLoading && !isAvailabilitySlotsLoading && (!hasAvailabilityRules || !hasUpcomingOpenSlots) && (
        <section className="flex flex-col gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-primary">
                {!hasAvailabilityRules ? "Set your weekly availability" : "No open slots in the next 14 days"}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {!hasAvailabilityRules
                  ? "Add the hours you can teach so new sessions can be planned."
                  : "Generate slots or adjust your weekly hours so students can book upcoming time."}
              </p>
            </div>
          </div>
          <Link
            to="/teacher/availability"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-xs font-medium text-white transition hover:opacity-90 cursor-pointer"
          >
            <Clock className="h-3.5 w-3.5" />
            {!hasAvailabilityRules ? "Add weekly hours" : "Generate slots"}
          </Link>
        </section>
      )}

      {/* Quick metrics grid with fixed min-height for layout shift prevention (Item 43) */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isMetricsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-[128px] flex-col justify-between rounded-md border border-border bg-surface p-5 animate-pulse"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-surface-subtle" />
                  <div className="h-8 w-12 rounded bg-surface-subtle" />
                </div>
                <div className="h-9 w-9 rounded-md bg-surface-subtle" />
              </div>
              <div className="h-3 w-28 rounded bg-surface-subtle mt-4" />
            </div>
          ))
        ) : (
          <>
            {/* Metric 1: Today's Classes (Item 41) */}
            <article className="flex min-h-[128px] flex-col justify-between rounded-md border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">Today's Classes</p>
                  <p className="mt-3 text-3xl font-semibold text-primary">{todayClasses.length}</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-subtle text-brand">
                  <CalendarDays className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 text-xs text-muted truncate">{nextClassSubtitle}</p>
            </article>

            {/* Metric 2: Upcoming Sessions */}
            <article className="flex min-h-[128px] flex-col justify-between rounded-md border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">Upcoming Sessions</p>
                  <p className="mt-3 text-3xl font-semibold text-primary">{upcomingClassesData?.total ?? 0}</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-subtle text-brand">
                  <GraduationCap className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 text-xs text-muted">Upcoming in queue</p>
            </article>

            {/* Metric 3: Weekly Availability */}
            <article className="flex min-h-[128px] flex-col justify-between rounded-md border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">Weekly Availability</p>
                  <p className="mt-3 text-3xl font-semibold text-primary">{weeklyHours} hrs</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-subtle text-brand">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 text-xs text-muted">
                {activeRules.length} active rules · {upcomingOpenSlots.length} open slots ahead
              </p>
            </article>

            {/* Metric 4: 1-on-1 Assignments */}
            <article className="flex min-h-[128px] flex-col justify-between rounded-md border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">1-on-1 Assignments</p>
                  <p className="mt-3 text-3xl font-semibold text-primary">
                    {activeTeacher?.permanent_one_on_one_students?.length ?? 0}
                  </p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-subtle text-brand">
                  <UsersRound className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 text-xs text-muted">Direct assigned students</p>
            </article>
          </>
        )}
      </div>

      {/* Quick Navigation Cards Grid (Item 42) */}
      <section className="rounded-md border border-border bg-surface p-5 space-y-4">
        <h2 className="text-base font-semibold text-primary border-b border-border pb-3">
          Quick Navigation
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/teacher/classes"
            className="group flex flex-col justify-between rounded-md border border-border bg-surface p-4 transition hover:border-brand/50 hover:bg-surface-subtle cursor-pointer min-h-[96px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-subtle text-brand group-hover:bg-brand group-hover:text-white transition">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-primary group-hover:text-brand transition">
                    Classes & Roster
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted">View upcoming sessions & attendance</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
          </Link>

          <Link
            to="/teacher/availability"
            className="group flex flex-col justify-between rounded-md border border-border bg-surface p-4 transition hover:border-brand/50 hover:bg-surface-subtle cursor-pointer min-h-[96px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-subtle text-brand group-hover:bg-brand group-hover:text-white transition">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-primary group-hover:text-brand transition">
                    Manage Availability
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted">Weekly rules & slot generation</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
          </Link>

          <Link
            to="/teacher/students"
            className="group flex flex-col justify-between rounded-md border border-border bg-surface p-4 transition hover:border-brand/50 hover:bg-surface-subtle cursor-pointer min-h-[96px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-subtle text-brand group-hover:bg-brand group-hover:text-white transition">
                  <UsersRound className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-primary group-hover:text-brand transition">
                    My Students
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted">1-on-1 & batch student lists</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
          </Link>
        </div>
      </section>

      {/* Today's Schedule Card */}
      <section className="rounded-md border border-border bg-surface p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-2">
          <h2 className="text-base font-semibold text-primary">Today's Schedule</h2>
          <Link
            to="/teacher/classes"
            className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {isTodayClassesLoading || isTeacherLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="py-3 flex items-center justify-between animate-pulse">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-36 rounded bg-surface-subtle" />
                    <div className="h-5 w-16 rounded bg-surface-subtle" />
                  </div>
                  <div className="h-3 w-48 rounded bg-surface-subtle" />
                </div>
                <div className="h-8 w-28 rounded-md bg-surface-subtle" />
              </div>
            ))}
          </div>
        ) : todayClasses.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <Coffee className="mx-auto h-8 w-8 text-muted/50" />
            <div>
              <p className="text-sm font-medium text-primary">No classes scheduled for today</p>
              <p className="mt-1 text-xs text-muted">
                {activeRules.length === 0
                  ? "You haven't configured any recurring availability rules yet."
                  : "Check your upcoming schedule or adjust availability rules."}
              </p>
            </div>
            {/* Empty state CTA (Item 45) */}
            {activeRules.length === 0 && (
              <div>
                <Link
                  to="/teacher/availability"
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-xs font-medium text-white transition hover:opacity-90 cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Configure Availability
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {todayClasses.map((item) => (
              <div key={item.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-primary">
                      {item.display_label ??
                        item.batch_group?.name ??
                        (item.program_type === "one_on_one" ? "1-on-1 Session" : "Batch Session")}
                    </p>
                    <StatusBadge
                      tone={
                        item.status === "scheduled"
                          ? "indigo"
                          : item.status === "completed"
                          ? "green"
                          : "rose"
                      }
                    >
                      {item.status}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-muted">
                    {formatTime(item.starts_at)} - {formatTime(item.ends_at)} •{" "}
                    {item.program_type === "one_on_one"
                      ? "1-on-1 Student"
                      : `${item.booking_status_counts?.booked ?? 0} Students`}
                  </p>
                </div>
                {/* Quick Roster Access button opening drawer directly (Item 44) */}
                <button
                  type="button"
                  onClick={() => openSessionDrawer(item.id)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary transition hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-brand/40 cursor-pointer"
                >
                  Manage Roster
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Class Session Detail Drawer (Item 44) */}
      <TeacherClassDetailDrawer
        classSessionId={activeDrawerSessionId}
        isOpen={Boolean(activeDrawerSessionId)}
        onClose={closeSessionDrawer}
        onOpenWorkspace={(sessionId) => {
          closeSessionDrawer();
          navigate(`/teacher/classes/${sessionId}`);
        }}
      />
    </section>
  );
}
