import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Edit2, Plus, Trash2, X } from "lucide-react";
import { Link, useParams } from "react-router";

import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AdminDetailPanel } from "@/features/admin/AdminDetailPrimitives";
import {
  addAdminBatchScheduleDayOption,
  assignAdminBatchScheduleDayStudent,
  cancelAdminBatchScheduleDay,
  deleteAdminBatchScheduleDayOption,
  getAdminBatchScheduleDay,
  listAdminClassRoster,
  listAdminTeachers,
  removeAdminBatchScheduleDayStudent,
  updateAdminBatchScheduleDayOption,
  type BatchScheduleDayOptionRead,
} from "@/features/admin/api";

export function AdminBatchScheduleDayDetailPage() {
  const { batchScheduleDayId = "" } = useParams();
  const client = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [addOptionOpen, setAddOptionOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<BatchScheduleDayOptionRead | null>(null);
  const [deletingOption, setDeletingOption] = useState<BatchScheduleDayOptionRead | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState("");

  const day = useQuery({
    queryKey: ["admin", "batch-schedule-day", batchScheduleDayId],
    queryFn: () => getAdminBatchScheduleDay(batchScheduleDayId),
    enabled: Boolean(batchScheduleDayId),
  });

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["admin", "batch-schedule-day", batchScheduleDayId] });
    void client.invalidateQueries({ queryKey: ["admin", "batch-schedule-days"] });
  };

  if (day.isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-8 w-24 animate-pulse rounded-md bg-surface-subtle" />
        <div className="h-16 animate-pulse rounded-md bg-surface-subtle" />
      </section>
    );
  }

  if (day.isError || !day.data) {
    return (
      <section className="rounded-md border border-danger bg-surface p-4 text-sm text-danger">
        Scheduled day could not be loaded.
      </section>
    );
  }

  const data = day.data;

  return (
    <section className="space-y-4">
      <Link
        to="/admin/schedule"
        className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-subtle hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Schedule
      </Link>

      <header className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold leading-tight text-primary">{data.batch.name}</h1>
            <DayStatus status={data.status} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatDate(data.schedule_date)} · {data.options.length} sessions
          </p>
        </div>

        {data.status === "scheduled" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAddOptionOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary hover:bg-surface-subtle"
            >
              <Plus className="h-3.5 w-3.5 text-muted" />
              Add session
            </button>
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="h-8 rounded-md px-2.5 text-xs font-medium text-danger hover:bg-surface-subtle"
            >
              Cancel day
            </button>
          </div>
        ) : null}
      </header>

      <div className="-mt-2 grid gap-x-4 gap-y-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0 space-y-4">
          <AdminDetailPanel title="Sessions">
            <div className="space-y-2">
              {data.options.map((option) => (
                <OptionRow
                  key={option.id}
                  dayId={data.id}
                  option={option}
                  allOptions={data.options}
                  dayStatus={data.status}
                  selected={selectedOptionId === option.id}
                  onSelect={() => setSelectedOptionId(selectedOptionId === option.id ? "" : option.id)}
                  onEdit={() => setEditingOption(option)}
                  onDelete={() => setDeletingOption(option)}
                  onChanged={refresh}
                />
              ))}
              {!data.options.length ? (
                <p className="text-xs text-muted">No sessions configured for this day.</p>
              ) : null}
            </div>
          </AdminDetailPanel>

          <UnassignedStudents
            dayId={data.id}
            students={data.unassigned_students}
            options={data.options}
            disabled={data.status !== "scheduled"}
            onChanged={refresh}
          />
        </main>

        <aside className="space-y-3">
          <AdminDetailPanel title="Summary">
            <div className="space-y-3">
              <Summary label="Batch" value={data.batch.name} />
              <Summary label="Date" value={formatDate(data.schedule_date)} />
              <Summary label="Eligible students" value={String(data.eligible_student_count)} />
              <Summary label="Unassigned" value={String(data.unassigned_students.length)} />
              {data.cancel_reason ? <Summary label="Cancellation" value={data.cancel_reason} /> : null}
            </div>
          </AdminDetailPanel>
        </aside>
      </div>

      {addOptionOpen ? (
        <AddOptionModal
          dayId={data.id}
          scheduleDate={data.schedule_date}
          onClose={() => setAddOptionOpen(false)}
          onDone={refresh}
        />
      ) : null}

      {editingOption ? (
        <EditOptionModal
          dayId={data.id}
          option={editingOption}
          scheduleDate={data.schedule_date}
          onClose={() => setEditingOption(null)}
          onDone={refresh}
        />
      ) : null}

      {deletingOption ? (
        <DeleteOptionModal
          dayId={data.id}
          option={deletingOption}
          onClose={() => setDeletingOption(null)}
          onDone={refresh}
        />
      ) : null}

      {cancelOpen ? (
        <CancelDayModal dayId={data.id} onClose={() => setCancelOpen(false)} onDone={refresh} />
      ) : null}
    </section>
  );
}

function OptionRow({
  dayId,
  option,
  allOptions,
  dayStatus,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onChanged,
}: {
  dayId: string;
  option: BatchScheduleDayOptionRead;
  allOptions: BatchScheduleDayOptionRead[];
  dayStatus: string;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  return (
    <div className="rounded-md border border-border/40 bg-surface-subtle/65">
      <div className="flex w-full items-center justify-between gap-3 px-3 py-2">
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-primary">{option.display_label}</span>
            <span className="mt-1 block truncate text-xs text-muted">
              {formatTime(option.starts_at)}–{formatTime(option.ends_at)} · {option.teacher?.display_name ?? "Unassigned teacher"}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <QuietLabel>
            {option.active_booking_count} / {option.capacity}
          </QuietLabel>
          <StatusBadge tone={option.status === "cancelled" ? "rose" : option.status === "completed" ? "green" : "indigo"}>
            {option.status}
          </StatusBadge>

          {dayStatus === "scheduled" && option.status === "scheduled" ? (
            <div className="flex items-center gap-1 border-l border-border/60 pl-2">
              <button
                type="button"
                onClick={onEdit}
                title="Edit session"
                className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface hover:text-primary"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                title="Delete session"
                disabled={option.active_booking_count > 0}
                className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface hover:text-danger disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onSelect}
            className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface hover:text-primary"
          >
            <ChevronDown className={`h-3.5 w-3.5 text-muted transition ${selected ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {selected ? (
        <InlineOptionRoster dayId={dayId} option={option} allOptions={allOptions} onChanged={onChanged} />
      ) : null}
    </div>
  );
}

function InlineOptionRoster({
  dayId,
  option,
  allOptions,
  onChanged,
}: {
  dayId: string;
  option: BatchScheduleDayOptionRead;
  allOptions: BatchScheduleDayOptionRead[];
  onChanged: () => void;
}) {
  const client = useQueryClient();
  const roster = useQuery({
    queryKey: ["admin", "classes", option.id, "roster", "batch-day"],
    queryFn: () => listAdminClassRoster({ classSessionId: option.id, pageSize: 50 }),
  });

  const otherOptions = allOptions.filter(
    (item) => item.id !== option.id && item.status === "scheduled" && item.available_capacity > 0
  );

  const changed = () => {
    void client.invalidateQueries({ queryKey: ["admin", "batch-schedule-day", dayId] });
    void client.invalidateQueries({ queryKey: ["admin", "classes", option.id, "roster"] });
    onChanged();
  };

  return (
    <div className="border-t border-border/60 bg-surface/50 px-3 py-2.5">
      <p className="mb-2 text-[11px] font-medium text-muted">Assigned Students ({roster.data?.total ?? 0})</p>
      <div className="space-y-1.5">
        {roster.data?.items.map((booking) => (
          <RosterRow
            key={booking.id}
            dayId={dayId}
            option={option}
            otherOptions={otherOptions}
            studentId={booking.student.id}
            name={booking.student.full_name}
            email={booking.student.email}
            onChanged={changed}
          />
        ))}
        {roster.isLoading ? <p className="text-xs text-muted">Loading students…</p> : null}
        {!roster.isLoading && !roster.data?.items.length ? (
          <p className="text-xs text-muted">No students assigned to this session.</p>
        ) : null}
      </div>
    </div>
  );
}

function RosterRow({
  dayId,
  option,
  otherOptions,
  studentId,
  name,
  email,
  onChanged,
}: {
  dayId: string;
  option: BatchScheduleDayOptionRead;
  otherOptions: BatchScheduleDayOptionRead[];
  studentId: string;
  name: string;
  email: string;
  onChanged: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [moveOptionId, setMoveOptionId] = useState("");

  const remove = useMutation({
    mutationFn: () =>
      removeAdminBatchScheduleDayStudent({
        dayId,
        studentId,
        reason: `Removed from ${option.display_label}`,
      }),
    onSuccess: () => {
      onChanged();
      setConfirm(false);
    },
  });

  const move = useMutation({
    mutationFn: (targetClassSessionId: string) =>
      assignAdminBatchScheduleDayStudent({
        dayId,
        studentId,
        classSessionId: targetClassSessionId,
        reason: "Reassigned by admin",
      }),
    onSuccess: () => {
      setMoveOptionId("");
      onChanged();
    },
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/40 bg-surface px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-primary">{name}</p>
        <p className="truncate text-[11px] text-muted">{email}</p>
      </div>

      {option.status === "scheduled" ? (
        <div className="flex items-center gap-2">
          {otherOptions.length > 0 ? (
            <FilterSelect
              value={moveOptionId}
              onChange={(targetId) => {
                if (targetId) {
                  move.mutate(targetId);
                }
              }}
              options={otherOptions.map((item) => ({
                value: item.id,
                label: `Move to ${item.display_label}`,
              }))}
              allLabel="Move to session…"
              className="w-36"
              triggerClassName="h-7 text-xs"
            />
          ) : null}

          {confirm ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
                className="h-7 rounded-md bg-danger px-2 text-xs font-medium text-white disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface-subtle"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="h-7 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-subtle hover:text-danger"
            >
              Remove
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function UnassignedStudents({
  dayId,
  students,
  options,
  disabled,
  onChanged,
}: {
  dayId: string;
  students: Array<{ id: string; full_name: string; email: string }>;
  options: BatchScheduleDayOptionRead[];
  disabled: boolean;
  onChanged: () => void;
}) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const assign = useMutation({
    mutationFn: ({ studentId, classSessionId }: { studentId: string; classSessionId: string }) =>
      assignAdminBatchScheduleDayStudent({
        dayId,
        studentId,
        classSessionId,
        reason: "Assigned by admin",
      }),
    onSuccess: () => {
      onChanged();
    },
  });

  const availableOptions = options.filter(
    (opt) => opt.status === "scheduled" && opt.available_capacity > 0
  );

  return (
    <AdminDetailPanel title={`Unassigned students (${students.length})`}>
      <div className="space-y-2">
        {students.slice(0, 25).map((student) => {
          const selectedOptionId = assignments[student.id] || "";
          return (
            <div
              key={student.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-surface-subtle/65 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-primary">{student.full_name}</p>
                <p className="truncate text-[11px] text-muted">{student.email}</p>
              </div>

              {!disabled ? (
                <div className="flex items-center gap-2">
                  <FilterSelect
                    value={selectedOptionId}
                    onChange={(val) =>
                      setAssignments((prev) => ({ ...prev, [student.id]: val }))
                    }
                    options={availableOptions.map((opt) => ({
                      value: opt.id,
                      label: opt.display_label,
                    }))}
                    allLabel="Select session…"
                    className="w-40"
                    triggerClassName="h-7 text-xs"
                  />
                  {selectedOptionId ? (
                    <button
                      type="button"
                      disabled={assign.isPending}
                      onClick={() =>
                        assign.mutate({
                          studentId: student.id,
                          classSessionId: selectedOptionId,
                        })
                      }
                      className="h-7 rounded-md bg-brand px-2.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Assign
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {students.length > 25 ? (
          <QuietLabel>Showing first 25 unassigned students.</QuietLabel>
        ) : null}

        {!students.length ? (
          <p className="text-xs text-muted">Every eligible student has selected a session.</p>
        ) : null}

        {assign.isError ? (
          <p className="text-xs text-danger">Student could not be assigned. Verify session capacity and day conflict.</p>
        ) : null}
      </div>
    </AdminDetailPanel>
  );
}

function AddOptionModal({
  dayId,
  scheduleDate,
  onClose,
  onDone,
}: {
  dayId: string;
  scheduleDate: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [displayLabel, setDisplayLabel] = useState("");
  const [startTimeLocal, setStartTimeLocal] = useState("09:00");
  const [endTimeLocal, setEndTimeLocal] = useState("10:00");
  const [teacherId, setTeacherId] = useState("");
  const [capacity, setCapacity] = useState("15");

  const teachers = useQuery({
    queryKey: ["admin", "teachers", "option-modal"],
    queryFn: () => listAdminTeachers({ isActive: true, pageSize: 100 }),
  });

  const add = useMutation({
    mutationFn: () => {
      const startsAt = new Date(`${scheduleDate}T${startTimeLocal}:00`).toISOString();
      const endsAt = new Date(`${scheduleDate}T${endTimeLocal}:00`).toISOString();
      return addAdminBatchScheduleDayOption({
        dayId,
        displayLabel,
        startsAt,
        endsAt,
        teacherId: teacherId || null,
        capacity: capacity ? Number(capacity) : null,
      });
    },
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  return (
    <Modal
      title="Add session"
      isOpen
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!displayLabel.trim() || add.isPending}
          onClick={() => add.mutate()}
          className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white disabled:opacity-50"
        >
          Add session
        </button>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">Session label</span>
          <input
            value={displayLabel}
            onChange={(e) => setDisplayLabel(e.target.value)}
            placeholder="e.g. Morning Session"
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-primary"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">Start time</span>
            <input
              type="time"
              value={startTimeLocal}
              onChange={(e) => setStartTimeLocal(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">End time</span>
            <input
              type="time"
              value={endTimeLocal}
              onChange={(e) => setEndTimeLocal(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-primary"
            />
          </label>
        </div>

        <FilterSelect
          label="Teacher (optional)"
          value={teacherId}
          onChange={setTeacherId}
          options={
            teachers.data?.items.map((t) => ({
              value: t.teacher.id,
              label: t.teacher.display_name || t.user.full_name,
            })) ?? []
          }
          allLabel="Unassigned"
          className="w-full"
          triggerClassName="w-full"
        />

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">Capacity</span>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-primary"
          />
        </label>

        {add.isError ? (
          <p className="text-xs text-danger">Failed to add session. Check for time overlap or duplicate label.</p>
        ) : null}
      </div>
    </Modal>
  );
}

function EditOptionModal({
  dayId,
  option,
  scheduleDate,
  onClose,
  onDone,
}: {
  dayId: string;
  option: BatchScheduleDayOptionRead;
  scheduleDate: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [displayLabel, setDisplayLabel] = useState(option.display_label);
  const [startTimeLocal, setStartTimeLocal] = useState(extractTimeLocal(option.starts_at));
  const [endTimeLocal, setEndTimeLocal] = useState(extractTimeLocal(option.ends_at));
  const [teacherId, setTeacherId] = useState(option.teacher?.id ?? "");
  const [capacity, setCapacity] = useState(String(option.capacity));

  const teachers = useQuery({
    queryKey: ["admin", "teachers", "option-modal"],
    queryFn: () => listAdminTeachers({ isActive: true, pageSize: 100 }),
  });

  const update = useMutation({
    mutationFn: () => {
      const startsAt = new Date(`${scheduleDate}T${startTimeLocal}:00`).toISOString();
      const endsAt = new Date(`${scheduleDate}T${endTimeLocal}:00`).toISOString();
      return updateAdminBatchScheduleDayOption({
        dayId,
        classSessionId: option.id,
        displayLabel,
        startsAt,
        endsAt,
        teacherId: teacherId || null,
        capacity: Number(capacity),
      });
    },
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  return (
    <Modal
      title={`Edit session: ${option.display_label}`}
      isOpen
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!displayLabel.trim() || update.isPending}
          onClick={() => update.mutate()}
          className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white disabled:opacity-50"
        >
          Save changes
        </button>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">Session label</span>
          <input
            value={displayLabel}
            onChange={(e) => setDisplayLabel(e.target.value)}
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-primary"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">Start time</span>
            <input
              type="time"
              value={startTimeLocal}
              onChange={(e) => setStartTimeLocal(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">End time</span>
            <input
              type="time"
              value={endTimeLocal}
              onChange={(e) => setEndTimeLocal(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-primary"
            />
          </label>
        </div>

        <FilterSelect
          label="Teacher"
          value={teacherId}
          onChange={setTeacherId}
          options={
            teachers.data?.items.map((t) => ({
              value: t.teacher.id,
              label: t.teacher.display_name || t.user.full_name,
            })) ?? []
          }
          allLabel="Unassigned"
          className="w-full"
          triggerClassName="w-full"
        />

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">Capacity</span>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-primary"
          />
        </label>

        {update.isError ? (
          <p className="text-xs text-danger">Failed to update session. Check capacity and time boundaries.</p>
        ) : null}
      </div>
    </Modal>
  );
}

function DeleteOptionModal({
  dayId,
  option,
  onClose,
  onDone,
}: {
  dayId: string;
  option: BatchScheduleDayOptionRead;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const del = useMutation({
    mutationFn: () =>
      deleteAdminBatchScheduleDayOption({
        dayId,
        classSessionId: option.id,
        reason,
      }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  return (
    <Modal
      title={`Delete session: ${option.display_label}`}
      isOpen
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={del.isPending}
          onClick={() => del.mutate()}
          className="h-8 rounded-md bg-danger px-3 text-xs font-medium text-white disabled:opacity-50"
        >
          Delete session
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">
          Are you sure you want to remove this session? Removing an empty session marks its underlying class session cancelled.
        </p>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">Reason (optional)</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Schedule consolidation"
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-primary"
          />
        </label>

        {del.isError ? (
          <p className="text-xs text-danger">Failed to delete session. Make sure no active students are assigned.</p>
        ) : null}
      </div>
    </Modal>
  );
}

function CancelDayModal({
  dayId,
  onClose,
  onDone,
}: {
  dayId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const cancel = useMutation({
    mutationFn: () => cancelAdminBatchScheduleDay({ dayId, reason }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  return (
    <Modal
      title="Cancel scheduled day"
      isOpen
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate()}
          className="h-8 rounded-md bg-danger px-3 text-xs font-medium text-white disabled:opacity-50"
        >
          Cancel day
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">
          Cancelling this day will mark all scheduled sessions cancelled and cancel all student bookings.
        </p>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">Reason</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Holiday closure"
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-primary"
          />
        </label>
        {cancel.isError ? (
          <p className="text-xs text-danger">The scheduled day could not be cancelled.</p>
        ) : null}
      </div>
    </Modal>
  );
}

function DayStatus({ status }: { status: string }) {
  return (
    <StatusBadge tone={status === "cancelled" ? "rose" : status === "completed" ? "green" : "indigo"}>
      {status[0].toUpperCase() + status.slice(1)}
    </StatusBadge>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-primary">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`)
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(new Date(value));
}

function extractTimeLocal(isoString: string) {
  const d = new Date(isoString);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
