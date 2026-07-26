import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { AlertCircle, FileUp, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";

import { PageHeader } from "@/components/layout/PageHeader";
import { DataCardGrid } from "@/components/ui/DataCardGrid";
import { DataTable } from "@/components/ui/DataTable";
import { DebouncedSearchInput } from "@/components/ui/DebouncedSearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  type Lead,
  type LeadImportPreview,
  type LeadInput,
  type LeadStatus,
  type LeadSummary,
  convertLead,
  createLead,
  deleteLead,
  getLeadSummary,
  importLeads,
  listLeads,
  previewLeadImport,
  updateLead,
} from "@/features/leads/api";

const PAGE_SIZE = 25;

const statusOptions: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "trial_booked", label: "Trial booked" },
  { value: "enrolled", label: "Enrolled" },
  { value: "lost", label: "Lost" },
];

const leadFormSchema = z
  .object({
    full_name: z.string().trim().min(1, "Full name is required."),
    email: z.string().trim().email("Enter a valid email address.").or(z.literal("")),
    phone: z.string().trim(),
    source: z.string().trim(),
    status: z.enum(["new", "contacted", "trial_booked", "enrolled", "lost"]),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.phone) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Add an email or phone number.",
      });
    }
  });

type LeadFormValues = z.infer<typeof leadFormSchema>;
type Notice = { tone: "success" | "error"; message: string } | null;

const columnHelper = createColumnHelper<Lead>();

export function LeadsWorkspace({ canConvert = false }: { canConvert?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [leadPendingDelete, setLeadPendingDelete] = useState<Lead | null>(null);
  const [leadPendingConversion, setLeadPendingConversion] = useState<Lead | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const queryClient = useQueryClient();
  const filters = getLeadFilters(searchParams);

  const leadsQuery = useQuery({
    queryKey: ["leads", filters],
    queryFn: () => listLeads(filters),
  });
  const summaryQuery = useQuery({
    queryKey: ["leads", "summary"],
    queryFn: getLeadSummary,
  });
  const conversionQueueQuery = useQuery({
    queryKey: ["leads", "conversion-queue"],
    queryFn: () => listLeads({ status: "enrolled", page: 1, pageSize: 100 }),
    enabled: canConvert,
  });
  const conversionQueueCount = (conversionQueueQuery.data?.items ?? []).filter(
    (lead) => !lead.converted_student_id,
  ).length;

  const refreshLeads = async () => {
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: LeadStatus }) =>
      updateLead(leadId, { status }),
    onSuccess: async () => {
      setNotice({ tone: "success", message: "Lead status updated." });
      await refreshLeads();
    },
    onError: (error) => setNotice({ tone: "error", message: getErrorMessage(error) }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: async () => {
      setLeadPendingDelete(null);
      setNotice({ tone: "success", message: "Lead deleted permanently." });
      await refreshLeads();
    },
    onError: (error) => setNotice({ tone: "error", message: getErrorMessage(error) }),
  });

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeoutId = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  function updateSearchParams(updates: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    setSearchParams(next, { replace });
  }

  function updateSearch(value: string) {
    updateSearchParams({ q: value || null, page: null }, true);
  }

  function updateStatusFilter(value: string) {
    updateSearchParams({ status: value || null, page: null });
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("full_name", {
        header: "Lead",
        cell: ({ row }) => (
          <div className="min-w-[10rem]">
            <p className="truncate text-sm font-medium text-primary">{row.original.full_name}</p>
            <p className="mt-1 truncate text-xs text-muted">{row.original.email ?? row.original.phone ?? "-"}</p>
          </div>
        ),
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: ({ getValue }) => <span className="text-xs text-muted">{getValue() ?? "-"}</span>,
      }),
      columnHelper.accessor("source", {
        header: "Source",
        cell: ({ getValue }) => <span className="text-xs text-muted">{getValue() ?? "-"}</span>,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row, getValue }) => (
          <FilterSelect
            value={getValue()}
            options={statusOptions}
            includeAll={false}
            disabled={statusMutation.isPending && statusMutation.variables?.leadId === row.original.id}
            onChange={(status) => statusMutation.mutate({ leadId: row.original.id, status: status as LeadStatus })}
            triggerClassName="min-w-36"
          />
        ),
      }),
      columnHelper.accessor("updated_at", {
        header: "Updated",
        cell: ({ getValue }) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(getValue())}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              className="inline-grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary"
              onClick={() => setEditingLead(row.original)}
              aria-label={`Edit ${row.original.full_name}`}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {canConvert && row.original.converted_student_id ? (
              <Link
                to={`/admin/students/${row.original.converted_student_id}`}
                className="inline-flex h-7 items-center rounded-md px-2 text-xs font-medium text-brand hover:bg-surface-subtle"
              >
                Student
              </Link>
            ) : null}
            {canConvert && row.original.status === "enrolled" && !row.original.converted_student_id ? (
              <button
                type="button"
                className="inline-grid h-7 w-7 place-items-center rounded-md text-brand transition hover:bg-brand/10"
                onClick={() => setLeadPendingConversion(row.original)}
                aria-label={`Convert ${row.original.full_name} to student`}
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              className="inline-grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-danger/10 hover:text-danger"
              onClick={() => setLeadPendingDelete(row.original)}
              aria-label={`Delete ${row.original.full_name}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ),
      }),
    ],
    [canConvert, statusMutation],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table exposes table helpers this rule cannot memoize safely.
  const table = useReactTable({
    data: leadsQuery.data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil((leadsQuery.data?.total ?? 0) / PAGE_SIZE));
  const hasFilters = Boolean(filters.q || filters.status);

  return (
    <section className="space-y-5">
      <PageHeader
        title="Leads"
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-primary transition hover:bg-surface-subtle"
              onClick={() => setIsImportOpen(true)}
            >
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
              Import
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-2.5 text-xs font-medium text-white transition hover:opacity-90"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add lead
            </button>
          </>
        }
      />

      <LeadStats summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />

      {canConvert && conversionQueueCount > 0 ? (
        <section className="flex flex-col gap-3 rounded-md border border-warning/35 bg-warning/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <UserPlus className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary">
                {conversionQueueCount} {conversionQueueCount === 1 ? "enrolled lead is" : "enrolled leads are"} ready to convert
              </p>
              <p className="mt-0.5 text-xs text-muted">Create their student records when they are ready to begin learning.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSearchParams({ q: null, status: "enrolled", page: null })}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-brand px-2.5 text-xs font-medium text-white transition hover:opacity-90"
          >
            Review leads
          </button>
        </section>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <DebouncedSearchInput
              key={filters.q}
              value={filters.q}
              placeholder="Search name, email, phone, source"
              onChange={updateSearch}
            />
          </div>
          <FilterSelect
            label="Status"
            value={filters.status ?? ""}
            options={statusOptions}
            onChange={updateStatusFilter}
            className="shrink-0"
          />
          {hasFilters ? (
            <button
              type="button"
              className="h-8 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary"
              onClick={() => updateSearchParams({ q: null, status: null, page: null })}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="hidden md:block">
        <DataTable
          table={table}
          isLoading={leadsQuery.isLoading}
          isError={leadsQuery.isError}
          minWidth={820}
          emptyMessage={hasFilters ? "No leads match these filters" : "No leads yet"}
          errorMessage="Leads could not be loaded."
          onRetry={() => void leadsQuery.refetch()}
        />
      </div>
      <div className="md:hidden">
        <DataCardGrid
          items={leadsQuery.data?.items ?? []}
          getKey={(lead) => lead.id}
          isLoading={leadsQuery.isLoading}
          isError={leadsQuery.isError}
          emptyMessage={hasFilters ? "No leads match these filters" : "No leads yet"}
          errorMessage="Leads could not be loaded."
          onRetry={() => void leadsQuery.refetch()}
          renderCard={(lead) => (
            <LeadCard
              lead={lead}
              onEdit={() => setEditingLead(lead)}
              onDelete={() => setLeadPendingDelete(lead)}
              onConvert={canConvert && lead.status === "enrolled" && !lead.converted_student_id ? () => setLeadPendingConversion(lead) : undefined}
              convertedStudentId={canConvert ? lead.converted_student_id : null}
              onStatusChange={(status) => statusMutation.mutate({ leadId: lead.id, status })}
              isStatusUpdating={statusMutation.isPending && statusMutation.variables?.leadId === lead.id}
            />
          )}
        />
      </div>

      <TablePagination
        page={filters.page}
        totalPages={totalPages}
        total={leadsQuery.data?.total ?? 0}
        itemLabel="leads"
        onPageChange={(page) => updateSearchParams({ page: page > 1 ? String(page) : null })}
      />

      <LeadFormModal
        lead={editingLead}
        isOpen={isCreateOpen || Boolean(editingLead)}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingLead(null);
        }}
        onSuccess={async (message) => {
          setIsCreateOpen(false);
          setEditingLead(null);
          setNotice({ tone: "success", message });
          await refreshLeads();
        }}
        onError={(message) => setNotice({ tone: "error", message })}
      />
      <LeadImportModal
        key={isImportOpen ? "open" : "closed"}
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={async (message) => {
          setIsImportOpen(false);
          setNotice({ tone: "success", message });
          await refreshLeads();
        }}
        onError={(message) => setNotice({ tone: "error", message })}
      />
      <DeleteLeadModal
        lead={leadPendingDelete}
        isDeleting={deleteMutation.isPending}
        onClose={() => setLeadPendingDelete(null)}
        onConfirm={() => leadPendingDelete && deleteMutation.mutate(leadPendingDelete.id)}
      />
      <ConvertLeadModal
        key={leadPendingConversion?.id ?? "closed"}
        lead={leadPendingConversion}
        onClose={() => setLeadPendingConversion(null)}
        onSuccess={async (studentId) => {
          setLeadPendingConversion(null);
          setNotice({ tone: "success", message: "Lead converted to student. Payment and access remain separate." });
          await refreshLeads();
          window.location.assign(`/admin/students/${studentId}`);
        }}
        onError={(message) => setNotice({ tone: "error", message })}
      />
      <LeadNotice notice={notice} onClose={() => setNotice(null)} />
    </section>
  );
}

function LeadCard({
  lead,
  onEdit,
  onDelete,
  onConvert,
  convertedStudentId,
  onStatusChange,
  isStatusUpdating,
}: {
  lead: Lead;
  onEdit: () => void;
  onDelete: () => void;
  onConvert?: () => void;
  convertedStudentId: string | null;
  onStatusChange: (status: LeadStatus) => void;
  isStatusUpdating: boolean;
}) {
  return (
    <article className="space-y-3 rounded-md border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-primary">{lead.full_name}</p>
          <p className="mt-1 truncate text-xs text-muted">{lead.email ?? lead.phone ?? "-"}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" className="inline-grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface-subtle" onClick={onEdit} aria-label={`Edit ${lead.full_name}`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {convertedStudentId ? <Link to={`/admin/students/${convertedStudentId}`} className="inline-flex h-7 items-center rounded-md px-2 text-xs font-medium text-brand hover:bg-surface-subtle">Student</Link> : null}
          {onConvert ? <button type="button" className="inline-grid h-7 w-7 place-items-center rounded-md text-brand hover:bg-brand/10" onClick={onConvert} aria-label={`Convert ${lead.full_name} to student`}><UserPlus className="h-3.5 w-3.5" /></button> : null}
          <button type="button" className="inline-grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-danger/10 hover:text-danger" onClick={onDelete} aria-label={`Delete ${lead.full_name}`}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs text-muted">{lead.source || "No source"}</p>
        <FilterSelect value={lead.status} options={statusOptions} includeAll={false} disabled={isStatusUpdating} onChange={(value) => onStatusChange(value as LeadStatus)} triggerClassName="min-w-36" />
      </div>
      <p className="text-[11px] text-muted">Updated {formatDate(lead.updated_at)}</p>
    </article>
  );
}

function LeadStats({ summary, isLoading }: { summary?: LeadSummary; isLoading: boolean }) {
  const stats = [
    { label: "Total", value: summary?.total, tone: "text-primary" },
    { label: "New", value: summary?.new, tone: "text-brand" },
    { label: "Contacted", value: summary?.contacted, tone: "text-warning" },
    { label: "Trial booked", value: summary?.trial_booked, tone: "text-brand" },
    { label: "Enrolled", value: summary?.enrolled, tone: "text-success" },
    { label: "Lost", value: summary?.lost, tone: "text-danger" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-md border border-border bg-surface px-3 py-2.5">
          <p className="truncate text-[11px] font-medium text-muted">{stat.label}</p>
          <p className={`mt-1 text-xl font-semibold leading-none ${stat.tone}`}>
            {isLoading ? "—" : stat.value ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

function LeadFormModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const form = useForm<LeadFormValues>({ defaultValues: getLeadFormDefaults(lead) });
  const mutation = useMutation({
    mutationFn: (input: LeadInput) => (lead ? updateLead(lead.id, input) : createLead(input)),
    onSuccess: async () => onSuccess(lead ? "Lead updated." : "Lead added."),
    onError: (error) => onError(getErrorMessage(error)),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(getLeadFormDefaults(lead));
    }
  }, [form, isOpen, lead]);

  function submit(values: LeadFormValues) {
    const result = leadFormSchema.safeParse(values);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LeadFormValues;
        form.setError(field, { message: issue.message });
      });
      return;
    }
    mutation.mutate({
      ...result.data,
      email: result.data.email || null,
      phone: result.data.phone || null,
      source: result.data.source || null,
    });
  }

  return (
    <Modal
      title={lead ? "Edit lead" : "Add lead"}
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="h-8 rounded-md px-2.5 text-xs font-medium text-muted hover:bg-surface-subtle" onClick={onClose}>Cancel</button>
          <button type="submit" form="lead-form" className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white disabled:opacity-60" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : lead ? "Save changes" : "Add lead"}
          </button>
        </>
      }
    >
      <form id="lead-form" className="space-y-3" onSubmit={form.handleSubmit(submit)} noValidate>
        <LeadField label="Full name" error={form.formState.errors.full_name?.message}>
          <input {...form.register("full_name")} className={inputClassName} autoFocus />
        </LeadField>
        <LeadField label="Email" error={form.formState.errors.email?.message}>
          <input {...form.register("email")} type="email" className={inputClassName} />
        </LeadField>
        <LeadField label="Phone" error={form.formState.errors.phone?.message}>
          <input {...form.register("phone")} type="tel" className={inputClassName} />
        </LeadField>
        <LeadField label="Source" error={form.formState.errors.source?.message}>
          <input {...form.register("source")} className={inputClassName} placeholder="Optional" />
        </LeadField>
        <LeadField label="Status" error={form.formState.errors.status?.message}>
          <select {...form.register("status")} className={inputClassName}>
            {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </LeadField>
      </form>
    </Modal>
  );
}

function LeadImportModal({ isOpen, onClose, onSuccess, onError }: { isOpen: boolean; onClose: () => void; onSuccess: (message: string) => Promise<void>; onError: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LeadImportPreview | null>(null);
  const previewMutation = useMutation({ mutationFn: previewLeadImport, onSuccess: setPreview, onError: (error) => onError(getErrorMessage(error)) });
  const importMutation = useMutation({ mutationFn: importLeads, onSuccess: async (result) => onSuccess(`${result.created_rows} lead${result.created_rows === 1 ? "" : "s"} imported.`), onError: (error) => onError(getErrorMessage(error)) });

  return (
    <Modal title="Import leads" isOpen={isOpen} onClose={onClose} size="md" footer={
      <>
        <button type="button" className="h-8 rounded-md px-2.5 text-xs font-medium text-muted hover:bg-surface-subtle" onClick={onClose}>Cancel</button>
        {preview ? <button type="button" className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white disabled:opacity-60" disabled={!file || importMutation.isPending || preview.valid_rows === 0} onClick={() => file && importMutation.mutate(file)}>{importMutation.isPending ? "Importing…" : "Import valid leads"}</button> : <button type="button" className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white disabled:opacity-60" disabled={!file || previewMutation.isPending} onClick={() => file && previewMutation.mutate(file)}>{previewMutation.isPending ? "Checking…" : "Preview import"}</button>}
      </>
    }>
      <div className="space-y-4">
        {!preview ? <>
          <p className="text-sm text-muted">Upload an XLSX or CSV file. Supported columns: Full Name, Email, Phone, Source, and Status.</p>
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-4 text-sm text-primary hover:bg-surface-subtle">
            <FileUp className="h-4 w-4 text-brand" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{file?.name ?? "Choose a spreadsheet"}</span>
            <input type="file" className="sr-only" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} />
          </label>
        </> : <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ImportCount label="Rows" value={preview.total_rows} />
            <ImportCount label="Ready" value={preview.valid_rows} tone="text-success" />
            <ImportCount label="Duplicates" value={preview.duplicate_rows} tone="text-warning" />
            <ImportCount label="Invalid" value={preview.invalid_rows} tone="text-danger" />
          </div>
          <p className="text-xs leading-5 text-muted">Only ready rows will be created. Duplicate and invalid rows are skipped.</p>
          {preview.issues.length ? <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border bg-surface-subtle p-2">{preview.issues.map((issue, index) => <p key={`${issue.row}-${index}`} className="text-xs text-muted">Row {issue.row}: {issue.message}</p>)}</div> : null}
          <button type="button" className="text-xs font-medium text-brand hover:underline" onClick={() => setPreview(null)}>Choose another file</button>
        </>}
      </div>
    </Modal>
  );
}

function DeleteLeadModal({ lead, isDeleting, onClose, onConfirm }: { lead: Lead | null; isDeleting: boolean; onClose: () => void; onConfirm: () => void }) {
  return <Modal title="Delete lead" isOpen={Boolean(lead)} onClose={onClose} footer={<><button type="button" className="h-8 rounded-md px-2.5 text-xs font-medium text-muted hover:bg-surface-subtle" onClick={onClose}>Cancel</button><button type="button" className="h-8 rounded-md bg-danger px-3 text-xs font-medium text-white disabled:opacity-60" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? "Deleting…" : "Delete permanently"}</button></>}><p className="text-sm leading-6 text-muted">Delete {lead?.full_name}? This cannot be undone.</p></Modal>;
}

function ConvertLeadModal({ lead, onClose, onSuccess, onError }: { lead: Lead | null; onClose: () => void; onSuccess: (studentId: string) => Promise<void>; onError: (message: string) => void }) {
  const [email, setEmail] = useState(lead?.email ?? "");
  const [programType, setProgramType] = useState<"one_on_one" | "batch">("one_on_one");
  const mutation = useMutation({
    mutationFn: () => {
      if (!lead || !email.trim()) throw new Error("An email is required to create a student account.");
      return convertLead(lead.id, { email: email.trim(), programType });
    },
    onSuccess: async (result) => onSuccess(result.student_id),
    onError: (error) => onError(getErrorMessage(error)),
  });
  return <Modal title="Convert to student" isOpen={Boolean(lead)} onClose={onClose} footer={<><button type="button" className="h-8 rounded-md px-2.5 text-xs font-medium text-muted hover:bg-surface-subtle" onClick={onClose}>Cancel</button><button type="button" className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white disabled:opacity-60" disabled={mutation.isPending || !email.trim()} onClick={() => mutation.mutate()}>{mutation.isPending ? "Converting…" : "Convert"}</button></>}><div className="space-y-3"><p className="text-xs leading-5 text-muted">Creates an enrolled student from {lead?.full_name}. Payment and access remain separate follow-up actions.</p><LeadField label="Student email"><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className={inputClassName} autoFocus /></LeadField><LeadField label="Program"><FilterSelect value={programType} includeAll={false} options={[{ value: "one_on_one", label: "1-on-1" }, { value: "batch", label: "Batch" }]} onChange={(value) => setProgramType(value as "one_on_one" | "batch")} className="w-full" triggerClassName="w-full" /></LeadField></div></Modal>;
}

function LeadField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-medium text-primary">{label}</span>{children}{error ? <span className="block text-xs text-danger">{error}</span> : null}</label>;
}

function ImportCount({ label, value, tone = "text-primary" }: { label: string; value: number; tone?: string }) {
  return <div className="rounded-md border border-border bg-surface p-2.5"><p className="text-[11px] font-medium text-muted">{label}</p><p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p></div>;
}

function LeadNotice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  if (!notice) return null;
  return <div className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-md border bg-surface px-3 py-2.5 shadow-lg ${notice.tone === "error" ? "border-danger" : "border-border"}`} role="status"><AlertCircle className={`h-4 w-4 shrink-0 ${notice.tone === "error" ? "text-danger" : "text-success"}`} aria-hidden="true" /><p className="min-w-0 text-xs font-medium text-primary">{notice.message}</p><button type="button" className="text-muted hover:text-primary" onClick={onClose} aria-label="Dismiss notification"><X className="h-3.5 w-3.5" /></button></div>;
}

// eslint-disable-next-line react-refresh/only-export-components -- exercised as URL-state logic.
export function getLeadFilters(searchParams: URLSearchParams) {
  const status = searchParams.get("status");
  return {
    q: searchParams.get("q") ?? "",
    status: isLeadStatus(status) ? status : undefined,
    page: Math.max(1, Number(searchParams.get("page")) || 1),
    pageSize: PAGE_SIZE,
  };
}

function getLeadFormDefaults(lead: Lead | null): LeadFormValues {
  return { full_name: lead?.full_name ?? "", email: lead?.email ?? "", phone: lead?.phone ?? "", source: lead?.source ?? "", status: lead?.status ?? "new" };
}

function isLeadStatus(value: string | null): value is LeadStatus {
  return statusOptions.some((option) => option.value === value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) return response.data.detail;
  }
  return "Something went wrong. Please try again.";
}

const inputClassName = "h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-border-strong";
