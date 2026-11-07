import { useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Eye, Lock, RefreshCw } from "lucide-react";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import { createBookingNote, listBookingNotes, type BookingNoteRead } from "@/features/teacher/api";
import { formatDateTime } from "@/features/admin/teachers/teacher-utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { Callout } from "@/components/ui/Callout";
import { cn } from "@/lib/utils";

export function SessionFeedbackThread({
  bookingId,
  studentName,
  className,
}: {
  bookingId: string;
  studentName?: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { activeTeacherId } = useActiveTeacher();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  type NoteFormValues = {
    note: string;
    visibility: "admin_only" | "student_visible";
  };

  const { register, handleSubmit, reset, control, formState: { isSubmitting, isValid } } = useForm<NoteFormValues>({
    defaultValues: { note: "", visibility: "admin_only" },
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["teacher", activeTeacherId, "booking-notes", bookingId],
    queryFn: () => listBookingNotes(bookingId),
    enabled: Boolean(activeTeacherId && bookingId),
  });

  // Requirement 47: Auto-resizing textarea helper
  const adjustTextareaHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(72, el.scrollHeight)}px`;
  };

  const noteMutation = useMutation({
    mutationFn: (payload: NoteFormValues) =>
      createBookingNote({
        booking_id: bookingId,
        note: payload.note,
        visibility: payload.visibility,
      }),
    onSuccess: () => {
      reset();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId, "booking-notes", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["teacher", activeTeacherId] });
    },
  });

  const notes = data?.items ?? [];

  // Requirement 50: Keyboard Submission (Cmd+Enter or Ctrl+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit((data) => noteMutation.mutate(data))();
    }
  };

  const noteRegister = register("note", { required: true });

  return (
    <div className={cn("space-y-4 rounded-md border border-border bg-surface p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand" />
          <h3 className="text-xs font-semibold text-primary">
            Session Feedback Note Thread {studentName ? `• ${studentName}` : ""}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex h-7 items-center gap-1 rounded border border-border bg-surface-subtle px-2 text-[11px] font-medium text-muted hover:text-primary transition"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Requirement 49: Chronological Clarity - Vertical timeline left-border connector */}
      {isLoading ? (
        <div className="py-6 text-center text-xs text-muted">Loading feedback notes...</div>
      ) : isError ? (
        <Callout tone="danger" title="Error">
          Failed to load feedback notes thread.
        </Callout>
      ) : notes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface-subtle/50 p-6 text-center space-y-2">
          <MessageSquare className="mx-auto h-8 w-8 text-muted/40" />
          <p className="text-xs font-medium text-primary">No feedback notes recorded yet</p>
          <p className="text-[11px] text-muted max-w-xs mx-auto">
            Use the form below to record private teacher notes or visible feedback for {studentName ?? "the student"}.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-border/80 pl-4 space-y-3.5 max-h-[360px] overflow-y-auto pr-1 my-1 ml-2">
          {notes.map((note: BookingNoteRead, idx: number) => {
            const isLatest = idx === notes.length - 1;
            return (
              <div key={note.id} className="relative group">
                {/* Timeline dot */}
                <div
                  className={cn(
                    "absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full border-2 border-surface transition",
                    isLatest ? "bg-brand ring-2 ring-brand/20" : "bg-muted/40"
                  )}
                />
                <div className="rounded-md border border-border bg-surface-subtle p-3 space-y-2 transition hover:border-border/80 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">Teacher Note</span>
                      {isLatest && (
                        <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                          Latest Note
                        </span>
                      )}
                      <StatusBadge
                        tone={note.visibility === "student_visible" ? "green" : "indigo"}
                      >
                        {note.visibility === "student_visible" ? (
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" /> Student Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Admin & Teacher Only
                          </span>
                        )}
                      </StatusBadge>
                    </div>
                    <QuietLabel>{formatDateTime(note.created_at)}</QuietLabel>
                  </div>
                  <p className="text-xs text-primary whitespace-pre-wrap leading-relaxed">{note.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Composer Box */}
      <form
        onSubmit={handleSubmit((data) => noteMutation.mutate(data))}
        className="space-y-3 pt-2 border-t border-border"
      >
        <div>
          <label className="text-[11px] font-medium text-muted block mb-1">Add Feedback Note</label>
          {/* Requirement 47 & 50: Auto-resizing textarea with Cmd+Enter keyboard submission */}
          <textarea
            rows={3}
            {...noteRegister}
            ref={(e) => {
              noteRegister.ref(e);
              textareaRef.current = e;
            }}
            onChange={(e) => {
              noteRegister.onChange(e);
              adjustTextareaHeight(e.target);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Write session note or feedback note for ${studentName ?? "student"}...`}
            className="w-full rounded-md border border-border bg-surface p-2.5 text-xs text-primary placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-brand overflow-hidden resize-none transition"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Requirement 48: Visibility Toggle - Segmented control replacing FilterSelect */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted">Visibility:</span>
            <Controller
              control={control}
              name="visibility"
              render={({ field }) => (
                <div className="inline-flex h-8 items-center rounded-lg border border-border bg-surface-subtle p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => field.onChange("admin_only")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition",
                      field.value === "admin_only"
                        ? "bg-surface text-primary shadow-sm font-semibold"
                        : "text-muted hover:text-primary"
                    )}
                  >
                    <Lock className="h-3 w-3 text-indigo-500" />
                    <span>Admin & Teacher Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange("student_visible")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition",
                      field.value === "student_visible"
                        ? "bg-surface text-primary shadow-sm font-semibold"
                        : "text-muted hover:text-primary"
                    )}
                  >
                    <Eye className="h-3 w-3 text-emerald-500" />
                    <span>Student Visible</span>
                  </button>
                </div>
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted hidden sm:inline-block">
              Press <kbd className="rounded border border-border bg-surface-subtle px-1 py-0.5 font-sans">⌘/Ctrl</kbd> + <kbd className="rounded border border-border bg-surface-subtle px-1 py-0.5 font-sans">Enter</kbd> to save
            </span>
            <button
              type="submit"
              disabled={isSubmitting || noteMutation.isPending || !isValid}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {noteMutation.isPending ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>

        {noteMutation.isError && (
          <p className="text-xs text-danger mt-2">Failed to save note. Please check class start time or connection.</p>
        )}
      </form>
    </div>
  );
}
