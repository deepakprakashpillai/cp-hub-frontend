import { type ReactNode, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, type LucideIcon, Plus, Upload, UserPlus, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { CopyIconButton } from "@/components/ui/CopyIconButton";
import { DataCardGrid } from "@/components/ui/DataCardGrid";
import { DataTable } from "@/components/ui/DataTable";
import { DataViewToggle, type DataViewMode } from "@/components/ui/DataViewToggle";
import { DebouncedSearchInput } from "@/components/ui/DebouncedSearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  createAdminStudent,
  createAdminStudentAccessGrant,
  getAdminClassSession,
  getAdminStudent,
  listAdminBatchGroups,
  listAdminBookings,
  listAdminPackages,
  listAdminStudents,
  listAdminTeachers,
  setAdminStudentBatchGroup,
  updateAdminStudent,
  type AdminTeacherRead,
  type AdminStudentAccessState,
  type AdminStudentRead,
  type AdminStudentSortBy,
  type BatchGroupRead,
  type BookingRead,
  type BookingStatus,
  type ClassSessionRead,
  type PackageRead,
  type SortOrder,
  type StudentProgramType,
  type StudentStatus,
} from "@/features/admin/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
type StudentCreateMode = "single" | "bulk";

const statusOptions: Array<{ value: StudentStatus; label: string }> = [
  { value: "enrolled", label: "Enrolled" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const programOptions: Array<{ value: StudentProgramType; label: string }> = [
  { value: "one_on_one", label: "1-on-1" },
  { value: "batch", label: "Batch" },
];

const accessOptions: Array<{ value: AdminStudentAccessState; label: string }> = [
  { value: "valid", label: "Valid" },
  { value: "expired", label: "Expired" },
  { value: "not_started", label: "Not started" },
  { value: "none", label: "No access" },
];

type StudentSortValue = `${AdminStudentSortBy}:${SortOrder}`;

const DEFAULT_STUDENT_SORT_VALUE = "created_at:desc" satisfies StudentSortValue;

const sortOptions: Array<{ value: StudentSortValue; label: string }> = [
  { value: DEFAULT_STUDENT_SORT_VALUE, label: "Newest" },
  { value: "created_at:asc", label: "Oldest" },
  { value: "name:asc", label: "Name A-Z" },
  { value: "name:desc", label: "Name Z-A" },
  { value: "joined_at:desc", label: "Joined newest" },
  { value: "joined_at:asc", label: "Joined oldest" },
  { value: "access_ends_at:asc", label: "Access ending" },
  { value: "access_ends_at:desc", label: "Access latest" },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  timeStyle: "short",
});

const columnHelper = createColumnHelper<AdminStudentRead>();

export function AdminStudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const filters = getStudentFilters(searchParams);
  const selectedStudentId = searchParams.get("student");
  const createMode = parseCreateMode(searchParams.get("create"));
  const viewMode = parseViewMode(searchParams.get("view"));
  const classPreviewNow = useMemo(() => new Date().toISOString(), []);

  const studentsQuery = useQuery({
    queryKey: ["admin", "students", filters],
    queryFn: () => listAdminStudents(filters),
  });

  const selectedStudentQuery = useQuery({
    queryKey: ["admin", "students", selectedStudentId],
    queryFn: () => getAdminStudent(selectedStudentId ?? ""),
    enabled: Boolean(selectedStudentId),
  });

  const upcomingBookingsQuery = useQuery({
    queryKey: ["admin", "students", selectedStudentId, "upcoming-bookings", classPreviewNow],
    queryFn: () =>
      listAdminBookings({
        studentId: selectedStudentId ?? "",
        status: "booked",
        startsFrom: classPreviewNow,
        pageSize: 3,
      }),
    enabled: Boolean(selectedStudentId),
  });

  const recentBookingsQuery = useQuery({
    queryKey: ["admin", "students", selectedStudentId, "recent-bookings", classPreviewNow],
    queryFn: () =>
      listAdminBookings({
        studentId: selectedStudentId ?? "",
        startsTo: classPreviewNow,
        pageSize: 3,
      }),
    enabled: Boolean(selectedStudentId),
  });

  const upcomingClassQueries = useQueries({
    queries: (upcomingBookingsQuery.data?.items ?? []).map((booking) => ({
      queryKey: ["admin", "classes", booking.class_session_id],
      queryFn: () => getAdminClassSession(booking.class_session_id),
    })),
  });

  const recentClassQueries = useQueries({
    queries: (recentBookingsQuery.data?.items ?? []).map((booking) => ({
      queryKey: ["admin", "classes", booking.class_session_id],
      queryFn: () => getAdminClassSession(booking.class_session_id),
    })),
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.user.full_name, {
        id: "student",
        header: "Student",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-primary">
              {row.original.user.full_name}
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
      columnHelper.accessor((row) => row.student.status, {
        id: "status",
        header: "Status",
        cell: ({ getValue }) => <StudentStatusBadge value={getValue()} />,
      }),
      columnHelper.accessor((row) => row.student.program_type, {
        id: "program",
        header: "Program",
        cell: ({ getValue }) => <QuietLabel>{formatProgram(getValue())}</QuietLabel>,
      }),
      columnHelper.accessor((row) => row.student, {
        id: "access",
        header: "Access",
        cell: ({ getValue }) => <AccessCell student={getValue()} />,
      }),
      columnHelper.accessor((row) => row.student.joined_at, {
        id: "joined",
        header: "Joined",
        cell: ({ getValue }) => <QuietLabel>{formatDate(getValue())}</QuietLabel>,
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
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Link
            to={`/admin/students/${row.original.student.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"
            onClick={(event) => event.stopPropagation()}
          >
            Open
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        ),
      }),
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table exposes table helpers this rule cannot memoize safely.
  const table = useReactTable({
    data: studentsQuery.data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function updateSearchParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    setSearchParams(next);
  }

  function updateFilter(name: string, value: string) {
    updateSearchParams({
      [name]: value || null,
      page: null,
    });
  }

  function updateSort(value: string) {
    const sort = parseStudentSortValue(value);
    const isDefault = `${sort.sortBy}:${sort.sortOrder}` === DEFAULT_STUDENT_SORT_VALUE;

    updateSearchParams({
      sort_by: isDefault ? null : sort.sortBy,
      sort_order: isDefault ? null : sort.sortOrder,
      page: null,
    });
  }

  function updateView(value: DataViewMode) {
    updateSearchParams({ view: value === "table" ? null : value });
  }

  function selectStudent(studentId: string) {
    updateSearchParams({ student: studentId });
  }

  function updateSearch(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set("q", value);
    } else {
      next.delete("q");
    }
    next.delete("page");
    setSearchParams(next, { replace: true });
  }

  function closeDrawer() {
    const next = new URLSearchParams(searchParams);
    next.delete("student");
    setSearchParams(next, { replace: true });
  }

  function openCreateModal(mode: StudentCreateMode = "single") {
    const next = new URLSearchParams(searchParams);
    next.set("create", mode);
    next.delete("student");
    setSearchParams(next);
  }

  function closeCreateModal() {
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }

  const totalPages = Math.max(1, Math.ceil((studentsQuery.data?.total ?? 0) / PAGE_SIZE));
  const hasActiveFilters = Boolean(
    filters.q || filters.status || filters.programType || filters.accessState,
  );
  const sortValue = `${filters.sortBy}:${filters.sortOrder}` satisfies StudentSortValue;

  return (
    <section className="space-y-5">
      <PageHeader
        title="Students"
        actions={
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-2.5 text-xs font-medium text-white transition hover:opacity-90"
            onClick={() => openCreateModal()}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add student
          </button>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <DebouncedSearchInput
              key={filters.q}
              value={filters.q}
              placeholder="Search name, phone, email"
              onChange={updateSearch}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Sort"
            value={sortValue}
            options={sortOptions}
            includeAll={false}
            onChange={updateSort}
          />
          <FilterSelect
            label="Status"
            value={filters.status ?? ""}
            options={statusOptions}
            onChange={(value) => updateFilter("status", value)}
          />
          <FilterSelect
            label="Program"
            value={filters.programType ?? ""}
            options={programOptions}
            onChange={(value) => updateFilter("program_type", value)}
          />
          <FilterSelect
            label="Access"
            value={filters.accessState ?? ""}
            options={accessOptions}
            onChange={(value) => updateFilter("access_state", value)}
          />
          {hasActiveFilters ? (
            <button
              type="button"
              className="h-8 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"
              onClick={() =>
                setSearchParams((current) => {
                  const next = new URLSearchParams(current);
                  ["q", "status", "program_type", "access_state", "page"].forEach((key) =>
                    next.delete(key),
                  );
                  return next;
                })
              }
            >
              Clear
            </button>
          ) : null}
          <DataViewToggle value={viewMode} onChange={updateView} className="sm:ml-auto" />
        </div>
      </div>

      {viewMode === "table" ? (
        <DataTable
          table={table}
          isLoading={studentsQuery.isLoading}
          isError={studentsQuery.isError}
          emptyMessage={hasActiveFilters ? "No students match these filters" : "No students yet"}
          errorMessage="Students could not be loaded."
          onRetry={() => void studentsQuery.refetch()}
          onRowClick={(row) => selectStudent(row.original.student.id)}
        />
      ) : (
        <DataCardGrid
          items={studentsQuery.data?.items ?? []}
          getKey={(student) => student.student.id}
          className="justify-start [grid-template-columns:repeat(auto-fill,minmax(15rem,16rem))]"
          renderCard={(student) => (
            <StudentListCard
              student={student}
              onSelect={() => selectStudent(student.student.id)}
              onOpenPage={() => navigate(`/admin/students/${student.student.id}`)}
            />
          )}
          isLoading={studentsQuery.isLoading}
          isError={studentsQuery.isError}
          emptyMessage={hasActiveFilters ? "No students match these filters" : "No students yet"}
          errorMessage="Students could not be loaded."
          onRetry={() => void studentsQuery.refetch()}
        />
      )}

      <TablePagination
        page={filters.page}
        totalPages={totalPages}
        total={studentsQuery.data?.total ?? 0}
        itemLabel="students"
        onPageChange={(page) => updateSearchParams({ page: page > 1 ? String(page) : null })}
      />

      <StudentSnapshotDrawer
        student={selectedStudentQuery.data}
        isOpen={Boolean(selectedStudentId)}
        isLoading={selectedStudentQuery.isLoading}
        isError={selectedStudentQuery.isError}
        onClose={closeDrawer}
        onOpenPage={() => {
          if (selectedStudentId) {
            navigate(`/admin/students/${selectedStudentId}`);
          }
        }}
        upcomingBookings={upcomingBookingsQuery.data?.items ?? []}
        upcomingClasses={upcomingClassQueries.map((query) => query.data)}
        isUpcomingLoading={
          upcomingBookingsQuery.isLoading || upcomingClassQueries.some((query) => query.isLoading)
        }
        isUpcomingError={
          upcomingBookingsQuery.isError || upcomingClassQueries.some((query) => query.isError)
        }
        recentBookings={recentBookingsQuery.data?.items ?? []}
        recentClasses={recentClassQueries.map((query) => query.data)}
        isRecentLoading={
          recentBookingsQuery.isLoading || recentClassQueries.some((query) => query.isLoading)
        }
        isRecentError={
          recentBookingsQuery.isError || recentClassQueries.some((query) => query.isError)
        }
      />

      <CreateStudentModal
        mode={createMode ?? "single"}
        isOpen={Boolean(createMode)}
        onModeChange={openCreateModal}
        onClose={closeCreateModal}
        onCreated={(studentId) => {
          closeCreateModal();
          navigate(`/admin/students/${studentId}`);
        }}
      />
    </section>
  );
}

function CreateStudentModal({
  mode,
  isOpen,
  onModeChange,
  onClose,
  onCreated,
}: {
  mode: StudentCreateMode;
  isOpen: boolean;
  onModeChange: (mode: StudentCreateMode) => void;
  onClose: () => void;
  onCreated: (studentId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [programType, setProgramType] = useState<StudentProgramType>("one_on_one");
  const [status, setStatus] = useState<StudentStatus>("enrolled");
  const [teacherId, setTeacherId] = useState("");
  const [batchGroupId, setBatchGroupId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [isAccountEnabled, setIsAccountEnabled] = useState(true);
  const [notes, setNotes] = useState("");
  const [bulkFileName, setBulkFileName] = useState("");

  const teachersQuery = useQuery({
    queryKey: ["admin", "teachers", "create-student-lookup"],
    queryFn: () => listAdminTeachers({ isActive: true, pageSize: 100 }),
    enabled: isOpen && mode === "single" && programType === "one_on_one",
  });

  const batchGroupsQuery = useQuery({
    queryKey: ["admin", "batch-groups", "create-student-lookup"],
    queryFn: () => listAdminBatchGroups({ isActive: true, pageSize: 100 }),
    enabled: isOpen && mode === "single" && programType === "batch",
  });

  const packagesQuery = useQuery({
    queryKey: ["admin", "packages", "create-student-lookup"],
    queryFn: () => listAdminPackages({ pageSize: 100 }),
    enabled: isOpen && mode === "single",
  });

  const teacherOptions = createTeacherOptions(teachersQuery.data?.items ?? []);
  const batchGroupOptions = createBatchGroupOptions(batchGroupsQuery.data?.items ?? []);
  const packageOptions = createPackageOptions(packagesQuery.data?.items ?? []);
  const validationError = validateCreateStudentForm({ fullName, email, status, packageId });
  const createMutation = useMutation({
    mutationFn: async () => {
      if (validationError) {
        throw new Error(validationError);
      }

      const createdStudent = await createAdminStudent({
        fullName,
        email,
        phone,
        isActive: isAccountEnabled,
        programType,
        status: status === "active" && packageId ? "enrolled" : status,
        notes,
      });

      if (programType === "one_on_one" && teacherId) {
        await updateAdminStudent({
          studentId: createdStudent.student.id,
          payload: { assigned_teacher_id: teacherId },
        });
      }

      if (programType === "batch" && batchGroupId) {
        await setAdminStudentBatchGroup({
          studentId: createdStudent.student.id,
          payload: { batchGroupId },
        });
      }

      if (packageId) {
        await createAdminStudentAccessGrant({
          studentId: createdStudent.student.id,
          payload: {
            grantType: "package",
            packageId,
            extendCurrentAccess: true,
          },
        });
      }

      if (status === "active" && packageId) {
        await updateAdminStudent({
          studentId: createdStudent.student.id,
          payload: { status: "active" },
        });
      }

      return createdStudent;
    },
    onSuccess: (createdStudent) => {
      resetStudentCreateForm({
        setFullName,
        setEmail,
        setPhone,
        setProgramType,
        setStatus,
        setTeacherId,
        setBatchGroupId,
        setPackageId,
        setIsAccountEnabled,
        setNotes,
        setBulkFileName,
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
      onCreated(createdStudent.student.id);
    },
  });

  function closeModal() {
    resetStudentCreateForm({
      setFullName,
      setEmail,
      setPhone,
      setProgramType,
      setStatus,
      setTeacherId,
      setBatchGroupId,
      setPackageId,
      setIsAccountEnabled,
      setNotes,
      setBulkFileName,
    });
    createMutation.reset();
    onClose();
  }

  const createError = getMutationErrorMessage(createMutation.error);
  const isSaving = createMutation.isPending;

  return (
    <Modal
      title="Add student"
      isOpen={isOpen}
      onClose={closeModal}
      size="md"
      footer={
        mode === "single" ? (
          <>
            <CreateStudentButton label="Close" onClick={closeModal} disabled={isSaving} />
            <CreateStudentButton
              label={isSaving ? "Creating..." : "Create"}
              tone="brand"
              onClick={() => createMutation.mutate()}
              disabled={isSaving || Boolean(validationError)}
            />
          </>
        ) : (
          <>
            <CreateStudentButton label="Close" onClick={closeModal} />
            <CreateStudentButton label="Import" tone="brand" onClick={() => null} disabled />
          </>
        )
      }
    >
      <div className="space-y-3">
        <div className="flex border-b border-border">
          <CreateStudentTab
            icon={UserPlus}
            label="Single"
            isActive={mode === "single"}
            onClick={() => onModeChange("single")}
          />
          <CreateStudentTab
            icon={Upload}
            label="Bulk"
            isActive={mode === "bulk"}
            onClick={() => onModeChange("bulk")}
          />
        </div>

        {mode === "single" ? (
          <div className="space-y-2.5">
            <div className="grid gap-2 sm:grid-cols-2">
              <CreateStudentField
                label="Name"
                value={fullName}
                onChange={setFullName}
                disabled={isSaving}
              />
              <CreateStudentField
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <CreateStudentField
                label="Phone"
                value={phone}
                onChange={setPhone}
                placeholder="Optional"
                disabled={isSaving}
              />
              <CreateStudentToggle
                checked={isAccountEnabled}
                onChange={setIsAccountEnabled}
                label="Account enabled"
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <FilterSelect
                label="Program"
                value={programType}
                includeAll={false}
                options={programOptions}
                onChange={(value) => {
                  setProgramType(value as StudentProgramType);
                  setTeacherId("");
                  setBatchGroupId("");
                }}
                disabled={isSaving}
                className="w-full"
                triggerClassName="w-full"
              />
              <FilterSelect
                label="Student"
                value={status}
                includeAll={false}
                options={statusOptions}
                onChange={(value) => setStatus(value as StudentStatus)}
                disabled={isSaving}
                className="w-full"
                triggerClassName="w-full"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {programType === "one_on_one" ? (
                <FilterSelect
                  label="Teacher"
                  value={teacherId}
                  options={teacherOptions}
                  onChange={setTeacherId}
                  allLabel={teachersQuery.isLoading ? "Loading..." : "Not assigned"}
                  disabled={isSaving || teachersQuery.isLoading}
                  className="w-full"
                  triggerClassName="w-full"
                />
              ) : (
                <FilterSelect
                  label="Batch"
                  value={batchGroupId}
                  options={batchGroupOptions}
                  onChange={setBatchGroupId}
                  allLabel={batchGroupsQuery.isLoading ? "Loading..." : "Not assigned"}
                  disabled={isSaving || batchGroupsQuery.isLoading}
                  className="w-full"
                  triggerClassName="w-full"
                />
              )}
              <FilterSelect
                label="Package access"
                value={packageId}
                options={packageOptions}
                onChange={setPackageId}
                allLabel={packagesQuery.isLoading ? "Loading..." : "No package"}
                disabled={isSaving || packagesQuery.isLoading}
                className="w-full"
                triggerClassName="w-full"
              />
            </div>
            <CreateStudentField
              label="Notes"
              value={notes}
              onChange={setNotes}
              placeholder="Optional"
              disabled={isSaving}
            />
            {validationError ? (
              <p className="text-xs font-medium text-danger">{validationError}</p>
            ) : null}
            {createError ? <p className="text-xs font-medium text-danger">{createError}</p> : null}
          </div>
        ) : (
          <div className="space-y-2.5">
            <label className="flex min-h-28 cursor-pointer items-center gap-3 rounded-md border border-border bg-surface px-3 py-3 text-left transition hover:border-border-strong hover:bg-surface-subtle/55">
              <input
                type="file"
                accept=".csv,.xlsx"
                className="sr-only"
                onChange={(event) => setBulkFileName(event.target.files?.[0]?.name ?? "")}
              />
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-surface-subtle/70 text-brand">
                <Upload className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-primary">
                  {bulkFileName || "Choose CSV or XLSX"}
                </span>
                <span className="mt-1 block text-[11px] font-medium text-muted">
                  Import action will unlock after backend support.
                </span>
              </span>
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}

function StudentListCard({
  student,
  onSelect,
  onOpenPage,
}: {
  student: AdminStudentRead;
  onSelect: () => void;
  onOpenPage: () => void;
}) {
  const access = getAccessSummary(student.student);
  const assignedTeacherLabel =
    student.student.program_type === "one_on_one"
      ? (student.assigned_teacher?.teacher.display_name ?? "Not assigned")
      : null;

  return (
    <article
      role="button"
      tabIndex={0}
      className="h-[17.5rem] rounded-md border border-border bg-surface p-3 transition hover:border-border-strong hover:bg-surface-subtle/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/15"
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <StudentStatusBadge value={student.student.status} />
          </div>
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-primary">
            {student.user.full_name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">{student.user.email}</p>
          {student.user.phone ? (
            <p className="mt-0.5 truncate text-xs text-muted">{student.user.phone}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary"
          onClick={(event) => {
            event.stopPropagation();
            onOpenPage();
          }}
          aria-label="Open student page"
          title="Open student page"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 space-y-2.5 border-t border-border pt-3">
        <CardSignal label="Program" value={formatProgram(student.student.program_type)} />
        {assignedTeacherLabel ? <CardSignal label="Teacher" value={assignedTeacherLabel} /> : null}
        <CardSignal label="Access" value={access.label} tone={access.tone} />
        <CardSignal label="Account" value={student.user.is_active ? "Enabled" : "Disabled"} />
        <CardSignal label="Joined" value={formatCompactDate(student.student.joined_at)} />
      </div>
    </article>
  );
}

function CardSignal({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "brand";
}) {
  return (
    <div className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-start gap-2">
      <p className="text-[11px] font-medium leading-4 text-muted">{label}</p>
      <p
        className={cn(
          "line-clamp-2 text-xs font-medium leading-4",
          tone === "default" && "text-primary",
          tone === "danger" && "text-danger",
          tone === "brand" && "text-brand",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CreateStudentTab({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex h-8 flex-1 items-center justify-center gap-1.5 px-2 text-xs font-medium transition",
        isActive ? "text-primary" : "text-muted hover:text-primary",
      )}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      {isActive ? <span className="absolute inset-x-3 bottom-[-1px] h-px bg-brand" /> : null}
    </button>
  );
}

function CreateStudentField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs font-medium text-primary outline-none transition placeholder:text-muted focus:border-border-strong focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function CreateStudentToggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "mt-[1.125rem] flex h-8 items-center justify-between gap-3 rounded-md border border-border bg-surface px-2 transition hover:border-border-strong",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <span className="text-xs font-medium text-primary">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "relative h-4 w-7 rounded-full border border-border-strong transition",
          checked ? "bg-brand/80" : "bg-surface-subtle",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-surface shadow-sm transition",
            checked ? "left-[0.85rem]" : "left-0.5",
          )}
        />
      </span>
    </label>
  );
}

function CreateStudentButton({
  label,
  onClick,
  tone = "default",
  disabled,
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "brand";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "h-8 rounded-md px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        tone === "brand" && "bg-brand/10 text-brand hover:bg-brand/15 hover:text-primary",
        tone === "default" && "text-muted hover:bg-surface hover:text-primary",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function resetStudentCreateForm({
  setFullName,
  setEmail,
  setPhone,
  setProgramType,
  setStatus,
  setTeacherId,
  setBatchGroupId,
  setPackageId,
  setIsAccountEnabled,
  setNotes,
  setBulkFileName,
}: {
  setFullName: (value: string) => void;
  setEmail: (value: string) => void;
  setPhone: (value: string) => void;
  setProgramType: (value: StudentProgramType) => void;
  setStatus: (value: StudentStatus) => void;
  setTeacherId: (value: string) => void;
  setBatchGroupId: (value: string) => void;
  setPackageId: (value: string) => void;
  setIsAccountEnabled: (value: boolean) => void;
  setNotes: (value: string) => void;
  setBulkFileName: (value: string) => void;
}) {
  setFullName("");
  setEmail("");
  setPhone("");
  setProgramType("one_on_one");
  setStatus("enrolled");
  setTeacherId("");
  setBatchGroupId("");
  setPackageId("");
  setIsAccountEnabled(true);
  setNotes("");
  setBulkFileName("");
}

function StudentSnapshotDrawer({
  student,
  isOpen,
  isLoading,
  isError,
  onClose,
  onOpenPage,
  upcomingBookings,
  upcomingClasses,
  isUpcomingLoading,
  isUpcomingError,
  recentBookings,
  recentClasses,
  isRecentLoading,
  isRecentError,
}: {
  student: AdminStudentRead | undefined;
  isOpen: boolean;
  isLoading: boolean;
  isError: boolean;
  onClose: () => void;
  onOpenPage: () => void;
  upcomingBookings: BookingRead[];
  upcomingClasses: Array<ClassSessionRead | undefined>;
  isUpcomingLoading: boolean;
  isUpcomingError: boolean;
  recentBookings: BookingRead[];
  recentClasses: Array<ClassSessionRead | undefined>;
  isRecentLoading: boolean;
  isRecentError: boolean;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-primary/15"
        onClick={onClose}
        aria-label="Close student snapshot"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold leading-tight text-primary">
              {student?.user.full_name ?? "Student"}
            </h2>
          </div>
          <button
            type="button"
            className="inline-grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary"
            onClick={onClose}
            aria-label="Close student snapshot"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-md bg-surface-subtle" />
              ))}
            </div>
          ) : null}

          {isError ? (
            <p className="text-sm font-medium text-danger">Student snapshot could not be loaded.</p>
          ) : null}

          {student ? (
            <div className="space-y-4">
              <SnapshotSection title="Contact" divider={false}>
                <div className="space-y-2">
                  <CopyableValue label="Email" value={student.user.email} />
                  <CopyableValue label="Phone" value={student.user.phone} emptyLabel="No phone" />
                </div>
              </SnapshotSection>

              <SnapshotSection title="Student">
                <div className="grid grid-cols-2 gap-3">
                  <FieldValue label="Program" value={formatProgram(student.student.program_type)} />
                  <FieldValue label="Status" value={formatStatus(student.student.status)} />
                  <FieldValue label="Joined" value={formatDate(student.student.joined_at)} />
                  <FieldValue
                    label="Account"
                    value={student.user.is_active ? "Enabled" : "Disabled"}
                    tone={student.user.is_active ? "default" : "danger"}
                  />
                </div>
              </SnapshotSection>

              <SnapshotSection title="Access">
                <div className="space-y-3">
                  <AccessCell student={student.student} />
                  <div className="grid grid-cols-2 gap-3">
                    <FieldValue
                      label="Starts"
                      value={formatCompactDate(student.student.access_starts_at)}
                    />
                    <FieldValue
                      label="Ends"
                      value={formatCompactDate(student.student.access_ends_at)}
                    />
                  </div>
                </div>
              </SnapshotSection>

              <SnapshotSection title="Upcoming classes">
                <ClassPreviewList
                  bookings={upcomingBookings}
                  classes={upcomingClasses}
                  isLoading={isUpcomingLoading}
                  isError={isUpcomingError}
                  emptyLabel="No upcoming classes"
                  errorLabel="Upcoming classes could not be loaded."
                  sortDirection="asc"
                />
              </SnapshotSection>

              <SnapshotSection title="Recent classes">
                <ClassPreviewList
                  bookings={recentBookings}
                  classes={recentClasses}
                  isLoading={isRecentLoading}
                  isError={isRecentError}
                  emptyLabel="No recent classes"
                  errorLabel="Recent classes could not be loaded."
                  sortDirection="desc"
                />
              </SnapshotSection>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white transition hover:opacity-90"
            onClick={onOpenPage}
          >
            Open student page
          </button>
        </div>
      </aside>
    </div>
  );
}

function CopyableValue({
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

function FieldValue({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "muted" | "brand";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-medium",
          tone === "default" && "text-primary",
          tone === "danger" && "text-danger",
          tone === "muted" && "text-muted",
          tone === "brand" && "text-brand",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ClassPreviewList({
  bookings,
  classes,
  isLoading,
  isError,
  emptyLabel,
  errorLabel,
  sortDirection,
}: {
  bookings: BookingRead[];
  classes: Array<ClassSessionRead | undefined>;
  isLoading: boolean;
  isError: boolean;
  emptyLabel: string;
  errorLabel: string;
  sortDirection: "asc" | "desc";
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-md bg-surface-subtle" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-xs font-medium text-danger">{errorLabel}</p>;
  }

  if (bookings.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }

  const rows = bookings
    .map((booking, index) => ({
      booking,
      classSession: classes[index],
    }))
    .sort((left, right) => {
      const leftTime = left.classSession ? new Date(left.classSession.starts_at).getTime() : 0;
      const rightTime = right.classSession ? new Date(right.classSession.starts_at).getTime() : 0;

      return sortDirection === "asc" ? leftTime - rightTime : rightTime - leftTime;
    });

  return (
    <div className="space-y-2">
      {rows.map(({ booking, classSession }) => {
        return (
          <div
            key={booking.id}
            className="flex items-center justify-between gap-3 rounded-md bg-surface-subtle/65 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">
                {classSession ? formatDate(classSession.starts_at) : "Class"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {classSession
                  ? `${formatTime(classSession.starts_at)} - ${formatTime(classSession.ends_at)}`
                  : booking.id}
              </p>
            </div>
            <QuietLabel>{formatBookingStatus(booking.status)}</QuietLabel>
          </div>
        );
      })}
    </div>
  );
}

function SnapshotSection({
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

function StudentStatusBadge({ value }: { value: StudentStatus }) {
  return <StatusBadge tone={studentStatusBadgeTones[value]}>{formatStatus(value)}</StatusBadge>;
}

const studentStatusBadgeTones = {
  enrolled: "blue",
  active: "green",
  paused: "amber",
  completed: "indigo",
  cancelled: "rose",
} satisfies Record<StudentStatus, "blue" | "green" | "amber" | "indigo" | "rose">;

function AccessCell({ student }: { student: AdminStudentRead["student"] }) {
  const access = getAccessSummary(student);

  return (
    <div>
      <p
        className={cn(
          "text-xs font-medium",
          access.tone === "brand" && "text-brand",
          access.tone === "danger" && "text-danger",
          access.tone === "default" && "text-primary",
        )}
      >
        {access.label}
      </p>
      {access.detail ? <p className="mt-1 text-xs text-muted">{access.detail}</p> : null}
    </div>
  );
}

function getStudentFilters(searchParams: URLSearchParams) {
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const sort = getStudentSort(searchParams);

  return {
    q: searchParams.get("q")?.trim() ?? "",
    status: parseOption(searchParams.get("status"), statusOptions),
    programType: parseOption(searchParams.get("program_type"), programOptions),
    accessState: parseOption(searchParams.get("access_state"), accessOptions),
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
    page: Number.isFinite(page) ? Math.max(1, page) : 1,
    pageSize: PAGE_SIZE,
  };
}

function getStudentSort(searchParams: URLSearchParams) {
  const sortBy = parseOption(searchParams.get("sort_by"), sortByOptions) ?? "created_at";
  const sortOrder = parseOption(searchParams.get("sort_order"), sortOrderOptions) ?? "desc";

  return { sortBy, sortOrder };
}

const sortByOptions = [
  { value: "created_at", label: "Created" },
  { value: "joined_at", label: "Joined" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
  { value: "program_type", label: "Program" },
  { value: "access_ends_at", label: "Access ends" },
] satisfies Array<{ value: AdminStudentSortBy; label: string }>;

const sortOrderOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] satisfies Array<{ value: SortOrder; label: string }>;

function parseStudentSortValue(value: string) {
  const option = sortOptions.find((item) => item.value === value);
  const [sortBy, sortOrder] = (option?.value ?? DEFAULT_STUDENT_SORT_VALUE).split(":") as [
    AdminStudentSortBy,
    SortOrder,
  ];

  return { sortBy, sortOrder };
}

function parseOption<T extends string>(
  value: string | null,
  options: Array<{ value: T; label: string }>,
) {
  if (!value) {
    return undefined;
  }
  return options.some((option) => option.value === value) ? (value as T) : undefined;
}

function parseCreateMode(value: string | null): StudentCreateMode | null {
  return value === "single" || value === "bulk" ? value : null;
}

function parseViewMode(value: string | null): DataViewMode {
  return value === "cards" ? "cards" : "table";
}

function validateCreateStudentForm({
  fullName,
  email,
  status,
  packageId,
}: {
  fullName: string;
  email: string;
  status: StudentStatus;
  packageId: string;
}) {
  if (!fullName.trim()) {
    return "Name is required";
  }

  if (!email.trim()) {
    return "Email is required";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email";
  }

  if (status === "active" && !packageId) {
    return "Choose package access before creating an active student";
  }

  return null;
}

function createTeacherOptions(teachers: AdminTeacherRead[]) {
  return teachers.map((teacher) => ({
    value: teacher.teacher.id,
    label: teacher.teacher.display_name,
  }));
}

function createBatchGroupOptions(batchGroups: BatchGroupRead[]) {
  return batchGroups.map((batchGroup) => ({
    value: batchGroup.id,
    label: batchGroup.name,
  }));
}

function createPackageOptions(packages: PackageRead[]) {
  return packages.map((item) => ({
    value: item.id,
    label: `${item.name} · ${formatCurrencyMinor(item.price_amount, item.currency)}`,
  }));
}

type ApiMutationError = {
  message?: string;
  response?: {
    data?: {
      detail?: string | Array<{ msg?: string }>;
    };
  };
};

function getMutationErrorMessage(error: unknown) {
  if (!error) {
    return null;
  }

  const apiError = error as ApiMutationError;
  const detail = apiError.response?.data?.detail;
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg)
      .filter(Boolean)
      .join(", ");
  }

  return apiError.message ?? "Action failed.";
}

function getAccessSummary(student: AdminStudentRead["student"]) {
  const startsAt = student.access_starts_at ? new Date(student.access_starts_at) : null;
  const endsAt = student.access_ends_at ? new Date(student.access_ends_at) : null;
  const now = new Date();

  if (!startsAt || !endsAt) {
    return { label: "No access", detail: null, tone: "default" as const };
  }

  if (now < startsAt) {
    return {
      label: `Starts ${formatCompactDate(student.access_starts_at)}`,
      detail: null,
      tone: "default" as const,
    };
  }

  if (now >= endsAt) {
    return {
      label: `Expired ${formatCompactDate(student.access_ends_at)}`,
      detail: null,
      tone: "danger" as const,
    };
  }

  return {
    label: `Valid till ${formatCompactDate(student.access_ends_at)}`,
    detail: null,
    tone: "brand" as const,
  };
}

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "-";
}

function formatCompactDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

function formatTime(value: string | null) {
  return value ? timeFormatter.format(new Date(value)) : "-";
}

function formatStatus(value: StudentStatus) {
  return {
    enrolled: "Enrolled",
    active: "Active",
    paused: "Paused",
    completed: "Completed",
    cancelled: "Cancelled",
  }[value];
}

function formatProgram(value: StudentProgramType) {
  return {
    one_on_one: "1-on-1",
    batch: "Batch",
  }[value];
}

function formatCurrencyMinor(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function formatBookingStatus(value: BookingStatus) {
  return {
    booked: "Booked",
    cancelled: "Cancelled",
    attended: "Attended",
    missed: "Missed",
  }[value];
}
