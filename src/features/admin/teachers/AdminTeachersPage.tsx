import { type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { CopyIconButton } from "@/components/ui/CopyIconButton";
import { DataCardGrid } from "@/components/ui/DataCardGrid";
import { DataTable } from "@/components/ui/DataTable";
import { DataViewToggle, type DataViewMode } from "@/components/ui/DataViewToggle";
import { DebouncedSearchInput } from "@/components/ui/DebouncedSearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TablePagination } from "@/components/ui/TablePagination";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdminCompactToggle as CompactToggle } from "@/features/admin/AdminDetailPrimitives";
import {
  createAdminTeacher,
  createAdminTeacherAvailabilityRule,
  getAdminTeacher,
  listAdminClassSessions,
  listAdminTeachers,
  type AdminTeacherRead,
  type DayOfWeek,
} from "@/features/admin/api";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatDateTime,
  getErrorMessage,
  localRuleToUtc,
  weekdays,
} from "./teacher-utils";

const PAGE_SIZE = 25;
type CreateStep = "profile" | "availability";
type TeacherSort =
  | "created_at:desc"
  | "created_at:asc"
  | "name:asc"
  | "name:desc"
  | "display_name:asc"
  | "display_name:desc";
type RuleDraft = { id: string; day: DayOfWeek; start: string; end: string; duration: string };
const columnHelper = createColumnHelper<AdminTeacherRead>();

const sortOptions: Array<{ value: TeacherSort; label: string }> = [
  { value: "created_at:desc", label: "Newest" },
  { value: "created_at:asc", label: "Oldest" },
  { value: "name:asc", label: "Name A-Z" },
  { value: "name:desc", label: "Name Z-A" },
  { value: "display_name:asc", label: "Display name A-Z" },
  { value: "display_name:desc", label: "Display name Z-A" },
];

export function AdminTeachersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const filters = getFilters(searchParams);
  const selectedTeacherId = searchParams.get("teacher");
  const step = parseCreateStep(searchParams.get("create"));
  const onboardingTeacherId = searchParams.get("onboard");
  const view = searchParams.get("view") === "cards" ? "cards" : "table";
  const now = useMemo(() => new Date().toISOString(), []);

  const teachersQuery = useQuery({
    queryKey: ["admin", "teachers", filters],
    queryFn: () => listAdminTeachers(filters),
  });
  const teacherQuery = useQuery({
    queryKey: ["admin", "teachers", selectedTeacherId],
    queryFn: () => getAdminTeacher(selectedTeacherId ?? ""),
    enabled: Boolean(selectedTeacherId),
  });
  const upcomingClassesQuery = useQuery({
    queryKey: ["admin", "teachers", selectedTeacherId, "upcoming", now],
    queryFn: () =>
      listAdminClassSessions({ teacherId: selectedTeacherId ?? "", startsFrom: now, pageSize: 3 }),
    enabled: Boolean(selectedTeacherId),
  });
  const recentClassesQuery = useQuery({
    queryKey: ["admin", "teachers", selectedTeacherId, "recent", now],
    queryFn: () =>
      listAdminClassSessions({
        teacherId: selectedTeacherId ?? "",
        startsTo: now,
        sortOrder: "desc",
        pageSize: 3,
      }),
    enabled: Boolean(selectedTeacherId),
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.teacher.display_name, {
        id: "teacher",
        header: "Teacher",
        cell: ({ row }) => (
          <div className="min-w-44">
            <p className="truncate text-sm font-medium text-primary">
              {row.original.teacher.display_name}
            </p>
            <p className="mt-1 truncate text-xs text-muted">{row.original.user.email}</p>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.user.phone, {
        id: "phone",
        header: "Phone",
        cell: ({ getValue }) => (
          <QuietLabel tone={getValue() ? "default" : "muted"}>{getValue() ?? "-"}</QuietLabel>
        ),
      }),
      columnHelper.accessor((row) => row.teacher.is_active, {
        id: "status",
        header: "Status",
        cell: ({ getValue }) => <TeacherStatus value={getValue()} />,
      }),
      columnHelper.accessor((row) => row.user.is_active, {
        id: "account",
        header: "Account",
        cell: ({ getValue }) => (
          <QuietLabel tone={getValue() ? "default" : "danger"}>
            {getValue() ? "Enabled" : "Disabled"}
          </QuietLabel>
        ),
      }),
      columnHelper.accessor((row) => row.teacher.created_at, {
        id: "created",
        header: "Created",
        cell: ({ getValue }) => <QuietLabel>{formatDate(getValue())}</QuietLabel>,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Link
            to={`/admin/teachers/${row.original.teacher.id}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"
          >
            Open <ExternalLink className="h-3 w-3" />
          </Link>
        ),
      }),
    ],
    [],
  );
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: teachersQuery.data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function update(updates: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setSearchParams(next, { replace });
  }
  function updateSearch(q: string) {
    update({ q: q || null, page: null }, true);
  }
  function updateFilter(key: string, value: string) {
    update({ [key]: value || null, page: null });
  }
  function updateSort(value: string) {
    const [sortBy, sortOrder] = value.split(":");
    update({
      sort_by: value === "created_at:desc" ? null : sortBy,
      sort_order: value === "created_at:desc" ? null : sortOrder,
      page: null,
    });
  }
  const hasFilters = Boolean(
    filters.q ||
    filters.isActive !== undefined ||
    filters.accountIsActive !== undefined ||
    `${filters.sortBy}:${filters.sortOrder}` !== "created_at:desc",
  );
  const totalPages = Math.max(1, Math.ceil((teachersQuery.data?.total ?? 0) / PAGE_SIZE));

  return (
    <section className="space-y-5">
      <PageHeader
        title="Teachers"
        actions={
          <button
            type="button"
            onClick={() => update({ create: "profile", onboard: null, teacher: null })}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-2.5 text-xs font-medium text-white transition hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add teacher
          </button>
        }
      />
      <div className="space-y-3">
        <DebouncedSearchInput
          key={filters.q}
          value={filters.q}
          onChange={updateSearch}
          placeholder="Search name, phone, email"
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Sort"
            value={`${filters.sortBy}:${filters.sortOrder}`}
            options={sortOptions}
            includeAll={false}
            onChange={updateSort}
          />
          <FilterSelect
            label="Status"
            value={filters.isActive === undefined ? "" : String(filters.isActive)}
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Paused" },
            ]}
            onChange={(value) => updateFilter("status", value)}
          />
          <FilterSelect
            label="Account"
            value={filters.accountIsActive === undefined ? "" : String(filters.accountIsActive)}
            options={[
              { value: "true", label: "Enabled" },
              { value: "false", label: "Disabled" },
            ]}
            onChange={(value) => updateFilter("account", value)}
          />
          {hasFilters ? (
            <button
              type="button"
              className="h-8 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-subtle"
              onClick={() =>
                update({
                  q: null,
                  status: null,
                  account: null,
                  sort_by: null,
                  sort_order: null,
                  page: null,
                })
              }
            >
              Clear
            </button>
          ) : null}
          <DataViewToggle
            value={view}
            onChange={(next: DataViewMode) => update({ view: next === "cards" ? "cards" : null })}
            className="sm:ml-auto"
          />
        </div>
      </div>
      {view === "table" ? (
        <DataTable
          table={table}
          isLoading={teachersQuery.isLoading}
          isError={teachersQuery.isError}
          emptyMessage={hasFilters ? "No teachers match these filters" : "No teachers yet"}
          errorMessage="Teachers could not be loaded."
          onRetry={() => void teachersQuery.refetch()}
          onRowClick={(row) => update({ teacher: row.original.teacher.id })}
        />
      ) : (
        <DataCardGrid
          items={teachersQuery.data?.items ?? []}
          getKey={(teacher) => teacher.teacher.id}
          isLoading={teachersQuery.isLoading}
          isError={teachersQuery.isError}
          emptyMessage={hasFilters ? "No teachers match these filters" : "No teachers yet"}
          errorMessage="Teachers could not be loaded."
          onRetry={() => void teachersQuery.refetch()}
          className="justify-start [grid-template-columns:repeat(auto-fill,minmax(15rem,16rem))]"
          renderCard={(teacher) => (
            <TeacherCard
              teacher={teacher}
              onSelect={() => update({ teacher: teacher.teacher.id })}
              onOpen={() => navigate(`/admin/teachers/${teacher.teacher.id}`)}
            />
          )}
        />
      )}
      <TablePagination
        page={filters.page}
        totalPages={totalPages}
        total={teachersQuery.data?.total ?? 0}
        itemLabel="teachers"
        onPageChange={(page) => update({ page: page > 1 ? String(page) : null })}
      />
      <TeacherDrawer
        teacher={teacherQuery.data}
        open={Boolean(selectedTeacherId)}
        loading={teacherQuery.isLoading}
        error={teacherQuery.isError}
        upcoming={upcomingClassesQuery.data?.items ?? []}
        recent={recentClassesQuery.data?.items ?? []}
        onClose={() => update({ teacher: null }, true)}
        onOpen={() => selectedTeacherId && navigate(`/admin/teachers/${selectedTeacherId}`)}
      />
      <CreateTeacherModal
        step={step}
        onboardingTeacherId={onboardingTeacherId}
        open={Boolean(step)}
        onClose={() => update({ create: null, onboard: null }, true)}
        onStep={(next, id) => update({ create: next, onboard: id ?? onboardingTeacherId })}
        onFinished={(id) => navigate(`/admin/teachers/${id}?tab=availability`)}
      />
    </section>
  );
}

function TeacherCard({
  teacher,
  onSelect,
  onOpen,
}: {
  teacher: AdminTeacherRead;
  onSelect: () => void;
  onOpen: () => void;
}) {
  return (
    <article
      className="min-h-48 rounded-md border border-border bg-surface p-3 transition hover:border-border-strong"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-primary">
            {teacher.teacher.display_name}
          </p>
          <p className="mt-1 truncate text-xs text-muted">{teacher.user.email}</p>
        </div>
        <TeacherStatus value={teacher.teacher.is_active} />
      </div>
      <div className="mt-5 space-y-1.5 text-xs">
        <p className="truncate text-muted">{teacher.user.phone ?? "No phone"}</p>
        <p className={cn(teacher.user.is_active ? "text-muted" : "text-danger")}>
          {teacher.user.is_active ? "Account enabled" : "Account disabled"}
        </p>
        <p className="text-muted">Added {formatDate(teacher.teacher.created_at)}</p>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="mt-5 inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-subtle hover:text-primary"
      >
        Open <ExternalLink className="h-3 w-3" />
      </button>
    </article>
  );
}

function TeacherDrawer({
  teacher,
  open,
  loading,
  error,
  upcoming,
  recent,
  onClose,
  onOpen,
}: {
  teacher?: AdminTeacherRead;
  open: boolean;
  loading: boolean;
  error: boolean;
  upcoming: Array<{ id: string; starts_at: string; program_type: "one_on_one" | "batch" }>;
  recent: Array<{ id: string; starts_at: string; program_type: "one_on_one" | "batch" }>;
  onClose: () => void;
  onOpen: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-primary/15"
        onClick={onClose}
        aria-label="Close teacher snapshot"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold leading-tight text-primary">
              {teacher?.teacher.display_name ?? "Teacher"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary"
            aria-label="Close teacher snapshot"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-md bg-surface-subtle" />
              ))}
            </div>
          ) : null}
          {error ? (
            <p className="text-sm font-medium text-danger">Teacher snapshot could not be loaded.</p>
          ) : null}
          {teacher ? (
            <div className="space-y-4">
              <TeacherSnapshotSection title="Contact" divider={false}>
                <div className="space-y-2">
                  <TeacherCopyableValue label="Email" value={teacher.user.email} />
                  <TeacherCopyableValue
                    label="Phone"
                    value={teacher.user.phone}
                    emptyLabel="No phone"
                  />
                </div>
              </TeacherSnapshotSection>

              <TeacherSnapshotSection title="Teacher">
                <div className="grid grid-cols-2 gap-3">
                  <TeacherFieldValue
                    label="Profile"
                    value={teacher.teacher.is_active ? "Active" : "Paused"}
                    tone={teacher.teacher.is_active ? "default" : "danger"}
                  />
                  <TeacherFieldValue
                    label="Account"
                    value={teacher.user.is_active ? "Enabled" : "Disabled"}
                    tone={teacher.user.is_active ? "default" : "danger"}
                  />
                  <TeacherFieldValue label="Full name" value={teacher.user.full_name} />
                  <TeacherFieldValue
                    label="Joined"
                    value={formatDate(teacher.teacher.created_at)}
                  />
                </div>
              </TeacherSnapshotSection>

              <TeacherSnapshotSection title="Profile">
                <p className="whitespace-pre-wrap text-sm text-primary">
                  {teacher.teacher.bio || "No bio added"}
                </p>
              </TeacherSnapshotSection>

              <TeacherSnapshotSection title="Upcoming classes">
                <TeacherClassPreviewList rows={upcoming} emptyLabel="No upcoming classes" />
              </TeacherSnapshotSection>

              <TeacherSnapshotSection title="Recent classes">
                <TeacherClassPreviewList rows={recent} emptyLabel="No recent classes" />
              </TeacherSnapshotSection>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white transition hover:opacity-90"
            onClick={onOpen}
          >
            Open teacher page
          </button>
        </div>
      </aside>
    </div>
  );
}

function TeacherCopyableValue({
  label,
  value,
  emptyLabel = "-",
}: {
  label: string;
  value: string | null;
  emptyLabel?: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted">{label}</p>
        <p className="truncate text-sm font-medium text-primary">{value ?? emptyLabel}</p>
      </div>
      {value ? <CopyIconButton value={value} label={label.toLowerCase()} /> : null}
    </div>
  );
}

function TeacherFieldValue({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-medium",
          tone === "default" ? "text-primary" : "text-danger",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TeacherSnapshotSection({
  title,
  children,
  divider = true,
}: {
  title: string;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <section className={cn(divider ? "border-t border-border pt-4" : "")}>
      <h3 className="text-xs font-medium text-muted">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function TeacherClassPreviewList({
  rows,
  emptyLabel,
}: {
  rows: Array<{ id: string; starts_at: string; program_type: "one_on_one" | "batch" }>;
  emptyLabel: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted">{emptyLabel}</p>;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center justify-between gap-3 rounded-md bg-surface-subtle/65 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">{formatDate(row.starts_at)}</p>
            <p className="mt-1 text-xs text-muted">{formatDateTime(row.starts_at)}</p>
          </div>
          <QuietLabel>{row.program_type === "one_on_one" ? "1-on-1" : "Batch"}</QuietLabel>
        </div>
      ))}
    </div>
  );
}

function TeacherStatus({ value }: { value: boolean }) {
  return <StatusBadge tone={value ? "green" : "amber"}>{value ? "Active" : "Paused"}</StatusBadge>;
}

function CreateTeacherModal({
  step,
  onboardingTeacherId,
  open,
  onClose,
  onStep,
  onFinished,
}: {
  step: CreateStep | null;
  onboardingTeacherId: string | null;
  open: boolean;
  onClose: () => void;
  onStep: (step: CreateStep, teacherId?: string) => void;
  onFinished: (teacherId: string) => void;
}) {
  const client = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayTouched, setDisplayTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [accountActive, setAccountActive] = useState(true);
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const createMutation = useMutation({
    mutationFn: () =>
      createAdminTeacher({
        fullName,
        displayName: displayName || fullName,
        email,
        phone,
        bio,
        profilePhotoUrl: photo,
        isAccountActive: accountActive,
      }),
    onSuccess: (teacher) => {
      void client.invalidateQueries({ queryKey: ["admin", "teachers"] });
      onStep("availability", teacher.teacher.id);
    },
  });
  const ruleMutation = useMutation({
    mutationFn: async () => {
      if (!onboardingTeacherId) throw new Error("Teacher is missing.");
      await Promise.all(
        rules.map((rule) => {
          const start = localRuleToUtc(rule.day, rule.start);
          const end = localRuleToUtc(rule.day, rule.end);
          return createAdminTeacherAvailabilityRule({
            teacherId: onboardingTeacherId,
            dayOfWeek: start.day,
            startTimeUtc: start.time,
            endTimeUtc: end.time,
            slotDurationMinutes: Number(rule.duration),
          });
        }),
      );
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin", "teachers"] });
      if (onboardingTeacherId) onFinished(onboardingTeacherId);
    },
  });
  const profileError = validateProfile({
    fullName,
    displayName: displayName || fullName,
    email,
    photo,
  });
  const availabilityError = validateRules(rules);
  function addRule() {
    setRules((current) => [
      ...current,
      { id: crypto.randomUUID(), day: "monday", start: "09:00", end: "10:00", duration: "60" },
    ]);
  }
  function updateRule(id: string, updates: Partial<RuleDraft>) {
    setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)));
  }
  return (
    <Modal
      title={step === "availability" ? "Set weekly availability" : "Add teacher"}
      isOpen={open}
      onClose={onClose}
      size="md"
      footer={
        step === "availability" ? (
          <>
            <button
              type="button"
              onClick={() => onboardingTeacherId && onFinished(onboardingTeacherId)}
              className="h-7 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle"
            >
              Skip for now
            </button>
            <button
              type="button"
              disabled={Boolean(availabilityError) || ruleMutation.isPending}
              onClick={() => ruleMutation.mutate()}
              className="h-7 rounded-md px-2 text-xs font-medium text-brand transition hover:bg-surface-subtle disabled:opacity-50"
            >
              {ruleMutation.isPending ? "Saving…" : "Finish"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="h-7 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle disabled:opacity-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={Boolean(profileError) || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="h-7 rounded-md px-2 text-xs font-medium text-brand transition hover:bg-surface-subtle disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating…" : "Continue"}
            </button>
          </>
        )
      }
    >
      <div className="space-y-3">
        <div className="flex border-b border-border">
          <CreateTeacherStep label="Profile" active={step === "profile"} />
          <CreateTeacherStep label="Availability" active={step === "availability"} />
        </div>
        {step === "profile" ? (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field
                label="Full name"
                value={fullName}
                onChange={(value) => {
                  setFullName(value);
                  if (!displayTouched) setDisplayName(value);
                }}
              />
              <Field
                label="Display name"
                value={displayName}
                onChange={(value) => {
                  setDisplayTouched(true);
                  setDisplayName(value);
                }}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Email" value={email} type="email" onChange={setEmail} />
              <Field label="Phone" value={phone} onChange={setPhone} placeholder="Optional" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field
                label="Profile photo URL"
                value={photo}
                onChange={setPhoto}
                placeholder="Optional"
              />
              <CompactToggle
                label="Account enabled"
                checked={accountActive}
                onChange={setAccountActive}
              />
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">Bio</span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="min-h-20 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs font-medium text-primary outline-none transition placeholder:text-muted focus:border-border-strong focus:ring-2 focus:ring-brand/15"
              />
            </label>
            {profileError ? <p className="text-xs text-danger">{profileError}</p> : null}
            {createMutation.error ? (
              <p className="text-xs text-danger">{getErrorMessage(createMutation.error)}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs text-muted">
              Times are entered in your local timezone and stored in UTC.
            </p>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_3.75rem_auto] gap-1.5 rounded-md border border-border bg-surface p-2"
              >
                <select
                  value={rule.day}
                  onChange={(event) =>
                    updateRule(rule.id, { day: event.target.value as DayOfWeek })
                  }
                  className="h-8 rounded-md border border-border bg-surface px-1 text-xs text-primary"
                >
                  {weekdays.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={rule.start}
                  onChange={(event) => updateRule(rule.id, { start: event.target.value })}
                  className="h-8 rounded-md border border-border bg-surface px-1 text-xs text-primary"
                />
                <input
                  type="time"
                  value={rule.end}
                  onChange={(event) => updateRule(rule.id, { end: event.target.value })}
                  className="h-8 rounded-md border border-border bg-surface px-1 text-xs text-primary"
                />
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={rule.duration}
                  onChange={(event) => updateRule(rule.id, { duration: event.target.value })}
                  className="h-8 rounded-md border border-border bg-surface px-1 text-xs text-primary"
                  title="Minutes"
                />
                <button
                  type="button"
                  onClick={() =>
                    setRules((current) => current.filter((item) => item.id !== rule.id))
                  }
                  className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-surface-subtle"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRule}
              className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary transition hover:border-border-strong hover:bg-surface-subtle"
            >
              Add weekly time
            </button>
            {availabilityError ? <p className="text-xs text-danger">{availabilityError}</p> : null}
            {ruleMutation.error ? (
              <p className="text-xs text-danger">{getErrorMessage(ruleMutation.error)}</p>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}

function CreateTeacherStep({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-8 items-center px-3 text-xs font-medium transition",
        active ? "text-primary" : "text-muted",
      )}
    >
      {label}
      {active ? <span className="absolute inset-x-2 bottom-0 h-px bg-brand" /> : null}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs font-medium text-primary outline-none transition placeholder:text-muted focus:border-border-strong focus:ring-2 focus:ring-brand/15"
      />
    </label>
  );
}
function validateProfile({
  fullName,
  displayName,
  email,
  photo,
}: {
  fullName: string;
  displayName: string;
  email: string;
  photo: string;
}) {
  if (!fullName.trim() || !displayName.trim()) return "Full and display names are required.";
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Enter a valid email address.";
  if (photo.trim()) {
    try {
      new URL(photo.trim());
    } catch {
      return "Profile photo must be a valid URL.";
    }
  }
  return null;
}
function validateRules(rules: RuleDraft[]) {
  for (const rule of rules) {
    if (!rule.start || !rule.end || rule.start >= rule.end)
      return "Each availability row needs an end time after its start time.";
    const duration = Number(rule.duration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 240)
      return "Slot duration must be between 1 and 240 minutes.";
  }
  for (let index = 0; index < rules.length; index += 1)
    for (let other = index + 1; other < rules.length; other += 1)
      if (
        rules[index].day === rules[other].day &&
        rules[index].start < rules[other].end &&
        rules[index].end > rules[other].start
      )
        return "Weekly availability rows cannot overlap.";
  return null;
}
function parseCreateStep(value: string | null): CreateStep | null {
  return value === "profile" || value === "availability" ? value : null;
}
function getFilters(params: URLSearchParams) {
  const status = params.get("status");
  const account = params.get("account");
  const sortBy = params.get("sort_by") as "created_at" | "name" | "display_name" | undefined;
  const sortOrder = params.get("sort_order") === "asc" ? ("asc" as const) : ("desc" as const);
  return {
    q: params.get("q") ?? "",
    isActive: status === "true" ? true : status === "false" ? false : undefined,
    accountIsActive: account === "true" ? true : account === "false" ? false : undefined,
    sortBy: sortBy ?? "created_at",
    sortOrder,
    page: Math.max(1, Number(params.get("page")) || 1),
    pageSize: PAGE_SIZE,
  };
}
