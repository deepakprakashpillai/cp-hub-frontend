import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { format, parseISO, isAfter } from "date-fns";
import { CalendarDays, User, RefreshCw, Users, Loader2 } from "lucide-react";

import { useActiveStudent } from "@/features/student/student-store";
import {
  bookOneOnOneClass,
  listAvailableTeacherSlots,
  listStudentBatchScheduleDays,
  selectBatchScheduleDayOption,
} from "@/features/student/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Callout } from "@/components/ui/Callout";
import { cn } from "@/lib/utils";

export function StudentSchedulePage() {
  const queryClient = useQueryClient();
  const { activeStudent, isLoading: isStudentLoading } = useActiveStudent();
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [slotDate, setSlotDate] = useState<string>("");

  const studentId = activeStudent?.student.id;
  const isOneOnOne = activeStudent?.student.program_type === "one_on_one";
  const isBatch = activeStudent?.student.program_type === "batch";

  const slotsQuery = useQuery({
    queryKey: ["student-slots", activeStudent?.assigned_teacher?.teacher.id],
    queryFn: () =>
      listAvailableTeacherSlots({
        teacherId: activeStudent?.student.assigned_teacher_id || undefined,
        startsFrom: new Date().toISOString(),
      }),
    enabled: Boolean(isOneOnOne && studentId),
  });

  const batchDaysQuery = useQuery({
    queryKey: ["student-batch-days", studentId],
    queryFn: () => listStudentBatchScheduleDays(),
    enabled: Boolean(isBatch && studentId),
  });

  const bookSlotMutation = useMutation({
    mutationFn: (slotId: string) =>
      bookOneOnOneClass({ teacher_availability_slot_id: slotId }),
    onSuccess: () => {
      setBookingSuccessMsg("1-on-1 Class successfully booked!");
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ["student-slots"] });
      void queryClient.invalidateQueries({ queryKey: ["student-bookings"] });
      setTimeout(() => setBookingSuccessMsg(null), 4000);
    },
    onError: (err: Error) => {
      let msg = err.message || "Unknown error";
      if (isAxiosError(err) && err.response?.data?.detail) {
        msg = typeof err.response.data.detail === "string" 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      }
      setErrorMsg(`Booking failed: ${msg}`);
    },
  });

  const selectBatchOptionMutation = useMutation({
    mutationFn: ({ dayId, classSessionId }: { dayId: string; classSessionId: string | null }) =>
      selectBatchScheduleDayOption(dayId, classSessionId),
    onSuccess: () => {
      setBookingSuccessMsg("Batch timing option selection updated!");
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ["student-batch-days"] });
      void queryClient.invalidateQueries({ queryKey: ["student-bookings"] });
      setTimeout(() => setBookingSuccessMsg(null), 4000);
    },
    onError: (err: Error) => {
      let msg = err.message || "Unknown error";
      if (isAxiosError(err) && err.response?.data?.detail) {
        msg = typeof err.response.data.detail === "string" 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      }
      setErrorMsg(`Option selection failed: ${msg}`);
    },
  });

  if (isStudentLoading) {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow="Student" title="Schedule a Class" />
        <div className="h-48 animate-pulse rounded-md border border-border bg-surface" />
      </section>
    );
  }

  if (!activeStudent) {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow="Student" title="Schedule a Class" />
        <Callout title="No active student context" tone="info">
          Please select an active student in Settings.
        </Callout>
      </section>
    );
  }

  const isEligibleToBook =
    activeStudent.student.status === "active" &&
    activeStudent.student.access_starts_at &&
    activeStudent.student.access_ends_at &&
    isAfter(new Date(), parseISO(activeStudent.student.access_starts_at)) &&
    isAfter(parseISO(activeStudent.student.access_ends_at), new Date());

  return (
    <section className="space-y-6">
      {/* Item 29: Refresh Affordance */}
      <PageHeader
        eyebrow="Student"
        title="Schedule a Class"
        actions={
          <button
            type="button"
            onClick={() => {
              void slotsQuery.refetch();
              void batchDaysQuery.refetch();
              setErrorMsg(null);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:bg-surface-subtle hover:text-primary hover:border-brand/40 shadow-2xs"
            title="Refresh schedule"
          >
            <RefreshCw className={cn("h-4 w-4", (slotsQuery.isFetching || batchDaysQuery.isFetching) && "animate-spin")} />
          </button>
        }
      />

      {bookingSuccessMsg ? (
        <Callout tone="success" title="Success">
          {bookingSuccessMsg}
        </Callout>
      ) : null}

      {errorMsg ? (
        <Callout tone="danger" title="Action Failed">
          {errorMsg}
        </Callout>
      ) : null}

      {!isEligibleToBook ? (
        <Callout tone="warning" title="Booking Restricted">
          Account status is <strong className="font-semibold text-primary">{activeStudent.student.status}</strong> or package access has expired.
        </Callout>
      ) : null}

      {/* 1-on-1 Scheduler Mode */}
      {isOneOnOne ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Assigned Teacher:</span>
              <span className="text-xs font-semibold text-primary">
                {activeStudent.assigned_teacher?.user.full_name ?? "None assigned"}
              </span>
            </div>
            <StatusBadge tone="indigo">1-on-1 Program</StatusBadge>
          </div>

          <div className="rounded-md border border-border bg-surface p-5 space-y-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
              <h2 className="text-base font-semibold text-primary flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand" /> Available Teacher Slots
              </h2>
              <input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              />
            </div>

            {slotsQuery.isLoading ? (
              <div className="py-8 text-center text-xs text-muted">Loading available slots...</div>
            ) : (() => {
              const filteredSlots = slotsQuery.data?.items
                ? slotsQuery.data.items.filter(slot => !slotDate || slot.starts_at.startsWith(slotDate))
                : [];
                
              return filteredSlots.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredSlots.map((slot) => {
                    const startsAt = parseISO(slot.starts_at);
                    const endsAt = parseISO(slot.ends_at);
                    const canBook = isEligibleToBook && !bookSlotMutation.isPending;

                    return (
                      /* Item 26: 1-on-1 Card Interaction - Entire card is clickable */
                      <div
                        key={slot.id}
                        role="button"
                        tabIndex={canBook ? 0 : -1}
                        onClick={() => {
                          if (canBook) {
                            bookSlotMutation.mutate(slot.id);
                          }
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && canBook) {
                            e.preventDefault();
                            bookSlotMutation.mutate(slot.id);
                          }
                        }}
                        className={cn(
                          "group flex flex-col justify-between rounded-lg border border-border bg-background p-4 transition-all duration-200 text-left shadow-2xs",
                          canBook
                            ? "cursor-pointer hover:border-brand hover:bg-brand/5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand/40"
                            : "opacity-60 cursor-not-allowed",
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-brand">
                              {format(startsAt, "EEE, MMM d")}
                            </span>
                            <StatusBadge tone="green">Available</StatusBadge>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-primary">
                            {format(startsAt, "HH:mm")} - {format(endsAt, "HH:mm")} UTC
                          </p>
                          {slot.teacher ? (
                            <p className="text-[11px] text-muted flex items-center gap-1 mt-1">
                              <User className="h-3 w-3 text-muted" /> {slot.teacher.display_name}
                            </p>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          disabled={!canBook}
                          className="mt-4 inline-flex h-8.5 w-full items-center justify-center gap-1.5 rounded-md bg-surface-subtle border border-border px-3 text-xs font-semibold text-primary transition duration-200 group-hover:bg-brand group-hover:text-white group-hover:border-brand disabled:opacity-50 disabled:group-hover:bg-surface-subtle disabled:group-hover:text-primary disabled:group-hover:border-border"
                        >
                          {bookSlotMutation.isPending ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Booking...
                            </>
                          ) : (
                            "Book Slot"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted">
                  No slots available{slotDate ? " for the selected date" : ""}.
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      {/* Batch Scheduler Mode */}
      {isBatch ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 shadow-sm">
            <span className="text-xs text-muted">Batch Group Daily Timing Selection</span>
            <StatusBadge tone="blue">Batch Program</StatusBadge>
          </div>

          <div className="space-y-4">
            {batchDaysQuery.isLoading ? (
              <div className="py-12 text-center text-sm text-muted">Loading schedule days...</div>
            ) : batchDaysQuery.data && batchDaysQuery.data.length > 0 ? (
              batchDaysQuery.data.map((day) => {
                const dayDate = parseISO(day.schedule_date);
                const hasAnySelection = Boolean(day.selected_class_session_id);

                return (
                  <div key={day.id} className="rounded-md border border-border bg-surface p-5 space-y-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-primary">
                          {format(dayDate, "EEEE, MMMM d, yyyy")}
                        </h3>
                        <p className="text-xs text-muted mt-0.5">UTC Date</p>
                      </div>
                      <StatusBadge tone={hasAnySelection ? "green" : "neutral"}>
                        {hasAnySelection ? "Option Selected" : "No Selection"}
                      </StatusBadge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {day.options.map((option) => {
                        const isSelected = day.selected_class_session_id === option.id;
                        const startsAt = parseISO(option.starts_at);
                        const endsAt = parseISO(option.ends_at);
                        const isFull = option.booked_count >= option.capacity;
                        const isDisabledOption = !isEligibleToBook || isFull || selectBatchOptionMutation.isPending;

                        return (
                          /* Item 27: Batch Selection Clarity - dim unselected options when a choice is made */
                          <div
                            key={option.id}
                            className={cn(
                              "group flex flex-col justify-between rounded-lg border p-4 transition-all duration-200 shadow-2xs",
                              isSelected
                                ? "border-brand bg-brand/10 shadow-md ring-2 ring-brand/30"
                                : hasAnySelection
                                  ? "border-border bg-surface-subtle/50 opacity-60 hover:opacity-90 hover:bg-background hover:border-border-strong"
                                  : "border-border bg-background hover:border-border-strong hover:shadow-xs",
                            )}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-primary">
                                  {option.display_label || option.batch_slot || "Option"}
                                </span>
                                <span className="text-[10px] text-muted flex items-center gap-1">
                                  <Users className="h-3 w-3" /> {option.booked_count}/{option.capacity}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-semibold text-primary">
                                {format(startsAt, "HH:mm")} - {format(endsAt, "HH:mm")} UTC
                              </p>
                            </div>

                            {/* Item 28: Disabled States - readable & distinct inactive contrast */}
                            <div className="mt-4">
                              {isSelected ? (
                                <button
                                  type="button"
                                  disabled={!isEligibleToBook || selectBatchOptionMutation.isPending}
                                  onClick={() =>
                                    selectBatchOptionMutation.mutate({
                                      dayId: day.id,
                                      classSessionId: null,
                                    })
                                  }
                                  className="inline-flex h-8.5 w-full items-center justify-center rounded-md border border-danger/30 bg-surface px-3 text-xs font-semibold text-danger transition duration-200 hover:bg-danger/10 hover:border-danger/50 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  Cancel Selection
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isDisabledOption}
                                  onClick={() =>
                                    selectBatchOptionMutation.mutate({
                                      dayId: day.id,
                                      classSessionId: option.id,
                                    })
                                  }
                                  className={cn(
                                    "inline-flex h-8.5 w-full items-center justify-center rounded-md text-xs font-semibold transition duration-200",
                                    isDisabledOption
                                      ? "bg-surface-subtle border border-border text-muted-foreground/80 cursor-not-allowed font-medium shadow-none"
                                      : "bg-surface-subtle border border-border text-primary hover:bg-brand hover:text-white hover:border-brand shadow-2xs",
                                  )}
                                >
                                  {isFull ? "Full (No Capacity)" : "Select Option"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-md border border-border bg-surface p-12 text-center text-sm text-muted">
                No active batch schedule days available.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
