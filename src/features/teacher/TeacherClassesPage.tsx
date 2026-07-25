import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Filter, RefreshCw, CheckCircle, XCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import {
  listTeacherClasses,
  getClassRoster,
  markClassAttendance,
  createBookingNote,
} from "@/features/teacher/api";
import { formatDateTime, formatTime, formatProgram } from "@/features/admin/teachers/teacher-utils";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

type ClassTab = "today" | "upcoming" | "past";

const tabOptions: Array<{ value: ClassTab; label: string }> = [
  { value: "today", label: "Today's Classes" },
  { value: "upcoming", label: "Upcoming Classes" },
  { value: "past", label: "Past History" },
];

export function TeacherClassesPage() {
  const queryClient = useQueryClient();
  const { activeTeacherId } = useActiveTeacher();
  const [activeTab, setActiveTab] = useState<ClassTab>("upcoming");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Note Modal state
  const [selectedBookingForNote, setSelectedBookingForNote] = useState<{ bookingId: string; studentName: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"admin_only" | "student_visible">("admin_only");

  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfToday = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  let startsFrom: string | undefined;
  let startsTo: string | undefined;
  let sortOrder: "asc" | "desc" = "asc";

  if (activeTab === "today") {
    startsFrom = startOfToday;
    startsTo = endOfToday;
  } else if (activeTab === "upcoming") {
    startsFrom = new Date().toISOString();
  } else if (activeTab === "past") {
    startsTo = new Date().toISOString();
    sortOrder = "desc";
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["teacher", activeTeacherId, "classes", activeTab, programFilter, statusFilter],
    queryFn: () =>
      listTeacherClasses({
        teacherId: activeTeacherId!,
        programType: programFilter,
        status: statusFilter,
        startsFrom,
        startsTo,
        sortOrder,
      }),
    enabled: Boolean(activeTeacherId),
  });

  const classes = data?.items ?? [];

  // Attendance mutation
  const attendanceMutation = useMutation({
    mutationFn: (payload: { classSessionId: string; bookingId: string; status: "attended" | "missed" }) =>
      markClassAttendance(payload.classSessionId, [
        { booking_id: payload.bookingId, status: payload.status },
      ]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
      queryClient.invalidateQueries({ queryKey: ["class-roster"] });
    },
  });

  // Note mutation
  const noteMutation = useMutation({
    mutationFn: (payload: { bookingId: string; note: string; visibility: "admin_only" | "student_visible" }) =>
      createBookingNote({
        booking_id: payload.bookingId,
        teacher_id: activeTeacherId!,
        note: payload.note,
        visibility: payload.visibility,
      }),
    onSuccess: () => {
      setSelectedBookingForNote(null);
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
    },
  });

  return (
    <section className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Classes & Schedule"
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary transition hover:bg-surface-subtle"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      {/* Admin Parity Navigation Tabs */}
      <nav className="flex flex-wrap gap-1 border-b border-border">
        {tabOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setActiveTab(item.value)}
            className={cn(
              "relative h-9 px-2 text-xs font-medium transition",
              activeTab === item.value ? "text-primary font-semibold" : "text-muted hover:text-primary"
            )}
          >
            {item.label}
            {activeTab === item.value ? (
              <span className="absolute inset-x-2 bottom-[-1px] h-px bg-brand" />
            ) : null}
          </button>
        ))}
      </nav>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface p-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>
        <FilterSelect
          value={programFilter}
          onChange={setProgramFilter}
          options={[
            { label: "All Programs", value: "all" },
            { label: "1-on-1 Sessions", value: "one_on_one" },
            { label: "Batch Classes", value: "batch" },
          ]}
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All Statuses", value: "all" },
            { label: "Scheduled", value: "scheduled" },
            { label: "Completed", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
          ]}
        />
      </div>

      {/* Class Sessions List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-muted">Loading class sessions...</div>
      ) : classes.length === 0 ? (
        <div className="rounded-md border border-border bg-surface p-8 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted/50" />
          <h3 className="mt-3 text-sm font-semibold text-primary">No sessions found</h3>
          <p className="mt-1 text-xs text-muted max-w-md mx-auto">
            There are no class sessions matching your selected filters for the current active teacher.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((item) => {
            const isExpanded = expandedSessionId === item.id;

            return (
              <div key={item.id} className="rounded-md border border-border bg-surface overflow-hidden transition">
                <div
                  onClick={() => setExpandedSessionId(isExpanded ? null : item.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-surface-subtle gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand">
                        {formatProgram(item.program_type)}
                      </span>
                      <p className="text-sm font-semibold text-primary">
                        {item.display_label ?? item.batch_group?.name ?? (item.program_type === "one_on_one" ? "1-on-1 Session" : "Batch Session")}
                      </p>
                      <StatusBadge tone={item.status === "scheduled" ? "indigo" : item.status === "completed" ? "green" : "rose"}>
                        {item.status}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-muted">
                      {formatDateTime(item.starts_at)} - {formatTime(item.ends_at)} UTC
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span>
                      {item.booking_status_counts?.booked ?? 0} booked / {item.capacity} capacity
                    </span>
                    <button type="button" className="inline-grid h-7 w-7 place-items-center rounded hover:bg-border text-primary">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Roster Section */}
                {isExpanded && (
                  <div className="border-t border-border bg-surface-subtle p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">Class Roster & Attendance</h4>
                    <SessionRosterView
                      classSessionId={item.id}
                      onMarkAttendance={(bookingId, status) =>
                        attendanceMutation.mutate({ classSessionId: item.id, bookingId, status })
                      }
                      onAddNote={(bookingId, studentName) => {
                        setSelectedBookingForNote({ bookingId, studentName });
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Note Modal */}
      {selectedBookingForNote && (
        <Modal
          title={`Add Note for ${selectedBookingForNote.studentName}`}
          isOpen={Boolean(selectedBookingForNote)}
          onClose={() => setSelectedBookingForNote(null)}
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-primary">Session Feedback / Note</label>
              <textarea
                rows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter feedback or progress note for student..."
                className="mt-1 w-full rounded-md border border-border bg-surface p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-primary">Visibility</label>
              <select
                value={noteVisibility}
                onChange={(e) => setNoteVisibility(e.target.value as "admin_only" | "student_visible")}
                className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-xs text-primary"
              >
                <option value="admin_only">Admin & Teacher Only</option>
                <option value="student_visible">Student Visible</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingForNote(null)}
                className="h-8 px-3 text-xs font-medium rounded border border-border text-primary hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!noteText.trim() || noteMutation.isPending}
                onClick={() =>
                  noteMutation.mutate({
                    bookingId: selectedBookingForNote.bookingId,
                    note: noteText,
                    visibility: noteVisibility,
                  })
                }
                className="h-8 px-3 text-xs font-medium rounded bg-brand text-white hover:opacity-90 disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

function SessionRosterView({
  classSessionId,
  onMarkAttendance,
  onAddNote,
}: {
  classSessionId: string;
  onMarkAttendance: (bookingId: string, status: "attended" | "missed") => void;
  onAddNote: (bookingId: string, studentName: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["class-roster", classSessionId],
    queryFn: () => getClassRoster(classSessionId),
  });

  const roster = data?.items ?? [];

  if (isLoading) {
    return <div className="text-xs text-muted py-2">Loading roster...</div>;
  }

  if (roster.length === 0) {
    return <div className="text-xs text-muted py-2">No students currently booked in this class session.</div>;
  }

  return (
    <div className="divide-y divide-border rounded-md border border-border bg-surface">
      {roster.map((r) => (
        <div key={r.id} className="p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-primary">{r.student.user.full_name}</p>
            <p className="text-[11px] text-muted">{r.student.user.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge tone={r.status === "attended" ? "green" : r.status === "missed" ? "rose" : "indigo"}>
              {r.status}
            </StatusBadge>

            <button
              type="button"
              onClick={() => onMarkAttendance(r.id, "attended")}
              title="Mark Present"
              className="inline-flex h-7 items-center gap-1 px-2 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[11px] font-medium hover:bg-emerald-500/20"
            >
              <CheckCircle className="h-3 w-3" /> Present
            </button>

            <button
              type="button"
              onClick={() => onMarkAttendance(r.id, "missed")}
              title="Mark Absent"
              className="inline-flex h-7 items-center gap-1 px-2 rounded border border-rose-500/30 bg-rose-500/10 text-rose-600 text-[11px] font-medium hover:bg-rose-500/20"
            >
              <XCircle className="h-3 w-3" /> Absent
            </button>

            <button
              type="button"
              onClick={() => onAddNote(r.id, r.student.user.full_name)}
              title="Add Note"
              className="inline-flex h-7 items-center gap-1 px-2 rounded border border-border text-primary text-[11px] font-medium hover:bg-surface-subtle"
            >
              <FileText className="h-3 w-3 text-brand" /> Note
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
