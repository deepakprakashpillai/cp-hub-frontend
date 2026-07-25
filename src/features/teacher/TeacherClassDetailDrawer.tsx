import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, ExternalLink, CheckCircle, XCircle, FileText, RefreshCw, Undo2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import {
  getTeacherClassSession,
  getClassRoster,
  markClassAttendance,
  type ClassRosterItem,
} from "@/features/teacher/api";
import { formatDateTime, formatTime, formatProgram } from "@/features/admin/teachers/teacher-utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { Callout } from "@/components/ui/Callout";
import { SessionFeedbackThread } from "@/features/teacher/SessionFeedbackThread";
import { SessionFeedbackNoteModal } from "@/features/teacher/SessionFeedbackNoteModal";
import { CapacityProgressBar } from "@/features/teacher/TeacherClassesPage";
import { cn } from "@/lib/utils";

type DrawerTab = "overview" | "roster" | "feedback";

export function TeacherClassDetailDrawer({
  classSessionId,
  isOpen,
  onClose,
  onOpenWorkspace,
}: {
  classSessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenWorkspace?: (classSessionId: string) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeTeacherId } = useActiveTeacher();
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const [selectedBookingForNote, setSelectedBookingForNote] = useState<{ bookingId: string; studentName: string } | null>(null);

  // Requirement 20: Attendance Undo state
  const [lastAttendanceToast, setLastAttendanceToast] = useState<{
    bookingId: string;
    studentName: string;
    prevStatus: string;
    newStatus: "attended" | "missed";
  } | null>(null);

  // Requirement 19: Reset Drawer tabs to "Overview" on session change
  useEffect(() => {
    if (classSessionId) {
      setActiveTab("overview");
      setLastAttendanceToast(null);
    }
  }, [classSessionId]);

  // Requirement 16: Drawer Keyboard Navigation (Escape key listener)
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const {
    data: session,
    isLoading: isSessionLoading,
    isError: isSessionError,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ["teacher", activeTeacherId, "classes", classSessionId],
    queryFn: () => getTeacherClassSession(classSessionId!),
    enabled: Boolean(classSessionId && isOpen),
  });

  const {
    data: rosterData,
    isLoading: isRosterLoading,
    refetch: refetchRoster,
  } = useQuery({
    queryKey: ["teacher", "class-roster", classSessionId],
    queryFn: () => getClassRoster(classSessionId!),
    enabled: Boolean(classSessionId && isOpen),
  });

  const attendanceMutation = useMutation({
    mutationFn: (payload: { bookingId: string; status: "attended" | "missed" | "booked" }) =>
      markClassAttendance(classSessionId!, [{ booking_id: payload.bookingId, status: payload.status as any }]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
      queryClient.invalidateQueries({ queryKey: ["teacher", "class-roster", classSessionId] });
    },
  });

  if (!isOpen) return null;

  const roster = rosterData?.items ?? [];
  const title =
    session?.display_label ??
    session?.batch_group?.name ??
    (session?.program_type === "one_on_one" ? "1-on-1 Session" : "Batch Class Session");

  function handleOpenWorkspace() {
    if (!classSessionId) return;
    if (onOpenWorkspace) {
      onOpenWorkspace(classSessionId);
    } else {
      onClose();
      navigate(`/teacher/classes/${classSessionId}`);
    }
  }

  function handleMarkAttendance(item: ClassRosterItem, status: "attended" | "missed") {
    const studentName = item.student?.full_name ?? "Student";
    const prevStatus = item.status;

    setLastAttendanceToast({
      bookingId: item.id,
      studentName,
      prevStatus,
      newStatus: status,
    });

    attendanceMutation.mutate({ bookingId: item.id, status });
  }

  function handleUndoAttendance() {
    if (!lastAttendanceToast) return;
    const targetStatus = (lastAttendanceToast.prevStatus as "attended" | "missed" | "booked") || "booked";
    attendanceMutation.mutate({ bookingId: lastAttendanceToast.bookingId, status: targetStatus });
    setLastAttendanceToast(null);
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Requirement 17: Backdrop enter animation */}
      <button
        type="button"
        className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] animate-in fade-in duration-200 transition-opacity"
        onClick={onClose}
        aria-label="Close session drawer"
      />

      {/* Requirement 17 & 18: Drawer Slide-over Panel & Header spacing rebalance */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-border bg-surface shadow-2xl animate-in slide-in-from-right duration-300 ease-out transition-transform">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-5 gap-4">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded">
                {session ? formatProgram(session.program_type) : "Session"}
              </span>
              {session?.status && (
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
              )}
            </div>
            <h2 className="truncate text-base sm:text-lg font-bold leading-snug text-primary">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Requirement 12: Workspace link inside Drawer */}
            <button
              type="button"
              onClick={handleOpenWorkspace}
              title="Open full workspace page"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-subtle px-3 text-xs font-semibold text-primary hover:bg-border transition"
            >
              Workspace <ExternalLink className="h-3.5 w-3.5 text-brand" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-subtle hover:text-primary transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        {isSessionLoading ? (
          <div className="flex-1 py-12 text-center text-xs text-muted">Loading class session details...</div>
        ) : isSessionError || !session ? (
          <div className="p-6">
            <Callout tone="danger" title="Error">Failed to load class session details.</Callout>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Requirement 20: Attendance Toast / Notification Banner with Undo */}
            {lastAttendanceToast && (
              <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    Marked <strong>{lastAttendanceToast.studentName}</strong> as{" "}
                    <strong className="capitalize">{lastAttendanceToast.newStatus}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleUndoAttendance}
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-200 dark:hover:text-white underline ml-3 shrink-0"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Undo
                </button>
              </div>
            )}

            {/* Quick Metrics Bar with Requirement 14 Visual Progress */}
            <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-surface-subtle p-3 text-center items-center">
              <div>
                <QuietLabel>Schedule</QuietLabel>
                <p className="mt-0.5 text-xs font-semibold text-primary truncate">
                  {formatDateTime(session.starts_at)}
                </p>
              </div>
              <div>
                <QuietLabel>Duration</QuietLabel>
                <p className="mt-0.5 text-xs font-semibold text-primary">
                  {formatTime(session.starts_at)} - {formatTime(session.ends_at)} UTC
                </p>
              </div>
              <div className="flex flex-col items-center">
                <QuietLabel>Capacity</QuietLabel>
                <div className="mt-1">
                  <CapacityProgressBar
                    booked={session.booking_status_counts?.booked ?? roster.length}
                    capacity={session.capacity}
                  />
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex gap-1 border-b border-border">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "relative h-9 px-3 text-xs font-medium transition",
                  activeTab === "overview" ? "text-primary font-semibold" : "text-muted hover:text-primary"
                )}
              >
                Overview
                {activeTab === "overview" && <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("roster")}
                className={cn(
                  "relative h-9 px-3 text-xs font-medium transition",
                  activeTab === "roster" ? "text-primary font-semibold" : "text-muted hover:text-primary"
                )}
              >
                Roster ({roster.length})
                {activeTab === "roster" && <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("feedback")}
                className={cn(
                  "relative h-9 px-3 text-xs font-medium transition",
                  activeTab === "feedback" ? "text-primary font-semibold" : "text-muted hover:text-primary"
                )}
              >
                Feedback Thread
                {activeTab === "feedback" && <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />}
              </button>
            </nav>

            {/* Tab: Overview */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="rounded-md border border-border bg-surface p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wide">Session Briefing</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <QuietLabel>Program Type</QuietLabel>
                      <p className="mt-1 font-medium text-primary capitalize">{session.program_type.replace("_", " ")}</p>
                    </div>
                    <div>
                      <QuietLabel>Teacher Assigned</QuietLabel>
                      <p className="mt-1 font-medium text-primary">{session.teacher?.display_name ?? "Unassigned"}</p>
                    </div>
                    <div>
                      <QuietLabel>Batch / Student Name</QuietLabel>
                      <p className="mt-1 font-medium text-primary">
                        {session.batch_group?.name ?? session.primary_student?.full_name ?? "Standard Session"}
                      </p>
                    </div>
                    <div>
                      <QuietLabel>Booked Seats</QuietLabel>
                      <p className="mt-1 font-medium text-primary">{roster.length} of {session.capacity} max seats</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-primary uppercase tracking-wide">Attendance Status Summary</h3>
                    <button
                      type="button"
                      onClick={() => {
                        refetchSession();
                        refetchRoster();
                      }}
                      className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] text-muted hover:bg-surface-subtle"
                    >
                      <RefreshCw className="h-3 w-3" /> Refresh
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded border border-border bg-surface-subtle p-2">
                      <p className="font-bold text-emerald-600">
                        {roster.filter((r) => r.status === "attended").length}
                      </p>
                      <p className="text-[10px] text-muted">Attended</p>
                    </div>
                    <div className="rounded border border-border bg-surface-subtle p-2">
                      <p className="font-bold text-rose-600">
                        {roster.filter((r) => r.status === "missed").length}
                      </p>
                      <p className="text-[10px] text-muted">Missed / Absent</p>
                    </div>
                    <div className="rounded border border-border bg-surface-subtle p-2">
                      <p className="font-bold text-indigo-600">
                        {roster.filter((r) => r.status === "booked").length}
                      </p>
                      <p className="text-[10px] text-muted">Booked</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Roster & Attendance */}
            {activeTab === "roster" && (
              <div className="space-y-3">
                {isRosterLoading ? (
                  <div className="py-8 text-center text-xs text-muted">Loading class roster...</div>
                ) : roster.length === 0 ? (
                  <div className="rounded-md border border-border bg-surface p-6 text-center text-xs text-muted">
                    No students currently booked in this class session.
                  </div>
                ) : (
                  <div className="divide-y divide-border rounded-md border border-border bg-surface">
                    {roster.map((item: ClassRosterItem) => (
                      <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-primary">{item.student?.full_name ?? "Student"}</p>
                          <p className="text-[11px] text-muted">{item.student?.email ?? ""}</p>
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
                            onClick={() => handleMarkAttendance(item, "attended")}
                            className="inline-flex h-7 items-center gap-1 px-2 rounded border border-border bg-surface text-emerald-600 text-[11px] font-medium hover:bg-surface-subtle transition disabled:opacity-50"
                          >
                            <CheckCircle className="h-3 w-3" /> Present
                          </button>

                          <button
                            type="button"
                            disabled={attendanceMutation.isPending}
                            onClick={() => handleMarkAttendance(item, "missed")}
                            className="inline-flex h-7 items-center gap-1 px-2 rounded border border-border bg-surface text-danger text-[11px] font-medium hover:bg-surface-subtle transition disabled:opacity-50"
                          >
                            <XCircle className="h-3 w-3" /> Absent
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedBookingForNote({
                                bookingId: item.id,
                                studentName: item.student?.full_name ?? "Student",
                              })
                            }
                            className="inline-flex h-7 items-center gap-1 px-2 rounded border border-border text-primary text-[11px] font-medium hover:bg-surface-subtle transition"
                          >
                            <FileText className="h-3 w-3 text-brand" /> Notes
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Feedback Thread */}
            {activeTab === "feedback" && (
              <div className="space-y-3">
                {roster.length === 0 ? (
                  <div className="rounded-md border border-border bg-surface p-6 text-center text-xs text-muted">
                    No booked students to view feedback threads for.
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
          </div>
        )}
      </aside>

      {/* Note Modal */}
      {selectedBookingForNote && (
        <SessionFeedbackNoteModal
          bookingId={selectedBookingForNote.bookingId}
          studentName={selectedBookingForNote.studentName}
          isOpen={Boolean(selectedBookingForNote)}
          onClose={() => setSelectedBookingForNote(null)}
        />
      )}
    </div>
  );
}

