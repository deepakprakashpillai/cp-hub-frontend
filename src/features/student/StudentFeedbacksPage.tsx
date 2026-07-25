import { useQuery } from "@tanstack/react-query";
import { MessageSquare, User, Clock, RefreshCw } from "lucide-react";

import { useActiveStudent } from "@/features/student/student-store";
import { listStudentFeedbacks } from "@/features/student/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/features/admin/teachers/teacher-utils";
import { cn } from "@/lib/utils";

export function StudentFeedbacksPage() {
  const { activeStudent, isLoading: isStudentLoading } = useActiveStudent();
  const studentId = activeStudent?.student.id;

  const feedbacksQuery = useQuery({
    queryKey: ["student-feedbacks", studentId],
    queryFn: () => listStudentFeedbacks(studentId!),
    enabled: Boolean(studentId),
  });

  if (isStudentLoading) {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow="Student" title="Feedbacks" />
        <div className="h-48 animate-pulse rounded-md border border-border bg-surface" />
      </section>
    );
  }

  if (!activeStudent) {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow="Student" title="Feedbacks" />
        <div className="rounded-md border border-border bg-surface p-5">
          <p className="text-sm text-muted">Please select an active student in Settings.</p>
        </div>
      </section>
    );
  }

  const feedbacks = feedbacksQuery.data ?? [];

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Student"
        title="Teacher Progress Notes & Feedback"
        actions={
          <button
            type="button"
            onClick={() => void feedbacksQuery.refetch()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary"
            title="Refresh feedback notes"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", feedbacksQuery.isFetching && "animate-spin")} />
          </button>
        }
      />

      <div className="space-y-4">
        {feedbacksQuery.isLoading ? (
          <div className="py-12 text-center text-xs text-muted">Loading feedback entries...</div>
        ) : feedbacks.length > 0 ? (
          feedbacks.map((item) => (
            <article key={item.id} className="rounded-md border border-border bg-surface p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-md bg-surface-subtle text-brand">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-primary">
                      {item.teacher?.display_name ?? "Teacher Note"}
                    </h3>
                    <p className="text-[11px] text-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Recorded {formatDateTime(item.created_at)}
                    </p>
                  </div>
                </div>
                <StatusBadge tone="green">Student Visible</StatusBadge>
              </div>

              <div className="rounded-md border border-border bg-background p-4">
                <p className="text-xs leading-relaxed text-primary whitespace-pre-wrap">{item.note}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-md border border-border bg-surface p-8 text-center shadow-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-subtle">
              <MessageSquare className="h-5 w-5 text-muted" />
            </div>
            <p className="mt-4 text-sm font-medium text-primary">No feedback entries</p>
            <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
              You haven't received any published teacher feedback yet. Check back later.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
