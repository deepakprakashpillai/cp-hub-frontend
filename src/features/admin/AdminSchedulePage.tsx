import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { CalendarOff, CalendarPlus, Plus, SlidersHorizontal } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  cancelAdminBatchScheduleDaysBulk,
  createAdminBatchScheduleDay,
  createAdminBatchScheduleDaysBulk,
  getAdminBatchScheduleDefaults,
  listAdminBatchGroups,
  listAdminBatchScheduleDays,
  listAdminTeachers,
  updateAdminBatchScheduleDefaults,
  type BatchDayOptionInput,
  type BatchScheduleDayRead,
  type BatchScheduleDefaultsRead,
} from "@/features/admin/api";

const column = createColumnHelper<BatchScheduleDayRead>();

export function AdminSchedulePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const range = params.get("range") ?? "upcoming";
  const window = dateWindow(range);
  const days = useQuery({
    queryKey: ["admin", "batch-schedule-days", page, range],
    queryFn: () => listAdminBatchScheduleDays({ ...window, page, pageSize: 25 }),
  });

  const update = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key)
    );
    setParams(next);
  };

  const columns = useMemo(
    () => [
      column.accessor("schedule_date", {
        header: "Date",
        cell: ({ getValue }) => (
          <p className="text-sm font-medium text-primary">{formatUtcDate(getValue())}</p>
        ),
      }),
      column.accessor("batch.name", {
        header: "Batch",
        cell: ({ getValue }) => <QuietLabel>{getValue()}</QuietLabel>,
      }),
      column.accessor("options", {
        header: "Options",
        cell: ({ getValue }) => <QuietLabel>{getValue().length} sessions</QuietLabel>,
      }),
      column.accessor("eligible_student_count", {
        header: "Students",
        cell: ({ row, getValue }) => (
          <QuietLabel>
            {getValue() - row.original.unassigned_students.length} / {getValue()} selected
          </QuietLabel>
        ),
      }),
      column.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => <DayStatus status={getValue()} />,
      }),
    ],
    []
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: days.data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="space-y-5">
      <PageHeader
        title="Schedule"
        actions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDefaultsOpen(true)}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-subtle hover:text-primary"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Defaults
            </button>
            <button
              type="button"
              onClick={() => setBulkCancelOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-danger hover:bg-surface-subtle"
            >
              <CalendarOff className="h-3.5 w-3.5" />
              Bulk cancel
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-2.5 text-xs font-medium text-white hover:opacity-90"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Schedule batch
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Show"
          value={range}
          includeAll={false}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "week", label: "Next 7 days" },
            { value: "all", label: "All" },
          ]}
          onChange={(value) => update({ range: value === "upcoming" ? null : value, page: null })}
        />
        {range !== "upcoming" ? (
          <button
            type="button"
            onClick={() => update({ range: null, page: null })}
            className="h-8 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-subtle"
          >
            Clear
          </button>
        ) : null}
      </div>

      <DataTable
        table={table}
        isLoading={days.isLoading}
        isError={days.isError}
        emptyMessage="No batch days scheduled"
        errorMessage="Schedule could not be loaded."
        onRetry={() => void days.refetch()}
        onRowClick={(row) => navigate(`/admin/schedule/batch-days/${row.original.id}`)}
      />

      <TablePagination
        page={page}
        totalPages={Math.max(1, Math.ceil((days.data?.total ?? 0) / 25))}
        total={days.data?.total ?? 0}
        itemLabel="scheduled days"
        onPageChange={(nextPage) => update({ page: nextPage > 1 ? String(nextPage) : null })}
      />

      {open ? <ScheduleBatchModal onClose={() => setOpen(false)} /> : null}
      {bulkCancelOpen ? <BulkCancelModal onClose={() => setBulkCancelOpen(false)} /> : null}
      {defaultsOpen ? <ScheduleDefaultsModal onClose={() => setDefaultsOpen(false)} /> : null}
    </section>
  );
}

function ScheduleBatchModal({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [mode, setMode] = useState<"single" | "week">("single");
  const [batchId, setBatchId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [date, setDate] = useState(tomorrow());
  const [endDate, setEndDate] = useState(weekEnd());
  const [weekdays, setWeekdays] = useState(["monday", "tuesday", "wednesday", "thursday", "friday"]);

  const defaults = useQuery({
    queryKey: ["admin", "batch-schedule-defaults"],
    queryFn: getAdminBatchScheduleDefaults,
  });

  const batches = useQuery({
    queryKey: ["admin", "batch-groups", "schedule"],
    queryFn: () => listAdminBatchGroups({ isActive: true, pageSize: 100 }),
  });

  const teachers = useQuery({
    queryKey: ["admin", "teachers", "schedule"],
    queryFn: () => listAdminTeachers({ isActive: true, pageSize: 100 }),
  });

  const [options, setOptions] = useState<BatchDayOptionInput[] | null>(null);
  const rows =
    options ?? defaults.data?.option_templates.map((item) => optionFromDefault(date, item)) ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "single") {
        return createAdminBatchScheduleDay({
          batchGroupId: batchId,
          scheduleDate: date,
          defaultTeacherId: teacherId || null,
          options: rows.map((item) => ({
            ...item,
            teacherId: item.teacherId || teacherId || null,
          })),
        });
      }
      return createAdminBatchScheduleDaysBulk({
        batchGroupId: batchId,
        startsFrom: date,
        startsTo: endDate,
        weekdays,
        defaultTeacherId: teacherId || null,
        options: rows.map((item) => ({
          displayLabel: item.displayLabel,
          startTimeUtc: item.startsAt.slice(11, 16) + ":00",
          endTimeUtc: item.endsAt.slice(11, 16) + ":00",
          teacherId: item.teacherId || teacherId || null,
          capacity: item.capacity,
        })),
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin", "batch-schedule-days"] });
      onClose();
    },
  });

  const updateOption = (index: number, changes: Partial<BatchDayOptionInput>) =>
    setOptions(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...changes } : row)));

  const valid =
    batchId && rows.length && (mode === "single" || weekdays.length) && !mutation.isPending;

  return (
    <Modal
      title="Schedule batch"
      size="lg"
      isOpen
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!valid}
          onClick={() => mutation.mutate()}
          className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white disabled:opacity-50"
        >
          {mutation.isPending
            ? "Scheduling…"
            : mode === "single"
            ? "Schedule day"
            : "Schedule range"}
        </button>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-1 border-b border-border">
          <ModeButton active={mode === "single"} onClick={() => setMode("single")}>
            Single day
          </ModeButton>
          <ModeButton active={mode === "week"} onClick={() => setMode("week")}>
            Date range
          </ModeButton>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Batch"
            value={batchId}
            onChange={setBatchId}
            options={batches.data?.items.map((item) => ({ value: item.id, label: item.name })) ?? []}
          />
          <SelectField
            label="Default teacher"
            value={teacherId}
            onChange={setTeacherId}
            options={
              teachers.data?.items.map((item) => ({
                value: item.teacher.id,
                label: item.teacher.display_name,
              })) ?? []
            }
            empty="Unassigned"
          />
          <DateField
            label={mode === "single" ? "Date" : "Starts"}
            value={date}
            onChange={(value) => {
              setDate(value);
              if (!options) return;
              setOptions(
                options.map((item) => ({
                  ...item,
                  startsAt: replaceDate(item.startsAt, value),
                  endsAt: replaceDate(item.endsAt, value),
                }))
              );
            }}
          />
          {mode === "week" ? (
            <DateField label="Ends" value={endDate} onChange={setEndDate} />
          ) : null}
        </div>

        {mode === "week" ? (
          <div>
            <p className="mb-1 text-[11px] font-medium text-muted">Days</p>
            <div className="flex flex-wrap gap-1">
              {[
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    setWeekdays(
                      weekdays.includes(day)
                        ? weekdays.filter((item) => item !== day)
                        : [...weekdays, day]
                    )
                  }
                  className={`h-7 rounded-md px-2 text-xs font-medium ${
                    weekdays.includes(day)
                      ? "bg-brand/10 text-primary"
                      : "text-muted hover:bg-surface-subtle"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">Sessions</p>
            <button
              type="button"
              disabled={rows.length >= 8}
              onClick={() =>
                setOptions([
                  ...rows,
                  {
                    displayLabel: `Session ${rows.length + 1}`,
                    startsAt: localDateTime(date, "18:00"),
                    endsAt: localDateTime(date, "19:00"),
                    capacity: null,
                  },
                ])
              }
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-subtle"
            >
              <Plus className="h-3.5 w-3.5" />
              Add session
            </button>
          </div>

          {rows.map((row, index) => (
            <div
              key={`${row.displayLabel}-${index}`}
              className="grid gap-2 rounded-md bg-surface-subtle/65 p-2 sm:grid-cols-[1fr_8.5rem_8.5rem_8rem_5rem_auto]"
            >
              <Input
                value={row.displayLabel}
                onChange={(value) => updateOption(index, { displayLabel: value })}
                placeholder="Label"
              />
              <Input
                type="datetime-local"
                value={toLocalInput(row.startsAt)}
                onChange={(value) => updateOption(index, { startsAt: new Date(value).toISOString() })}
              />
              <Input
                type="datetime-local"
                value={toLocalInput(row.endsAt)}
                onChange={(value) => updateOption(index, { endsAt: new Date(value).toISOString() })}
              />

              <FilterSelect
                value={row.teacherId ?? ""}
                onChange={(val) => updateOption(index, { teacherId: val || null })}
                options={
                  teachers.data?.items.map((item) => ({
                    value: item.teacher.id,
                    label: item.teacher.display_name,
                  })) ?? []
                }
                allLabel="Default teacher"
                className="w-full"
                triggerClassName="h-8 text-xs w-full"
              />

              <Input
                type="number"
                value={row.capacity ? String(row.capacity) : ""}
                onChange={(value) => updateOption(index, { capacity: value ? Number(value) : null })}
                placeholder="Cap."
              />

              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setOptions(rows.filter((_, rowIndex) => rowIndex !== index))}
                  className="h-8 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {mutation.isError ? (
          <p className="text-xs text-danger">
            Could not schedule this batch. Check time overlaps and try again.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function BulkCancelModal({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [batchId, setBatchId] = useState("");
  const [startsFrom, setStartsFrom] = useState(tomorrow());
  const [startsTo, setStartsTo] = useState(weekEnd());
  const [reason, setReason] = useState("");

  const batches = useQuery({
    queryKey: ["admin", "batch-groups", "cancel-modal"],
    queryFn: () => listAdminBatchGroups({ isActive: true, pageSize: 100 }),
  });

  const cancel = useMutation({
    mutationFn: () =>
      cancelAdminBatchScheduleDaysBulk({
        batchGroupId: batchId,
        startsFrom,
        startsTo,
        reason,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin", "batch-schedule-days"] });
      onClose();
    },
  });

  return (
    <Modal
      title="Bulk cancel schedule days"
      isOpen
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!batchId || !startsFrom || !startsTo || cancel.isPending}
          onClick={() => cancel.mutate()}
          className="h-8 rounded-md bg-danger px-3 text-xs font-medium text-white disabled:opacity-50"
        >
          Cancel date range
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">
          Cancelling a range will mark all scheduled days for this batch cancelled and notify/cancel student bookings.
        </p>

        <SelectField
          label="Batch group"
          value={batchId}
          onChange={setBatchId}
          options={batches.data?.items.map((b) => ({ value: b.id, label: b.name })) ?? []}
        />

        <div className="grid grid-cols-2 gap-2">
          <DateField label="Starts from" value={startsFrom} onChange={setStartsFrom} />
          <DateField label="Starts to" value={startsTo} onChange={setStartsTo} />
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">Reason</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Center maintenance week"
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-primary"
          />
        </label>

        {cancel.isError ? (
          <p className="text-xs text-danger">Failed to cancel range. One or more dates may be invalid or past.</p>
        ) : null}
      </div>
    </Modal>
  );
}

function ScheduleDefaultsModal({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const defaults = useQuery({
    queryKey: ["admin", "batch-schedule-defaults"],
    queryFn: getAdminBatchScheduleDefaults,
  });

  const teachers = useQuery({
    queryKey: ["admin", "teachers", "schedule"],
    queryFn: () => listAdminTeachers({ isActive: true, pageSize: 100 }),
  });

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<BatchScheduleDefaultsRead["option_templates"] | null>(
    null
  );

  const rows = templates ?? defaults.data?.option_templates ?? [];

  const save = useMutation({
    mutationFn: () =>
      updateAdminBatchScheduleDefaults({
        defaultTeacherId: teacherId ?? defaults.data?.default_teacher_id ?? null,
        optionTemplates: rows,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin", "batch-schedule-defaults"] });
      onClose();
    },
  });

  const update = (
    index: number,
    changes: Partial<BatchScheduleDefaultsRead["option_templates"][number]>
  ) =>
    setTemplates(
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...changes } : row))
    );

  return (
    <Modal
      title="Schedule defaults"
      size="md"
      isOpen
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={save.isPending || !rows.length}
          onClick={() => save.mutate()}
          className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white disabled:opacity-50"
        >
          Save defaults
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">
          Defaults are stored in UTC. They are displayed in your browser’s local time when scheduling.
        </p>

        <SelectField
          label="Default teacher"
          value={teacherId ?? defaults.data?.default_teacher_id ?? ""}
          onChange={(value) => setTeacherId(value || null)}
          options={
            teachers.data?.items.map((item) => ({
              value: item.teacher.id,
              label: item.teacher.display_name,
            })) ?? []
          }
          empty="Unassigned"
        />

        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={`${row.display_label}-${index}`}
              className="grid grid-cols-[1fr_7rem_5rem_auto] gap-2 rounded-md bg-surface-subtle/65 p-2"
            >
              <Input
                value={row.display_label}
                onChange={(value) => update(index, { display_label: value })}
              />
              <Input
                type="time"
                value={row.start_time_utc.slice(0, 5)}
                onChange={(value) => update(index, { start_time_utc: `${value}:00` })}
              />
              <Input
                type="number"
                value={String(row.duration_minutes)}
                onChange={(value) => update(index, { duration_minutes: Number(value) })}
                placeholder="Mins"
              />
              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setTemplates(rows.filter((_, rowIndex) => rowIndex !== index))}
                  className="h-8 rounded-md px-2 text-xs text-muted hover:bg-surface"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}

          <button
            type="button"
            disabled={rows.length >= 8}
            onClick={() =>
              setTemplates([
                ...rows,
                {
                  display_label: `Session ${rows.length + 1}`,
                  start_time_utc: "18:00:00",
                  duration_minutes: 60,
                  teacher_id: null,
                  capacity: null,
                },
              ])
            }
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-subtle"
          >
            <Plus className="h-3.5 w-3.5" />
            Add session
          </button>
        </div>

        {save.isError ? <p className="text-xs text-danger">Defaults could not be saved.</p> : null}
      </div>
    </Modal>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-8 px-2 text-xs font-medium ${
        active ? "text-primary" : "text-muted"
      }`}
    >
      {children}
      {active ? <span className="absolute inset-x-2 bottom-0 h-0.5 bg-brand" /> : null}
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  empty,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  empty?: string;
}) {
  return (
    <FilterSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      allLabel={empty ?? "Choose"}
      className="w-full"
      triggerClassName="w-full"
    />
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-primary"
      />
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const isSessionTime = type === "datetime-local";
  return (
    <input
      type={isSessionTime ? "time" : type}
      value={isSessionTime ? value.slice(11) : value}
      placeholder={placeholder}
      onChange={(event) =>
        onChange(isSessionTime ? `${value.slice(0, 10)}T${event.target.value}` : event.target.value)
      }
      className="h-8 min-w-0 rounded-md border border-border bg-surface px-2 text-xs text-primary"
    />
  );
}

function DayStatus({ status }: { status: string }) {
  return (
    <StatusBadge tone={status === "cancelled" ? "rose" : status === "completed" ? "green" : "indigo"}>
      {status[0].toUpperCase() + status.slice(1)}
    </StatusBadge>
  );
}

function dateWindow(range: string) {
  if (range === "all") return {};
  const now = new Date();
  const startsFrom = now.toISOString().slice(0, 10);
  if (range === "week") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return { startsFrom, startsTo: end.toISOString().slice(0, 10) };
  }
  return { startsFrom };
}

function tomorrow() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
}

function weekEnd() {
  const value = new Date();
  value.setDate(value.getDate() + 7);
  return value.toISOString().slice(0, 10);
}

function optionFromDefault(
  date: string,
  item: {
    display_label: string;
    start_time_utc: string;
    duration_minutes: number;
    teacher_id: string | null;
    capacity: number | null;
  }
): BatchDayOptionInput {
  const start = `${date}T${item.start_time_utc}`;
  const startsAt = new Date(start.endsWith("Z") ? start : `${start}Z`);
  return {
    displayLabel: item.display_label,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + item.duration_minutes * 60_000).toISOString(),
    teacherId: item.teacher_id,
    capacity: item.capacity,
  };
}

function localDateTime(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

function toLocalInput(iso: string) {
  const value = new Date(iso);
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function replaceDate(iso: string, date: string) {
  const current = toLocalInput(iso).slice(11);
  return new Date(`${date}T${current}`).toISOString();
}

function formatUtcDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`)
  );
}
