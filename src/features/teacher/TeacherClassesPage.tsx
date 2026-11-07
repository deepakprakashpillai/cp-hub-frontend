import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CalendarDays, Filter, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router";
import { useActiveTeacher } from "@/features/teacher/teacher-store";
import {
  listTeacherClasses,
  type TeacherClassSession,
} from "@/features/teacher/api";
import { formatDateTime, formatTime, formatProgram } from "@/features/admin/teachers/teacher-utils";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataViewToggle, type DataViewMode } from "@/components/ui/DataViewToggle";
import { DataTable } from "@/components/ui/DataTable";
import { TeacherClassDetailDrawer } from "@/features/teacher/TeacherClassDetailDrawer";
import { cn } from "@/lib/utils";

type ClassTab = "today" | "upcoming" | "past";

const tabOptions: Array<{ value: ClassTab; label: string }> = [
  { value: "today", label: "Today's Classes" },
  { value: "upcoming", label: "Upcoming Classes" },
  { value: "past", label: "Past History" },
];
const columnHelper = createColumnHelper<TeacherClassSession>();

export function CapacityProgressBar({ booked, capacity }: { booked: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
  const isFull = capacity > 0 && booked >= capacity;

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-border/80 overflow-hidden shrink-0">
        <div
          className={cn("h-full rounded-full transition-all duration-300", isFull ? "bg-rose-500" : "bg-emerald-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted">
        <span className={cn(isFull ? "font-semibold text-rose-600" : "text-primary")}>{booked}</span> / {capacity}
      </span>
    </div>
  );
}

export function TeacherClassesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeTeacherId } = useActiveTeacher();

  const activeDrawerSessionId = searchParams.get("session");

  const [activeTab, setActiveTab] = useState<ClassTab>("upcoming");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<DataViewMode>("cards");

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
        programType: programFilter,
        status: statusFilter,
        startsFrom,
        startsTo,
        sortOrder,
      }),
    enabled: Boolean(activeTeacherId),
  });

  const classes = data?.items ?? [];

  function openSessionDrawer(sessionId: string) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("session", sessionId);
    setSearchParams(nextParams);
  }

  function closeSessionDrawer() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("session");
    setSearchParams(nextParams);
  }

  const columns = useMemo(() => [
    columnHelper.accessor("display_label", {
      header: "Session Name",
      cell: (info) => {
        const item = info.row.original;
        const name = item.display_label ?? item.batch_group?.name ?? (item.program_type === "one_on_one" ? "1-on-1 Session" : "Batch Session");
        return <div className="font-medium text-primary">{name}</div>;
      },
    }),
    columnHelper.accessor("program_type", {
      header: "Program",
      cell: (info) => (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand">
          {formatProgram(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("starts_at", {
      header: "Schedule (UTC)",
      cell: (info) => {
        const item = info.row.original;
        return (
          <span className="text-xs text-muted">
            {formatDateTime(item.starts_at)} - {formatTime(item.ends_at)}
          </span>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const item = info.row.original;
        return (
          <StatusBadge tone={item.status === "scheduled" ? "indigo" : item.status === "completed" ? "green" : "rose"}>
            {item.status}
          </StatusBadge>
        );
      },
    }),
    columnHelper.accessor("capacity", {
      header: "Capacity",
      cell: (info) => {
        const item = info.row.original;
        return (
          <CapacityProgressBar
            booked={item.booking_status_counts?.booked ?? 0}
            capacity={item.capacity}
          />
        );
      },
    }),
  ], []);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table intentionally exposes an imperative table instance.
  const table = useReactTable({
    data: classes,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
              "relative h-9 px-3 text-xs font-medium transition",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-border bg-surface p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-center w-full sm:w-auto">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Filter className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">Filters:</span>
          </div>
          <div className="w-full">
            <FilterSelect
              value={programFilter}
              onChange={setProgramFilter}
              options={[
                { label: "All Programs", value: "all" },
                { label: "1-on-1 Sessions", value: "one_on_one" },
                { label: "Batch Classes", value: "batch" },
              ]}
            />
          </div>
          <div className="w-full">
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
        </div>
        <DataViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Class Sessions List */}
      {viewMode === "table" ? (
        <DataTable
          table={table}
          isLoading={isLoading}
          emptyMessage="No class sessions matching your selected filters for the current active teacher."
          errorMessage="Failed to load sessions"
          onRowClick={(row) => openSessionDrawer(row.original.id)}
        />
      ) : isLoading ? (
        <div className="py-12 text-center text-xs text-muted">Loading class sessions...</div>
      ) : classes.length === 0 ? (
        <div className="rounded-md border border-border bg-surface p-8 text-center space-y-2">
          <CalendarDays className="mx-auto h-10 w-10 text-muted/50" />
          <h3 className="text-sm font-semibold text-primary">No sessions found</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            There are no class sessions matching your selected filters for the current active teacher.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((item) => {
            return (
              <div
                key={item.id}
                onClick={() => openSessionDrawer(item.id)}
                className="rounded-md border border-border bg-surface overflow-hidden transition cursor-pointer hover:border-brand/40 hover:shadow-sm"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand">
                        {formatProgram(item.program_type)}
                      </span>
                      <p className="text-sm font-semibold text-primary group-hover:text-brand transition">
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

                  <div className="flex items-center gap-3 text-xs">
                    <CapacityProgressBar
                      booked={item.booking_status_counts?.booked ?? 0}
                      capacity={item.capacity}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Class Session Detail Drawer */}
      <TeacherClassDetailDrawer
        classSessionId={activeDrawerSessionId}
        isOpen={Boolean(activeDrawerSessionId)}
        onClose={closeSessionDrawer}
      />
    </section>
  );
}
