import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, isAfter, isBefore, parseISO, differenceInMinutes } from "date-fns";
import {
  CalendarDays,
  Clock,
  GraduationCap,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  UserCheck,
  CalendarCheck,
} from "lucide-react";
import { Link } from "react-router";

import { useActiveStudent } from "@/features/student/student-store";
import { listStudentBookings } from "@/features/student/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

export function StudentDashboard() {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const { activeStudent, isLoading, error } = useActiveStudent();
  const studentId = activeStudent?.student.id;

  const bookingsQuery = useQuery({
    queryKey: ["student-bookings", "dashboard", studentId],
    queryFn: () => listStudentBookings({ status: "booked", pageSize: 5 }),
    enabled: Boolean(studentId),
  });

  if (isLoading) {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow="Student" title="Dashboard" />

        {/* Metric Cards Skeleton Grid (Item 43 & 46) */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-[128px] flex-col justify-between rounded-md border border-border bg-surface p-5 animate-pulse"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-surface-subtle" />
                  <div className="h-8 w-16 rounded bg-surface-subtle" />
                </div>
                <div className="h-10 w-10 rounded-md bg-surface-subtle" />
              </div>
              <div className="h-3 w-28 rounded bg-surface-subtle mt-4" />
            </div>
          ))}
        </div>

        {/* Content Section Skeleton */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="h-64 rounded-md border border-border bg-surface p-5 animate-pulse" />
          <div className="h-64 rounded-md border border-border bg-surface p-5 animate-pulse" />
        </div>
      </section>
    );
  }

  if (!activeStudent || error) {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow="Student" title="Dashboard" />
        <div className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-primary">No active student context</h2>
          <p className="mt-1 text-sm text-muted">
            Your signed-in account is not linked to an active student profile.
          </p>
        </div>
      </section>
    );
  }

  const now = new Date();
  const accessStarts = activeStudent.student.access_starts_at ? parseISO(activeStudent.student.access_starts_at) : null;
  const accessEnds = activeStudent.student.access_ends_at ? parseISO(activeStudent.student.access_ends_at) : null;

  const isValidAccess =
    activeStudent.student.status === "active" &&
    accessStarts &&
    accessEnds &&
    isAfter(now, accessStarts) &&
    isBefore(now, accessEnds);

  const daysRemaining = accessEnds ? Math.max(0, differenceInDays(accessEnds, now)) : 0;
  const totalDays = accessStarts && accessEnds ? Math.max(1, differenceInDays(accessEnds, accessStarts)) : 1;
  const daysPassed = accessStarts ? Math.max(0, differenceInDays(now, accessStarts)) : 0;
  const validityPercent = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));

  const upcomingBookings = (bookingsQuery.data?.items ?? []).filter(b => b.class_session);
  const nextBooking = upcomingBookings[0];

  const programLabel =
    activeStudent.student.program_type === "one_on_one"
      ? "1-on-1 Program"
      : "Batch Program";

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Student"
        title={`Welcome, ${activeStudent.user.full_name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void bookingsQuery.refetch()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", bookingsQuery.isFetching && "animate-spin")} />
            </button>
            <Link
              to="/student/schedule"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-xs font-medium text-white transition hover:opacity-90 cursor-pointer"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Schedule Class
            </Link>
          </div>
        }
      />

      {/* Overview Cards Grid - Matching Teacher Dashboard visual weight & iconography (Item 46 & Item 43) */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Metric Card 1: Access Validity */}
        <article className="flex min-h-[128px] flex-col justify-between rounded-md border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted">Access Validity</p>
              <p className="mt-3 text-3xl font-semibold text-primary">{daysRemaining} days</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-surface-subtle text-brand">
              <Sparkles className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted">Status:</span>
            <StatusBadge tone={isValidAccess ? "green" : "amber"}>
              {isValidAccess ? "Active Access" : activeStudent.student.status}
            </StatusBadge>
          </div>
        </article>

        {/* Metric Card 2: Enrolled Program */}
        <article className="flex min-h-[128px] flex-col justify-between rounded-md border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted">Enrolled Program</p>
              <p className="mt-3 text-3xl font-semibold text-primary">{programLabel}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-surface-subtle text-brand">
              <GraduationCap className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs text-muted truncate">
            {activeStudent.assigned_teacher
              ? `Teacher: ${activeStudent.assigned_teacher.user.full_name}`
              : "No assigned teacher"}
          </p>
        </article>

        {/* Metric Card 3: Upcoming Sessions */}
        <article className="flex min-h-[128px] flex-col justify-between rounded-md border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted">Upcoming Sessions</p>
              <p className="mt-3 text-3xl font-semibold text-primary">{upcomingBookings.length}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-surface-subtle text-brand">
              <CalendarCheck className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs text-muted truncate">
            {nextBooking?.class_session?.starts_at
              ? `Next: ${format(parseISO(nextBooking.class_session.starts_at), "MMM d, HH:mm")}`
              : "No sessions booked"}
          </p>
        </article>
      </div>

      {/* Main Section: Next Session & Program Details */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-md border border-border bg-surface p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-2">
            <h2 className="text-base font-semibold text-primary flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand" /> Next Upcoming Session
            </h2>
            <Link to="/student/classes" className="text-xs font-medium text-brand hover:underline cursor-pointer">
              View all sessions
            </Link>
          </div>

          {bookingsQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded-md border border-border bg-surface-subtle" />
          ) : nextBooking?.class_session ? (
            <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="indigo">
                    {nextBooking.class_session.program_type === "one_on_one" ? "1-on-1" : "Batch"}
                  </StatusBadge>
                  <StatusBadge tone="green">Booked</StatusBadge>
                </div>
                <p className="text-sm font-semibold text-primary">
                  {format(parseISO(nextBooking.class_session.starts_at), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-xs text-muted">
                  {format(parseISO(nextBooking.class_session.starts_at), "HH:mm")} -{" "}
                  {format(parseISO(nextBooking.class_session.ends_at), "HH:mm")} UTC
                  {nextBooking.class_session.teacher ? ` • ${nextBooking.class_session.teacher.display_name}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsJoinModalOpen(true);
                }}
                disabled={differenceInMinutes(now, parseISO(nextBooking.class_session.ends_at)) > 30}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-xs font-medium text-white transition hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Join Session
              </button>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted">
              No upcoming booked sessions scheduled.
            </div>
          )}

          {/* Access Progress Indicator */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex justify-between text-xs text-muted">
              <span>Access Validity Progress</span>
              <span>{validityPercent}% elapsed</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle border border-border/40">
              <div className="h-full bg-brand transition-all duration-500" style={{ width: `${validityPercent}%` }} />
            </div>
          </div>
        </section>

        {/* Operational Side Card */}
        <section className="rounded-md border border-border bg-surface p-5 space-y-4">
          <h2 className="text-base font-semibold text-primary border-b border-border pb-3">Quick Navigation</h2>
          <div className="space-y-2">
            <Link
              to="/student/schedule"
              className="flex items-center justify-between rounded-md border border-border bg-background p-3 transition hover:bg-surface-subtle hover:border-border-strong cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand" />
                <span className="text-xs font-medium text-primary">Schedule Class</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>

            <Link
              to="/student/classes"
              className="flex items-center justify-between rounded-md border border-border bg-background p-3 transition hover:bg-surface-subtle hover:border-border-strong cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand" />
                <span className="text-xs font-medium text-primary">My Classes</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>

            <Link
              to="/student/feedbacks"
              className="flex items-center justify-between rounded-md border border-border bg-background p-3 transition hover:bg-surface-subtle hover:border-border-strong cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-brand" />
                <span className="text-xs font-medium text-primary">Teacher Feedbacks</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>

            <Link
              to="/student/settings"
              className="flex items-center justify-between rounded-md border border-border bg-background p-3 transition hover:bg-surface-subtle hover:border-border-strong cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-brand" />
                <span className="text-xs font-medium text-primary">Settings & Profile</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>
          </div>
        </section>
      </div>

      {/* Join Class Modal */}
      <Modal
        title="Joining Video Classroom"
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        footer={
          <button
            type="button"
            onClick={() => setIsJoinModalOpen(false)}
            className="h-9 rounded-md bg-brand px-4 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
          >
            Close
          </button>
        }
      >
        <p className="text-xs text-muted">
          The video classroom integration is not yet connected. Please check back later.
        </p>
      </Modal>
    </section>
  );
}
