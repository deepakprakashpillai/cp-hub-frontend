import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { format, parseISO, isAfter, differenceInHours, differenceInMinutes } from "date-fns";
import { ExternalLink, Loader2, Ban, RefreshCw, Sparkles, Clock, Video } from "lucide-react";

import { useActiveStudent } from "@/features/student/student-store";
import { cancelStudentBooking, listStudentBookings } from "@/features/student/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { Callout } from "@/components/ui/Callout";
import { cn } from "@/lib/utils";

const CANCELLATION_REASONS = [
  "Schedule conflict",
  "Feeling unwell / Sick",
  "Technical issues",
  "Personal emergency",
  "Other",
];

export function StudentClassesPage() {
  const queryClient = useQueryClient();
  const { activeStudent, isLoading: isStudentLoading } = useActiveStudent();
  const [tabFilter, setTabFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const studentId = activeStudent?.student.id;

  const bookingsQuery = useQuery({
    queryKey: ["student-bookings", "classes-page", studentId, statusFilter],
    queryFn: () =>
      listStudentBookings({
        studentId: studentId!,
        status: statusFilter || undefined,
        pageSize: 100,
      }),
    enabled: Boolean(studentId),
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => cancelStudentBooking(bookingId, cancelReason || "Cancelled by student"),
    onSuccess: () => {
      setCancellingBookingId(null);
      setCancelReason("");
      setCancelError(null);
      void queryClient.invalidateQueries({ queryKey: ["student-bookings"] });
    },
    onError: (err: Error) => {
      let msg = err.message || "Unknown error";
      if (isAxiosError(err) && err.response?.data?.detail) {
        msg = typeof err.response.data.detail === "string" 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      }
      setCancelError(`Cancellation failed: ${msg}`);
    },
  });

  if (isStudentLoading) {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow="Student" title="My Classes" />
        <div className="h-48 animate-pulse rounded-md border border-border bg-surface" />
      </section>
    );
  }

  if (!activeStudent) {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow="Student" title="My Classes" />
        <Callout title="No active student context" tone="info">
          Please select an active student in Settings.
        </Callout>
      </section>
    );
  }

  const now = new Date();
  const allBookings = (bookingsQuery.data?.items ?? []).filter((b) => b.class_session);

  // Filter bookings for upcoming & past logic
  const filteredBookings = allBookings.filter((booking) => {
    const startsAt = parseISO(booking.class_session.starts_at);
    if (tabFilter === "upcoming") {
      return isAfter(startsAt, now) && booking.status === "booked";
    }
    if (tabFilter === "past") {
      return !isAfter(startsAt, now) || booking.status !== "booked";
    }
    return true;
  });

  // Calculate counts for UX item 22
  const upcomingCount = allBookings.filter(
    (b) => isAfter(parseISO(b.class_session.starts_at), now) && b.status === "booked",
  ).length;

  const pastCount = allBookings.filter(
    (b) => !isAfter(parseISO(b.class_session.starts_at), now) || b.status !== "booked",
  ).length;

  const allCount = allBookings.length;

  const statusCounts = {
    booked: allBookings.filter((b) => b.status === "booked").length,
    attended: allBookings.filter((b) => b.status === "attended").length,
    missed: allBookings.filter((b) => b.status === "missed").length,
    cancelled: allBookings.filter((b) => b.status === "cancelled").length,
  };

  // Next Upcoming Class Widget (UX item 30)
  const upcomingBookingsSorted = allBookings
    .filter((b) => isAfter(parseISO(b.class_session.starts_at), now) && b.status === "booked")
    .sort((a, b) => parseISO(a.class_session.starts_at).getTime() - parseISO(b.class_session.starts_at).getTime());

  const nextUpcomingClass = upcomingBookingsSorted[0] ?? null;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Student"
        title="My Classes & History"
        actions={
          <button
            type="button"
            onClick={() => void bookingsQuery.refetch()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:bg-surface-subtle hover:text-primary hover:border-brand/40 shadow-2xs"
            title="Refresh bookings"
          >
            <RefreshCw className={cn("h-4 w-4", bookingsQuery.isFetching && "animate-spin")} />
          </button>
        }
      />

      {/* Item 30: Next Class Widget */}
      {nextUpcomingClass ? (
        <div className="relative overflow-hidden rounded-xl border border-brand/30 bg-gradient-to-r from-brand/10 via-brand/5 to-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-brand">
                  <Sparkles className="h-3.5 w-3.5" /> Next Upcoming Class
                </span>
                <StatusBadge tone="indigo">
                  {nextUpcomingClass.class_session.program_type === "one_on_one" ? "1-on-1" : "Batch"}
                </StatusBadge>
              </div>
              <h3 className="text-base font-bold text-primary">
                {format(parseISO(nextUpcomingClass.class_session.starts_at), "EEEE, MMMM d, yyyy")}
              </h3>
              <p className="text-xs text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1 font-medium text-primary">
                  <Clock className="h-3.5 w-3.5 text-brand" />
                  {format(parseISO(nextUpcomingClass.class_session.starts_at), "HH:mm")} -{" "}
                  {format(parseISO(nextUpcomingClass.class_session.ends_at), "HH:mm")} UTC
                </span>
                <span>•</span>
                <span>
                  Teacher:{" "}
                  <strong className="text-primary">
                    {nextUpcomingClass.class_session.teacher?.display_name ?? "Assigned Teacher"}
                  </strong>
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(true)}
                disabled={differenceInMinutes(now, parseISO(nextUpcomingClass.class_session.ends_at)) > 30}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Video className="h-4 w-4" /> Join Classroom
              </button>
              {differenceInHours(parseISO(nextUpcomingClass.class_session.starts_at), now) >= 24 && (
                <button
                  type="button"
                  onClick={() => {
                    setCancellingBookingId(nextUpcomingClass.id);
                    setCancelError(null);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-danger/30 bg-surface px-3 text-xs font-medium text-danger transition hover:bg-danger/10 hover:border-danger/50"
                >
                  <Ban className="h-3.5 w-3.5" /> Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Item 21: Standardized Tabs & Item 22: Status Filter Counts */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border">
        <nav className="flex flex-wrap gap-1 border-b border-border sm:border-b-0" aria-label="Class filters">
          {[
            { key: "upcoming", label: "Upcoming", count: upcomingCount },
            { key: "past", label: "Past & History", count: pastCount },
            { key: "all", label: "All Classes", count: allCount },
          ].map((tab) => {
            const isActive = tabFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTabFilter(tab.key as any)}
                className={cn(
                  "relative inline-flex items-center gap-2 h-9 px-2 text-xs font-medium transition whitespace-nowrap",
                  isActive
                    ? "text-primary"
                    : "text-muted hover:text-primary",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none",
                    isActive ? "bg-brand text-white" : "bg-surface-subtle border border-border text-muted",
                  )}
                >
                  {tab.count}
                </span>
                {isActive ? <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 self-end sm:self-center pb-1">
          <FilterSelect
            label="Status:"
            value={statusFilter}
            options={[
              { value: "", label: `All Statuses (${allCount})` },
              { value: "booked", label: `Booked (${statusCounts.booked})` },
              { value: "attended", label: `Attended (${statusCounts.attended})` },
              { value: "missed", label: `Missed (${statusCounts.missed})` },
              { value: "cancelled", label: `Cancelled (${statusCounts.cancelled})` },
            ]}
            onChange={(val) => setStatusFilter(val)}
          />
        </div>
      </div>

      {/* Item 23: Mobile Stacked Card View vs Desktop Table View */}

      {/* Desktop Table View (hidden on mobile, visible on md+) */}
      <div className="hidden md:block overflow-hidden rounded-md border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth: 700 }}>
            <thead>
              <tr className="border-b border-border bg-surface-subtle">
                <th className="px-3 py-2 text-xs font-medium text-muted">Program</th>
                <th className="px-3 py-2 text-xs font-medium text-muted">Date & Time (UTC)</th>
                <th className="px-3 py-2 text-xs font-medium text-muted">Teacher</th>
                <th className="px-3 py-2 text-xs font-medium text-muted">Status</th>
                <th className="px-3 py-2 text-xs font-medium text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookingsQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted">
                    Loading sessions...
                  </td>
                </tr>
              ) : filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => {
                  const startsAt = parseISO(booking.class_session.starts_at);
                  const endsAt = parseISO(booking.class_session.ends_at);
                  const hoursUntilClass = differenceInHours(startsAt, now);
                  const canStudentModify = booking.status === "booked" && hoursUntilClass >= 24;

                  return (
                    <tr key={booking.id} className="border-b border-border transition last:border-b-0 hover:bg-surface-subtle/55">
                      <td className="px-3 py-3 align-middle">
                        <StatusBadge tone="indigo">
                          {booking.class_session.program_type === "one_on_one" ? "1-on-1" : "Batch"}
                        </StatusBadge>
                      </td>

                      <td className="px-3 py-3 align-middle">
                        <p className="text-xs font-semibold text-primary">{format(startsAt, "EEE, MMM d, yyyy")}</p>
                        <p className="text-[11px] text-muted">
                          {format(startsAt, "HH:mm")} - {format(endsAt, "HH:mm")}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-middle">
                        <p className="text-xs text-primary">
                          {booking.class_session.teacher?.display_name ?? "—"}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-middle">
                        <BookingStatusBadge status={booking.status} />
                      </td>

                      {/* Item 24: Action Button Clarity */}
                      <td className="px-3 py-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          {booking.status === "booked" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setIsJoinModalOpen(true);
                              }}
                              disabled={differenceInMinutes(now, endsAt) > 30}
                              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-white shadow-2xs transition hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Join
                            </button>
                          ) : null}

                          {booking.status === "booked" ? (
                            canStudentModify ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancellingBookingId(booking.id);
                                  setCancelError(null);
                                }}
                                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-danger/30 bg-danger/5 px-3 text-xs font-medium text-danger transition hover:bg-danger/10 hover:border-danger/50"
                              >
                                <Ban className="h-3.5 w-3.5" /> Cancel
                              </button>
                            ) : (
                              <span
                                title="Cancellations lock 24 hours before session start."
                                className="text-[11px] text-muted cursor-help"
                              >
                                Locked (&lt;24h)
                              </span>
                            )
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted">
                    No sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Card View (visible on mobile, hidden on md+) */}
      <div className="block md:hidden space-y-3">
        {bookingsQuery.isLoading ? (
          <div className="rounded-md border border-border bg-surface p-8 text-center text-xs text-muted">
            Loading sessions...
          </div>
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => {
            const startsAt = parseISO(booking.class_session.starts_at);
            const endsAt = parseISO(booking.class_session.ends_at);
            const hoursUntilClass = differenceInHours(startsAt, now);
            const canStudentModify = booking.status === "booked" && hoursUntilClass >= 24;

            return (
              <div
                key={booking.id}
                className="rounded-lg border border-border bg-surface p-4 space-y-3 shadow-2xs transition hover:border-border-strong"
              >
                <div className="flex items-center justify-between">
                  <StatusBadge tone="indigo">
                    {booking.class_session.program_type === "one_on_one" ? "1-on-1" : "Batch"}
                  </StatusBadge>
                  <BookingStatusBadge status={booking.status} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-primary">{format(startsAt, "EEE, MMM d, yyyy")}</p>
                  <p className="text-xs text-muted font-medium">
                    {format(startsAt, "HH:mm")} - {format(endsAt, "HH:mm")} UTC
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted border-t border-border/50 pt-2">
                  <span>Teacher:</span>
                  <span className="font-semibold text-primary">
                    {booking.class_session.teacher?.display_name ?? "—"}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  {booking.status === "booked" && (
                    <button
                      type="button"
                      onClick={() => setIsJoinModalOpen(true)}
                      disabled={differenceInMinutes(now, endsAt) > 30}
                      className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-brand text-xs font-semibold text-white shadow-2xs transition hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Video className="h-3.5 w-3.5" /> Join Class
                    </button>
                  )}

                  {booking.status === "booked" && (
                    canStudentModify ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingBookingId(booking.id);
                          setCancelError(null);
                        }}
                        className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-danger/30 bg-danger/5 text-xs font-medium text-danger transition hover:bg-danger/10"
                      >
                        <Ban className="h-3.5 w-3.5" /> Cancel
                      </button>
                    ) : (
                      <div
                        className="flex-1 text-center text-[11px] text-muted py-1 cursor-help"
                        title="Cancellations lock 24 hours before session start."
                      >
                        Locked (&lt;24h)
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-md border border-border bg-surface p-8 text-center text-xs text-muted">
            No sessions found.
          </div>
        )}
      </div>

      {/* Item 25: Enhanced Cancellation Modal with Quick-Select Chips */}
      {cancellingBookingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-primary">Confirm Cancellation</h3>
            <p className="text-xs text-muted">
              Are you sure you want to cancel this booked class session?
            </p>

            {cancelError ? (
              <Callout tone="danger" title="Error">
                {cancelError}
              </Callout>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">Reason for cancellation</label>
              <div className="flex flex-wrap gap-1.5">
                {CANCELLATION_REASONS.map((reason) => {
                  const isSelected = cancelReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setCancelReason(reason)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium transition border",
                        isSelected
                          ? "bg-brand text-white border-brand shadow-2xs"
                          : "bg-surface border-border text-muted hover:text-primary hover:bg-surface-subtle",
                      )}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Or type custom reason..."
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setCancellingBookingId(null)}
                className="h-8 rounded-md border border-border bg-surface px-3 text-xs font-medium text-primary hover:bg-surface-subtle"
              >
                Keep Class
              </button>
              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(cancellingBookingId)}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-danger px-3 text-xs font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
              >
                {cancelMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Join Class Modal */}
      <Modal
        title="Joining Video Classroom"
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        footer={
          <button
            type="button"
            onClick={() => setIsJoinModalOpen(false)}
            className="h-8 rounded-md bg-brand px-4 text-xs font-medium text-white hover:opacity-90"
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

function BookingStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "booked":
      return <StatusBadge tone="green">Booked</StatusBadge>;
    case "attended":
      return <StatusBadge tone="blue">Attended</StatusBadge>;
    case "missed":
      return <StatusBadge tone="amber">Missed</StatusBadge>;
    case "cancelled":
      return <StatusBadge tone="rose">Cancelled</StatusBadge>;
    default:
      return <StatusBadge tone="neutral">{status}</StatusBadge>;
  }
}

