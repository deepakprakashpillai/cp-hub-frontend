import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, FileText, UserPlus, CalendarClock, Ban } from "lucide-react";
import { Link, useParams } from "react-router";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import { CapacityProgressBar } from "@/features/teacher/TeacherClassesPage";
import {
  getTeacherClassSession,
  getClassRoster,
  markClassAttendance,
  cancelTeacherBatchClassSession,
  rescheduleTeacherBatchClassSession,
  type ClassRosterItem,
  type TeacherClassSession,
} from "@/features/teacher/api";
import { formatDateTime, formatTime, formatProgram, getErrorMessage, localDateTimeToIso, localInputValue } from "@/features/admin/teachers/teacher-utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { PageHeader } from "@/components/layout/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { SessionFeedbackThread } from "@/features/teacher/SessionFeedbackThread";
import { SessionFeedbackNoteModal } from "@/features/teacher/SessionFeedbackNoteModal";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type SessionDetailTab = "overview" | "roster" | "feedback";

export function TeacherClassDetailPage() {
  const { sessionId = "" } = useParams();
  const queryClient = useQueryClient();
  const { activeTeacherId } = useActiveTeacher();
  const [activeTab, setActiveTab] = useState<SessionDetailTab>("overview");
  const [selectedBookingForNote, setSelectedBookingForNote] = useState<{ bookingId: string; studentName: string } | null>(null);

  const {
    data: session,
    isLoading: isSessionLoading,
    isError: isSessionError,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ["teacher", activeTeacherId, "classes", sessionId],
    queryFn: () => getTeacherClassSession(sessionId),
    enabled: Boolean(sessionId),
  });

  const {
    data: rosterData,
    isLoading: isRosterLoading,
    refetch: refetchRoster,
  } = useQuery({
    queryKey: ["teacher", "class-roster", sessionId],
    queryFn: () => getClassRoster(sessionId),
    enabled: Boolean(sessionId),
  });

  const attendanceMutation = useMutation({
    mutationFn: (payload: { bookingId: string; status: "attended" | "missed" }) =>
      markClassAttendance(sessionId, [{ booking_id: payload.bookingId, status: payload.status }]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
      queryClient.invalidateQueries({ queryKey: ["teacher", "class-roster", sessionId] });
    },
  });

  const markAllPresentMutation = useMutation({
    mutationFn: () => {
      const roster = rosterData?.items ?? [];
      const attendances = roster.map((r) => ({ booking_id: r.id, status: "attended" as const }));
      return markClassAttendance(sessionId, attendances);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
      queryClient.invalidateQueries({ queryKey: ["teacher", "class-roster", sessionId] });
    },
  });

  const roster = rosterData?.items ?? [];
  const title =
    session?.display_label ??
    session?.batch_group?.name ??
    (session?.program_type === "one_on_one" ? "1-on-1 Session" : "Batch Class Session");

  if (isSessionLoading) {
    return (
      <section className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded-md bg-surface-subtle" />
        <div className="h-20 animate-pulse rounded-md bg-surface-subtle" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="h-64 animate-pulse rounded-md bg-surface-subtle" />
          <div className="h-52 animate-pulse rounded-md bg-surface-subtle" />
        </div>
      </section>
    );
  }

  if (isSessionError || !session) {
    return (
      <section className="space-y-4">
        <Link
          to="/teacher/classes"
          className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Classes
        </Link>
        <Callout tone="danger" title="Load Error">
          Class session details could not be loaded. Please check the session ID or try again.
        </Callout>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* Top back navigation breadcrumb */}
      <div>
        <Link
          to="/teacher/classes"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent bg-transparent px-2.5 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Classes
        </Link>
      </div>

      {/* Workspace Header */}
      <PageHeader
        title={title}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                refetchSession();
                refetchRoster();
              }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary transition hover:bg-surface-subtle"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>

            <TeacherBatchSessionActions session={session} />

            {roster.length > 0 && (
              <button
                type="button"
                disabled={markAllPresentMutation.isPending}
                onClick={() => markAllPresentMutation.mutate()}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-xs font-medium text-white shadow-2xs focus-visible:ring-2 focus-visible:ring-brand/30 transition hover:opacity-90 disabled:opacity-50"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {markAllPresentMutation.isPending ? "Updating..." : "Mark All Present"}
              </button>
            )}
          </div>
        }
      />

      {/* Main Workspace Layout */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main Column */}
        <main className="min-w-0 space-y-4">
          {/* Workspace Tabs */}
          <nav className="flex flex-wrap gap-1 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "relative inline-flex items-center gap-2 h-9 px-2 text-xs font-medium transition whitespace-nowrap",
                activeTab === "overview"
                  ? "text-primary"
                  : "text-muted hover:text-primary"
              )}
            >
              Overview
              {activeTab === "overview" && <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("roster")}
              className={cn(
                "relative inline-flex items-center gap-2 h-9 px-2 text-xs font-medium transition whitespace-nowrap",
                activeTab === "roster"
                  ? "text-primary"
                  : "text-muted hover:text-primary"
              )}
            >
              Class Roster ({roster.length})
              {activeTab === "roster" && <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("feedback")}
              className={cn(
                "relative inline-flex items-center gap-2 h-9 px-2 text-xs font-medium transition whitespace-nowrap",
                activeTab === "feedback"
                  ? "text-primary"
                  : "text-muted hover:text-primary"
              )}
            >
              Session Feedback Threads
              {activeTab === "feedback" && <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />}
            </button>
          </nav>

          {/* Overview Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-surface p-5 space-y-4">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wide border-b border-border pb-2">
                  Session Briefing & Timing
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <QuietLabel>Date & Time</QuietLabel>
                    <p className="mt-1 font-semibold text-primary">{formatDateTime(session.starts_at)}</p>
                  </div>
                  <div>
                    <QuietLabel>Time Window (UTC)</QuietLabel>
                    <p className="mt-1 font-semibold text-primary">
                      {formatTime(session.starts_at)} - {formatTime(session.ends_at)}
                    </p>
                  </div>
                  <div>
                    <QuietLabel>Program Type</QuietLabel>
                    <p className="mt-1 font-semibold text-primary capitalize">
                      {formatProgram(session.program_type)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-5 space-y-4">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wide border-b border-border pb-2">
                  Capacity & Attendance Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-md border border-border bg-surface p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {roster.filter((r) => r.status === "attended").length}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted">Present (Attended)</p>
                  </div>

                  <div className="rounded-md border border-border bg-surface p-3 text-center">
                    <p className="text-2xl font-bold text-rose-600">
                      {roster.filter((r) => r.status === "missed").length}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted">Absent (Missed)</p>
                  </div>

                  <div className="rounded-md border border-border bg-surface p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">
                      {roster.filter((r) => r.status === "booked").length}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted">Pending Attendance</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Roster Tab Content */}
          {activeTab === "roster" && (
            <div className="space-y-3">
              {isRosterLoading ? (
                <div className="py-12 text-center text-xs text-muted">Loading class roster...</div>
              ) : roster.length === 0 ? (
                <div className="rounded-md border border-border bg-surface p-8 text-center space-y-2">
                  <UserPlus className="mx-auto h-8 w-8 text-muted/50" />
                  <p className="text-sm font-semibold text-primary">No students booked yet</p>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Students assigned to this batch or 1-on-1 slot will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border rounded-md border border-border bg-surface">
                  {roster.map((item: ClassRosterItem) => (
                    <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-primary">{item.student?.full_name ?? "Student"}</p>
                        <p className="text-xs text-muted">{item.student?.email ?? ""}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge
                          tone={
                            item.status === "attended"
                              ? "green"
                              : item.status === "missed"
                              ? "rose"
                              : "indigo"
                          }
                        >
                          {item.status}
                        </StatusBadge>

                        <button
                          type="button"
                          disabled={attendanceMutation.isPending}
                          onClick={() => attendanceMutation.mutate({ bookingId: item.id, status: "attended" })}
                          className="inline-flex h-8 items-center gap-1 px-2.5 rounded-md border border-border bg-surface text-emerald-600 text-xs font-medium hover:bg-surface-subtle transition disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Present
                        </button>

                        <button
                          type="button"
                          disabled={attendanceMutation.isPending}
                          onClick={() => attendanceMutation.mutate({ bookingId: item.id, status: "missed" })}
                          className="inline-flex h-8 items-center gap-1 px-2.5 rounded-md border border-border bg-surface text-danger text-xs font-medium hover:bg-surface-subtle transition disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Absent
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedBookingForNote({
                              bookingId: item.id,
                              studentName: item.student?.full_name ?? "Student",
                            })
                          }
                          className="inline-flex h-8 items-center gap-1 px-2.5 rounded-md border border-border text-primary text-xs font-medium hover:bg-surface-subtle transition"
                        >
                          <FileText className="h-3.5 w-3.5 text-brand" /> Notes Thread
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feedback Tab Content */}
          {activeTab === "feedback" && (
            <div className="space-y-4">
              {roster.length === 0 ? (
                <div className="rounded-md border border-border bg-surface p-8 text-center text-xs text-muted">
                  No rostered students to display feedback threads for.
                </div>
              ) : (
                <div className="space-y-4">
                  {roster.map((item: ClassRosterItem) => (
                    <SessionFeedbackThread
                      key={item.id}
                      bookingId={item.id}
                      studentName={item.student?.full_name ?? "Student"}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right Sidebar - Session Summary Card */}
        <aside className="space-y-4">
          <div className="rounded-md border border-border bg-surface p-5 space-y-4">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wide border-b border-border pb-2">
              Session Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <QuietLabel>Status</QuietLabel>
                <div className="mt-1">
                  <StatusBadge
                    tone={
                      session.status === "scheduled"
                        ? "indigo"
                        : session.status === "completed"
                        ? "green"
                        : "rose"
                    }
                  >
                    {session.status}
                  </StatusBadge>
                </div>
              </div>

              <div>
                <QuietLabel>Program</QuietLabel>
                <p className="mt-1 font-semibold text-primary">{formatProgram(session.program_type)}</p>
              </div>

              <div>
                <QuietLabel>Teacher Assigned</QuietLabel>
                <p className="mt-1 font-semibold text-primary">{session.teacher?.display_name ?? "Unassigned"}</p>
              </div>

              <div>
                <QuietLabel>Group / Student</QuietLabel>
                <p className="mt-1 font-semibold text-primary">
                  {session.batch_group?.name ?? session.primary_student?.full_name ?? "1-on-1"}
                </p>
              </div>

              <div>
                <QuietLabel>Capacity Fill</QuietLabel>
                <div className="mt-1">
                  <CapacityProgressBar booked={roster.length} capacity={session.capacity} />
                </div>
              </div>

              <div>
                <QuietLabel>Starts At</QuietLabel>
                <p className="mt-1 font-medium text-primary">{formatDateTime(session.starts_at)}</p>
              </div>

              <div>
                <QuietLabel>Ends At</QuietLabel>
                <p className="mt-1 font-medium text-primary">{formatDateTime(session.ends_at)}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Note Modal */}
      {selectedBookingForNote && (
        <SessionFeedbackNoteModal
          bookingId={selectedBookingForNote.bookingId}
          studentName={selectedBookingForNote.studentName}
          isOpen={Boolean(selectedBookingForNote)}
          onClose={() => setSelectedBookingForNote(null)}
        />
      )}
    </section>
  );
}

function TeacherBatchSessionActions({ session }: { session: TeacherClassSession }) {
  const client = useQueryClient();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const canManage = session.program_type === "batch"
    && Boolean(session.batch_schedule_day_id)
    && session.status === "scheduled"
    && new Date(session.starts_at) > new Date();

  const refreshClasses = () => {
    void client.invalidateQueries({ queryKey: ["teacher", "classes"] });
    void client.invalidateQueries({ queryKey: ["teacher"] });
  };

  const reschedule = useMutation({
    mutationFn: () => {
      const nextStartsAt = localDateTimeToIso(startsAt);
      const nextEndsAt = localDateTimeToIso(endsAt);
      if (!startsAt || !endsAt || new Date(nextStartsAt) >= new Date(nextEndsAt)) {
        throw new Error("Choose an end time after the start time.");
      }
      return rescheduleTeacherBatchClassSession({
        classSessionId: session.id,
        startsAt: nextStartsAt,
        endsAt: nextEndsAt,
        reason,
      });
    },
    onSuccess: () => {
      refreshClasses();
      setRescheduleOpen(false);
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelTeacherBatchClassSession({ classSessionId: session.id, reason }),
    onSuccess: () => {
      refreshClasses();
      setCancelOpen(false);
    },
  });

  if (!canManage) return null;

  const openReschedule = () => {
    setStartsAt(localInputValue(session.starts_at));
    setEndsAt(localInputValue(session.ends_at));
    setReason("");
    setRescheduleOpen(true);
  };

  const openCancel = () => {
    setReason("");
    setCancelOpen(true);
  };

  return <>
    <button
      type="button"
      onClick={openReschedule}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary transition hover:bg-surface-subtle"
    >
      <CalendarClock className="h-3.5 w-3.5" /> Change time
    </button>
    <button
      type="button"
      onClick={openCancel}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-danger transition hover:bg-danger/10"
    >
      <Ban className="h-3.5 w-3.5" /> Cancel session
    </button>
    <Modal
      title="Change session time"
      isOpen={rescheduleOpen}
      onClose={() => setRescheduleOpen(false)}
      footer={<><button type="button" onClick={() => setRescheduleOpen(false)} className="h-8 rounded-md px-2 text-xs text-muted hover:bg-surface-subtle">Close</button><button type="button" disabled={reschedule.isPending} onClick={() => reschedule.mutate()} className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white disabled:opacity-50">{reschedule.isPending ? "Saving…" : "Save time"}</button></>}
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">This changes only this batch session. Booked students stay in the session and receive its updated time.</p>
        <TimeField label="Starts" value={startsAt} onChange={setStartsAt} />
        <TimeField label="Ends" value={endsAt} onChange={setEndsAt} />
        <ReasonField value={reason} onChange={setReason} label="Reason (optional)" />
        {reschedule.isError ? <p className="text-xs text-danger">{getErrorMessage(reschedule.error)}</p> : null}
      </div>
    </Modal>
    <Modal
      title="Cancel this session"
      isOpen={cancelOpen}
      onClose={() => setCancelOpen(false)}
      footer={<><button type="button" onClick={() => setCancelOpen(false)} className="h-8 rounded-md px-2 text-xs text-muted hover:bg-surface-subtle">Keep session</button><button type="button" disabled={cancel.isPending} onClick={() => cancel.mutate()} className="h-8 rounded-md bg-danger px-3 text-xs font-medium text-white disabled:opacity-50">{cancel.isPending ? "Cancelling…" : "Cancel session"}</button></>}
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">Only this scheduled option will be cancelled. Its booked students will be cancelled; other sessions on the same day are unchanged.</p>
        <ReasonField value={reason} onChange={setReason} label="Reason (optional)" />
        {cancel.isError ? <p className="text-xs text-danger">{getErrorMessage(cancel.error)}</p> : null}
      </div>
    </Modal>
  </>;
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-medium text-primary"><span className="mb-1 block text-muted">{label}</span><input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-primary outline-none transition focus:border-brand" /></label>;
}

function ReasonField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-medium text-primary"><span className="mb-1 block text-muted">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} maxLength={1000} rows={3} className="w-full resize-y rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-primary outline-none transition focus:border-brand" /></label>;
}
