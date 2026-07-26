import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowUpRight, CalendarDays, Plus, X } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";

import { DebouncedSearchInput } from "@/components/ui/DebouncedSearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AdminDetailPanel } from "@/features/admin/AdminDetailPrimitives";
import {
  addAdminBatchGroupStudent,
  getAdminBatchGroup,
  listAdminBatchScheduleDays,
  listAdminPackages,
  listAdminStudents,
  removeAdminBatchGroupStudent,
  updateAdminBatchGroup,
  voidAdminBatchGroup,
  type AdminStudentRead,
} from "@/features/admin/api";
import { cn } from "@/lib/utils";

type Tab = "overview" | "students" | "schedule";
const tabs: Array<{ value: Tab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "students", label: "Students" },
  { value: "schedule", label: "Batch schedule" },
];

export function AdminBatchDetailPage() {
  const { batchGroupId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [edit, setEdit] = useState(false);
  const [add, setAdd] = useState(false);
  const tab = (params.get("tab") as Tab) || "overview";
  const client = useQueryClient();

  const batch = useQuery({
    queryKey: ["admin", "batch-group", batchGroupId],
    queryFn: () => getAdminBatchGroup(batchGroupId),
    enabled: Boolean(batchGroupId),
  });

  const students = useQuery({
    queryKey: ["admin", "students", "batch", batchGroupId],
    queryFn: () => listAdminStudents({ batchGroupId, pageSize: 50 }),
    enabled: Boolean(batchGroupId) && tab === "students",
  });

  const days = useQuery({
    queryKey: ["admin", "batch-schedule-days", "batch", batchGroupId],
    queryFn: () => listAdminBatchScheduleDays({ batchGroupId, pageSize: 50 }),
    enabled: Boolean(batchGroupId),
  });

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["admin", "batch-group", batchGroupId] });
    void client.invalidateQueries({ queryKey: ["admin", "students", "batch", batchGroupId] });
    void client.invalidateQueries({ queryKey: ["admin", "batch-schedule-days"] });
  };

  const choose = (next: Tab) => {
    const updated = new URLSearchParams(params);
    if (next === "overview") updated.delete("tab");
    else updated.set("tab", next);
    setParams(updated);
  };

  if (batch.isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-8 w-24 animate-pulse rounded-md bg-surface-subtle" />
        <div className="h-16 animate-pulse rounded-md bg-surface-subtle" />
      </section>
    );
  }

  if (batch.isError || !batch.data) {
    return (
      <section className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
        Batch could not be loaded.
      </section>
    );
  }

  const data = batch.data;

  return (
    <section className="space-y-4">
      <Link
        to="/admin/programs"
        className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-subtle hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Batches
      </Link>

      <header className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold leading-tight text-primary">{data.name}</h1>
            <StatusBadge tone={data.is_active ? "green" : "rose"}>
              {data.is_active ? "Active" : "Voided"}
            </StatusBadge>
          </div>
          <p className="mt-1 text-xs text-muted">
            {data.package?.name ?? "Package not configured"} · Capacity: {data.default_capacity}
          </p>
        </div>

        {data.is_active ? (
          <button
            type="button"
            onClick={() => setEdit(true)}
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary hover:bg-surface-subtle"
          >
            Edit batch
          </button>
        ) : null}
      </header>

      <BatchScheduleFollowUp
        batch={data}
        days={days.data?.items ?? []}
        isLoading={days.isLoading}
        onOpenSchedule={() => choose("schedule")}
      />

      <div className="-mt-2 grid gap-x-4 gap-y-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0 space-y-4">
          <nav className="flex gap-1 border-b border-border">
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => choose(item.value)}
                className={cn(
                  "relative h-9 px-3 text-xs font-medium transition-colors",
                  tab === item.value ? "text-primary" : "text-muted hover:text-primary"
                )}
              >
                {item.label}
                {tab === item.value ? (
                  <span className="absolute inset-x-2 bottom-[-1px] h-0.5 bg-brand" />
                ) : null}
              </button>
            ))}
          </nav>

          {tab === "overview" ? (
            <>
              <AdminDetailPanel title="Batch briefing">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Detail label="Package" value={data.package?.name ?? "Not configured"} />
                  <Detail label="Capacity" value={`${data.default_capacity} students`} />
                  <Detail label="Active learners" value={String(data.active_member_count ?? 0)} />
                </div>
              </AdminDetailPanel>

              <AdminDetailPanel title="Notes & Guidelines">
                <p className="text-xs text-muted leading-relaxed">{data.notes || "No notes added for this batch."}</p>
              </AdminDetailPanel>
            </>
          ) : null}

          {tab === "students" ? (
            <AdminDetailPanel title={`Enrolled Students (${students.data?.total ?? 0})`}>
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAdd(true)}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary hover:bg-surface-subtle"
                >
                  <Plus className="h-3.5 w-3.5 text-muted" />
                  Add student
                </button>
              </div>

              <div className="space-y-2">
                {students.data?.items.map((studentItem) => (
                  <StudentRow
                    key={studentItem.student.id}
                    batchId={data.id}
                    studentItem={studentItem}
                    onChanged={refresh}
                  />
                ))}

                {students.isLoading ? (
                  <p className="text-xs text-muted">Loading batch students…</p>
                ) : null}

                {!students.isLoading && !students.data?.items.length ? (
                  <p className="text-xs text-muted">No students currently enrolled in this batch.</p>
                ) : null}
              </div>
            </AdminDetailPanel>
          ) : null}

          {tab === "schedule" ? (
            <AdminDetailPanel title={`Batch Schedule (${days.data?.total ?? 0} days)`}>
              <div className="space-y-2">
                {days.data?.items.map((day) => (
                  <Link
                    key={day.id}
                    to={`/admin/schedule/batch-days/${day.id}`}
                    className="flex items-center justify-between rounded-md border border-border/40 bg-surface-subtle/65 px-3 py-2.5 transition hover:bg-surface-subtle"
                  >
                    <div>
                      <span className="block text-xs font-medium text-primary">
                        {formatDate(day.schedule_date)}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        {day.options.length} options · {day.unassigned_students.length} unassigned
                      </span>
                    </div>

                    <StatusBadge tone={day.status === "cancelled" ? "rose" : day.status === "completed" ? "green" : "indigo"}>
                      {day.status}
                    </StatusBadge>
                  </Link>
                ))}

                {days.isLoading ? (
                  <p className="text-xs text-muted">Loading scheduled days…</p>
                ) : null}

                {!days.isLoading && !days.data?.items.length ? (
                  <p className="text-xs text-muted">No scheduled batch days yet. Create schedule days from Schedule workspace.</p>
                ) : null}
              </div>
            </AdminDetailPanel>
          ) : null}
        </main>

        <aside className="space-y-3">
          <AdminDetailPanel title="Summary">
            <div className="space-y-3">
              <Detail label="Package" value={data.package?.name ?? "Not configured"} />
              <Detail label="Status" value={data.is_active ? "Active" : "Voided"} />
              <Detail label="Default Capacity" value={`${data.default_capacity} students`} />
              <Detail label="Upcoming Days" value={String(data.upcoming_scheduled_count ?? 0)} />
            </div>
          </AdminDetailPanel>
        </aside>
      </div>

      {edit ? <EditBatch batch={data} onClose={() => setEdit(false)} onChanged={refresh} /> : null}
      {add ? <AddStudent batchId={data.id} onClose={() => setAdd(false)} onChanged={refresh} /> : null}
    </section>
  );
}

function BatchScheduleFollowUp({
  batch,
  days,
  isLoading,
  onOpenSchedule,
}: {
  batch: { upcoming_scheduled_count?: number | null };
  days: Awaited<ReturnType<typeof listAdminBatchScheduleDays>>["items"];
  isLoading: boolean;
  onOpenSchedule: () => void;
}) {
  if (isLoading) return null;
  const unassignedDay = days.find((day) => day.unassigned_students.length > 0);
  const unassignedCount = days.reduce((count, day) => count + day.unassigned_students.length, 0);
  const hasNoUpcomingDays = (batch.upcoming_scheduled_count ?? 0) === 0;
  if (!hasNoUpcomingDays && !unassignedDay) return null;

  return (
    <section className="space-y-2 rounded-md border border-warning/35 bg-warning/5 px-3 py-2.5">
      {hasNoUpcomingDays ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5"><CalendarDays className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" /><div><p className="text-xs font-semibold text-primary">No upcoming batch days</p><p className="mt-0.5 text-xs text-muted">Schedule the next learning sessions for this batch.</p></div></div>
          <button type="button" onClick={onOpenSchedule} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-brand px-2.5 text-xs font-medium text-white transition hover:opacity-90">Open schedule <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
        </div>
      ) : null}
      {unassignedDay ? (
        <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", hasNoUpcomingDays && "border-t border-warning/30 pt-2")}>
          <div className="flex min-w-0 items-center gap-2.5"><AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" /><div><p className="text-xs font-semibold text-primary">{unassignedCount} {unassignedCount === 1 ? "student needs" : "students need"} a session</p><p className="mt-0.5 text-xs text-muted">Assign students to a session option before the batch day starts.</p></div></div>
          <Link to={`/admin/schedule/batch-days/${unassignedDay.id}`} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-brand px-2.5 text-xs font-medium text-white transition hover:opacity-90">Assign students <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </div>
      ) : null}
    </section>
  );
}

function StudentRow({
  batchId,
  studentItem,
  onChanged,
}: {
  batchId: string;
  studentItem: AdminStudentRead;
  onChanged: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const remove = useMutation({
    mutationFn: () =>
      removeAdminBatchGroupStudent({
        batchGroupId: batchId,
        studentId: studentItem.student.id,
        reason: "Removed by admin",
      }),
    onSuccess: () => {
      onChanged();
      setConfirm(false);
    },
  });

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-surface-subtle/65 px-3 py-2">
      <div className="min-w-0">
        <Link
          to={`/admin/students/${studentItem.student.id}`}
          className="truncate text-xs font-medium text-primary hover:underline hover:text-brand"
        >
          {studentItem.user.full_name}
        </Link>
        <p className="truncate text-[11px] text-muted">
          {studentItem.user.email} {studentItem.user.phone ? `· ${studentItem.user.phone}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge tone={studentItem.student.status === "active" ? "green" : "rose"}>
          {studentItem.student.status}
        </StatusBadge>

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
              className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="h-7 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface hover:text-danger"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function AddStudent({
  batchId,
  onClose,
  onChanged,
}: {
  batchId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");

  const students = useQuery({
    queryKey: ["admin", "students", "batch-add", q],
    queryFn: () => listAdminStudents({ q, status: "active", pageSize: 10 }),
    enabled: q.length >= 2,
  });

  const add = useMutation({
    mutationFn: (studentId: string) =>
      addAdminBatchGroupStudent({
        batchGroupId: batchId,
        studentId,
        allowPackageAccessOverride: override,
        reason,
      }),
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  return (
    <Modal title="Add student to batch" isOpen onClose={onClose}>
      <div className="space-y-3">
        <DebouncedSearchInput value={q} onChange={setQ} placeholder="Search active students by name or email…" />

        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={override}
            onChange={(event) => setOverride(event.target.checked)}
            className="rounded border-border text-brand focus:ring-brand"
          />
          Override package access requirement
        </label>

        {override ? (
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for package access override"
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-primary"
          />
        ) : null}

        <div className="space-y-1.5 pt-1">
          {students.data?.items.map((item) => (
            <button
              key={item.student.id}
              type="button"
              disabled={add.isPending || (override && !reason.trim())}
              onClick={() => add.mutate(item.student.id)}
              className="flex w-full items-center justify-between rounded-md border border-border/40 bg-surface-subtle/65 px-3 py-2 text-left hover:bg-surface-subtle disabled:opacity-50"
            >
              <div>
                <span className="block text-xs font-medium text-primary">{item.user.full_name}</span>
                <span className="block text-[11px] text-muted">{item.user.email}</span>
              </div>
              <Plus className="h-3.5 w-3.5 text-muted" />
            </button>
          ))}

          {q.length >= 2 && !students.isLoading && !students.data?.items.length ? (
            <p className="text-xs text-muted">No active students matching search.</p>
          ) : null}
        </div>

        {add.isError ? (
          <p className="text-xs text-danger">
            Student could not be added. They may lack access to this batch's linked package.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function EditBatch({
  batch,
  onClose,
  onChanged,
}: {
  batch: Awaited<ReturnType<typeof getAdminBatchGroup>>;
  onClose: () => void;
  onDone?: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState(batch.name);
  const [notes, setNotes] = useState(batch.notes ?? "");
  const [capacity, setCapacity] = useState(String(batch.default_capacity));
  const [packageId, setPackageId] = useState(batch.package_id ?? "");

  const packages = useQuery({
    queryKey: ["admin", "packages", "batch-edit"],
    queryFn: () => listAdminPackages({ isActive: true, pageSize: 100 }),
  });

  const save = useMutation({
    mutationFn: () =>
      updateAdminBatchGroup({
        batchGroupId: batch.id,
        payload: { name, notes, defaultCapacity: Number(capacity), packageId },
      }),
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  const voidBatch = useMutation({
    mutationFn: () => voidAdminBatchGroup(batch.id),
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  return (
    <Modal
      title="Edit batch details"
      isOpen
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            disabled={!batch.is_active || voidBatch.isPending}
            onClick={() => voidBatch.mutate()}
            className="h-8 px-2 text-xs font-medium text-danger hover:bg-surface-subtle rounded-md"
          >
            Void batch
          </button>
          <button
            type="button"
            disabled={!name.trim() || !packageId || save.isPending}
            onClick={() => save.mutate()}
            className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white disabled:opacity-50"
          >
            Save changes
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">Batch name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">Default capacity</span>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-primary"
          />
        </label>

        <FilterSelect
          label="Linked package"
          value={packageId}
          onChange={setPackageId}
          options={
            packages.data?.items.map((item) => ({
              value: item.id,
              label: item.name,
            })) ?? []
          }
          allLabel="Select package…"
          className="w-full"
          triggerClassName="w-full"
        />

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-20 w-full rounded-md border border-border bg-surface p-2 text-xs text-primary"
          />
        </label>

        {save.isError ? <p className="text-xs text-danger">Failed to update batch details.</p> : null}
      </div>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
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
