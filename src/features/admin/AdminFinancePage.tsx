import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Link, useSearchParams } from "react-router";
import { ExternalLink, Plus } from "lucide-react";
import { addDays, startOfMonth, startOfYear, subDays } from "date-fns";

import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { DebouncedSearchInput } from "@/components/ui/DebouncedSearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { QuietLabel } from "@/components/ui/QuietLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TablePagination } from "@/components/ui/TablePagination";
import { AdminProgramsPage } from "@/features/admin/AdminProgramsPage";
import {
  createAdminPayment,
  deleteAdminPayment,
  getAdminPaymentSummary,
  listAdminPackages,
  listAdminPayments,
  listAdminStudents,
  updateAdminPayment,
  type AdminPaymentRead,
  type PaymentMethod,
} from "@/features/admin/api";

const paymentColumn = createColumnHelper<AdminPaymentRead>();
const methodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
];

type DatePreset = "this_month" | "last_30_days" | "this_year" | "all_time" | "custom";

export function AdminFinancePage() {
  const [params, setParams] = useSearchParams();
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<AdminPaymentRead | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<AdminPaymentRead | null>(null);
  const [noticeStudentId, setNoticeStudentId] = useState<string | null>(null);
  const tab = params.get("tab") === "packages" ? "packages" : "payments";
  const preset = (params.get("range") as DatePreset | null) ?? "this_month";
  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const q = params.get("q") ?? "";
  const paymentMethod = (params.get("method") as PaymentMethod | null) ?? undefined;
  const packageId = params.get("package") ?? undefined;
  const sort = params.get("sort") ?? "paid_at:desc";
  const [sortBy, sortOrder] = sort.split(":") as ["paid_at" | "amount_paid", "asc" | "desc"];
  const range = getPaymentRange(preset, params.get("from"), params.get("to"));
  const update = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };

  const filters = { q, paymentMethod, packageId, currency: "INR", paidFrom: range.from, paidTo: range.to, sortBy, sortOrder, page, pageSize: 25 };
  const payments = useQuery({ queryKey: ["admin", "finance", "payments", filters], queryFn: () => listAdminPayments(filters), enabled: tab === "payments" });
  const summary = useQuery({ queryKey: ["admin", "finance", "summary", filters], queryFn: () => getAdminPaymentSummary(filters), enabled: tab === "payments" });
  const packages = useQuery({ queryKey: ["admin", "packages", "finance-filter"], queryFn: () => listAdminPackages({ pageSize: 100 }), enabled: tab === "payments" });
  const rows = payments.data?.items ?? [];
  const columns = useMemo(() => [
    paymentColumn.accessor("paid_at", { header: "Paid", cell: ({ getValue }) => <QuietLabel>{formatDate(getValue())}</QuietLabel> }),
    paymentColumn.accessor("student", { header: "Student", cell: ({ getValue }) => <Link className="block text-sm font-medium text-primary hover:text-brand" to={`/admin/students/${getValue().id}?tab=payments`}>{getValue().full_name}<span className="mt-0.5 block text-xs font-normal text-muted">{getValue().email}</span></Link> }),
    paymentColumn.accessor("package", { header: "Package", cell: ({ getValue }) => <QuietLabel>{getValue()?.name ?? "Unlinked"}</QuietLabel> }),
    paymentColumn.accessor("amount_paid", { header: "Amount", cell: ({ getValue, row }) => <p className="text-sm font-semibold text-primary">{formatMoney(getValue(), row.original.currency)}</p> }),
    paymentColumn.accessor("payment_method", { header: "Method", cell: ({ getValue }) => <StatusBadge tone="indigo">{paymentMethodLabel(getValue())}</StatusBadge> }),
    paymentColumn.accessor("notes", { header: "Notes", cell: ({ getValue }) => <QuietLabel>{getValue() || "—"}</QuietLabel> }),
    paymentColumn.display({ id: "actions", header: "", cell: ({ row }) => <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}><button className="h-7 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-subtle hover:text-primary" onClick={() => setEditingPayment(row.original)}>Edit</button><button className="h-7 rounded-md px-2 text-xs font-medium text-danger hover:bg-surface-subtle" onClick={() => setDeletingPayment(row.original)}>Delete</button></div> }),
  ], []);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table exposes table helpers this rule cannot memoize safely.
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return <section className="space-y-5"><PageHeader title="Finance" actions={tab === "payments" ? <button type="button" onClick={() => setIsRecordOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-2.5 text-xs font-medium text-white hover:opacity-90"><Plus className="h-3.5 w-3.5" />Record payment</button> : undefined} />
    <div className="flex items-center gap-1 border-b border-border"><TabButton active={tab === "payments"} onClick={() => update({ tab: null, page: null })}>Payments</TabButton><TabButton active={tab === "packages"} onClick={() => update({ tab: "packages", page: null })}>Packages</TabButton></div>
    {tab === "packages" ? <AdminProgramsPage mode="finance" /> : <>
      {noticeStudentId ? <div className="flex items-center justify-between gap-3 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-primary"><span>Payment recorded. Student access is managed separately.</span><Link to={`/admin/students/${noticeStudentId}?tab=access`} className="inline-flex items-center gap-1 font-medium text-brand">Open access <ExternalLink className="h-3 w-3" /></Link><button type="button" className="text-muted hover:text-primary" onClick={() => setNoticeStudentId(null)}>Dismiss</button></div> : null}
      <FinanceSummary summary={summary.data} loading={summary.isLoading} />
      <div className="space-y-3"><DebouncedSearchInput key={q} value={q} onChange={(value) => update({ q: value || null, page: null })} placeholder="Search student name, email, or phone" /><div className="flex flex-wrap items-center gap-2"><FilterSelect label="Range" value={preset} includeAll={false} options={[{ value: "this_month", label: "This month" }, { value: "last_30_days", label: "Last 30 days" }, { value: "this_year", label: "This year" }, { value: "all_time", label: "All time" }, { value: "custom", label: "Custom" }]} onChange={(value) => update({ range: value === "this_month" ? null : value, from: value === "custom" ? params.get("from") ?? dateInputValue(new Date()) : null, to: value === "custom" ? params.get("to") ?? dateInputValue(new Date()) : null, page: null })} /><FilterSelect label="Method" value={paymentMethod ?? ""} options={methodOptions} onChange={(value) => update({ method: value || null, page: null })} /><FilterSelect label="Package" value={packageId ?? ""} options={(packages.data?.items ?? []).map((item) => ({ value: item.id, label: item.name }))} allLabel="All packages" onChange={(value) => update({ package: value || null, page: null })} /><FilterSelect label="Sort" value={sort} includeAll={false} options={[{ value: "paid_at:desc", label: "Newest" }, { value: "paid_at:asc", label: "Oldest" }, { value: "amount_paid:desc", label: "Amount high-low" }, { value: "amount_paid:asc", label: "Amount low-high" }]} onChange={(value) => update({ sort: value === "paid_at:desc" ? null : value, page: null })} />{preset === "custom" ? <CustomRange from={params.get("from") ?? ""} to={params.get("to") ?? ""} onChange={(key, value) => update({ [key]: value || null, page: null })} /> : null}</div></div>
      <div className="hidden md:block"><DataTable table={table} isLoading={payments.isLoading} isError={payments.isError} emptyMessage="No payments in this range" errorMessage="Payments could not be loaded." onRetry={() => void payments.refetch()} minWidth={940} /></div>
      <PaymentCards rows={rows} loading={payments.isLoading} error={payments.isError} onEdit={setEditingPayment} onDelete={setDeletingPayment} />
      <TablePagination page={page} totalPages={Math.max(1, Math.ceil((payments.data?.total ?? 0) / 25))} total={payments.data?.total ?? 0} itemLabel="payments" onPageChange={(next) => update({ page: next > 1 ? String(next) : null })} />
      <PaymentModal isOpen={isRecordOpen || Boolean(editingPayment)} payment={editingPayment} onClose={() => { setIsRecordOpen(false); setEditingPayment(null); }} onRecorded={(studentId) => setNoticeStudentId(studentId)} />
      <DeletePaymentModal payment={deletingPayment} onClose={() => setDeletingPayment(null)} />
    </>}
  </section>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button type="button" onClick={onClick} className={`h-8 border-b-2 px-2 text-xs font-medium transition ${active ? "border-brand text-primary" : "border-transparent text-muted hover:text-primary"}`}>{children}</button>; }
function CustomRange({ from, to, onChange }: { from: string; to: string; onChange: (key: "from" | "to", value: string) => void }) { return <div className="flex items-center gap-1"><input aria-label="From date" type="date" value={from} onChange={(event) => onChange("from", event.target.value)} className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-primary" /><span className="text-xs text-muted">to</span><input aria-label="To date" type="date" value={to} onChange={(event) => onChange("to", event.target.value)} className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-primary" /></div>; }
function FinanceSummary({ summary, loading }: { summary: Awaited<ReturnType<typeof getAdminPaymentSummary>> | undefined; loading: boolean }) { const inr = summary?.currencies.find((item) => item.currency === "INR"); const methods = inr?.methods ?? []; return <div className="grid gap-2 sm:grid-cols-3"><Metric label="Collected" value={loading ? "…" : formatMoney(inr?.total_amount_paid ?? 0, "INR")} /><Metric label="Payments" value={loading ? "…" : String(inr?.count ?? 0)} /><Metric label="Average payment" value={loading ? "…" : formatMoney(inr?.average_amount_paid ?? 0, "INR")} />{methods.length ? <div className="sm:col-span-3 flex flex-wrap gap-x-4 gap-y-1 rounded-md border border-border bg-surface-subtle px-3 py-2 text-xs text-muted">{methods.map((item) => <span key={item.payment_method}>{paymentMethodLabel(item.payment_method)} <strong className="ml-1 font-medium text-primary">{formatMoney(item.total_amount_paid, "INR")}</strong></span>)}</div> : null}</div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border bg-surface px-3 py-2.5"><p className="text-[11px] font-medium text-muted">{label}</p><p className="mt-1 text-base font-semibold text-primary">{value}</p></div>; }
function PaymentCards({ rows, loading, error, onEdit, onDelete }: { rows: AdminPaymentRead[]; loading: boolean; error: boolean; onEdit: (payment: AdminPaymentRead) => void; onDelete: (payment: AdminPaymentRead) => void }) { if (loading) return <div className="md:hidden rounded-md border border-border bg-surface p-4 text-sm text-muted">Loading payments…</div>; if (error) return <div className="md:hidden rounded-md border border-danger bg-surface p-4 text-sm text-danger">Payments could not be loaded.</div>; if (!rows.length) return <div className="md:hidden rounded-md border border-border bg-surface p-4 text-sm text-muted">No payments in this range</div>; return <div className="grid gap-2 md:hidden">{rows.map((payment) => <article key={payment.id} className="rounded-md border border-border bg-surface p-3"><div className="flex justify-between gap-3"><Link className="min-w-0 text-sm font-semibold text-primary" to={`/admin/students/${payment.student.id}?tab=payments`}>{payment.student.full_name}<span className="mt-0.5 block truncate text-xs font-normal text-muted">{payment.student.email}</span></Link><p className="shrink-0 text-sm font-semibold text-primary">{formatMoney(payment.amount_paid, payment.currency)}</p></div><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted"><span>{formatDate(payment.paid_at)}</span><span>{payment.package?.name ?? "Unlinked"}</span><span>{paymentMethodLabel(payment.payment_method)}</span></div>{payment.notes ? <p className="mt-2 text-xs text-muted">{payment.notes}</p> : null}<div className="mt-2 flex gap-1"><button className="h-7 rounded-md px-2 text-xs text-muted hover:bg-surface-subtle" onClick={() => onEdit(payment)}>Edit</button><button className="h-7 rounded-md px-2 text-xs text-danger hover:bg-surface-subtle" onClick={() => onDelete(payment)}>Delete</button></div></article>)}</div>; }

/* eslint-disable react-hooks/set-state-in-effect -- form state intentionally hydrates when a distinct payment modal opens. */
function PaymentModal({ isOpen, payment, onClose, onRecorded }: { isOpen: boolean; payment: AdminPaymentRead | null; onClose: () => void; onRecorded: (studentId: string) => void }) { const client = useQueryClient(); const [studentSearch, setStudentSearch] = useState(""); const [studentId, setStudentId] = useState(""); const [amount, setAmount] = useState(""); const [method, setMethod] = useState<PaymentMethod>("upi"); const [packageId, setPackageId] = useState(""); const [paidAt, setPaidAt] = useState(() => dateTimeInputValue(new Date())); const [notes, setNotes] = useState(""); useEffect(() => { if (!isOpen) return; setStudentId(payment?.student.id ?? ""); setStudentSearch(""); setAmount(payment ? String(payment.amount_paid / 100) : ""); setMethod(payment?.payment_method ?? "upi"); setPackageId(payment?.package_id ?? ""); setPaidAt(payment ? dateTimeInputValue(new Date(payment.paid_at)) : dateTimeInputValue(new Date())); setNotes(payment?.notes ?? ""); }, [isOpen, payment]); const students = useQuery({ queryKey: ["admin", "finance", "students", studentSearch], queryFn: () => listAdminStudents({ q: studentSearch, pageSize: 10 }), enabled: isOpen && !payment }); const packages = useQuery({ queryKey: ["admin", "packages", "finance-modal"], queryFn: () => listAdminPackages({ pageSize: 100 }), enabled: isOpen }); const reset = () => { setStudentId(""); setStudentSearch(""); setAmount(""); setMethod("upi"); setPackageId(""); setPaidAt(dateTimeInputValue(new Date())); setNotes(""); }; const mutation = useMutation({ mutationFn: () => { const amountPaid = Math.round(Number(amount) * 100); if (!Number.isFinite(amountPaid) || amountPaid < 0 || (!payment && !studentId)) throw new Error("Choose a student and enter a valid amount"); const payload = { packageId, amountPaid, paymentMethod: method, paidAt: new Date(paidAt).toISOString(), notes }; return payment ? updateAdminPayment({ paymentId: payment.id, payload }) : createAdminPayment({ studentId, ...payload }); }, onSuccess: (saved) => { void client.invalidateQueries({ queryKey: ["admin", "finance"] }); void client.invalidateQueries({ queryKey: ["admin", "students"] }); onRecorded(payment?.student.id ?? saved.student.id); reset(); onClose(); } }); const selectedStudent = students.data?.items.find((item) => item.student.id === studentId)?.user; return <Modal title={payment ? "Edit payment" : "Record payment"} isOpen={isOpen} onClose={onClose} footer={<><button className="h-8 rounded-md px-2 text-xs text-muted hover:bg-surface-subtle" onClick={onClose}>Close</button><button disabled={mutation.isPending} className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-white disabled:opacity-50" onClick={() => mutation.mutate()}>{mutation.isPending ? "Saving…" : "Save"}</button></>}><div className="space-y-3">{payment ? <p className="text-xs text-muted">Student: <span className="font-medium text-primary">{payment.student.full_name}</span></p> : <><DebouncedSearchInput value={studentSearch} onChange={setStudentSearch} placeholder="Find student" />{studentId ? <p className="text-xs font-medium text-primary">Selected: {selectedStudent?.full_name}</p> : null}<div className="max-h-28 overflow-y-auto rounded-md border border-border">{(students.data?.items ?? []).map((item) => <button type="button" key={item.student.id} onClick={() => setStudentId(item.student.id)} className="block w-full border-b border-border px-2 py-1.5 text-left text-xs text-primary last:border-0 hover:bg-surface-subtle">{item.user.full_name}<span className="ml-1 text-muted">{item.user.email}</span></button>)}</div></>}<Field label="Amount (INR)" type="number" value={amount} onChange={setAmount} /><FilterSelect label="Method" value={method} includeAll={false} options={methodOptions} onChange={(value) => setMethod(value as PaymentMethod)} className="w-full" triggerClassName="w-full" /><FilterSelect label="Package" value={packageId} options={(packages.data?.items ?? []).map((item) => ({ value: item.id, label: item.name }))} allLabel="Optional package" onChange={setPackageId} className="w-full" triggerClassName="w-full" /><Field label="Paid at" type="datetime-local" value={paidAt} onChange={setPaidAt} /><Field label="Notes" value={notes} onChange={setNotes} />{mutation.isError ? <p className="text-xs text-danger">{mutation.error.message}</p> : null}</div></Modal>; }
/* eslint-enable react-hooks/set-state-in-effect */
function DeletePaymentModal({ payment, onClose }: { payment: AdminPaymentRead | null; onClose: () => void }) { const client = useQueryClient(); const mutation = useMutation({ mutationFn: () => payment ? deleteAdminPayment(payment.id) : Promise.resolve(), onSuccess: () => { void client.invalidateQueries({ queryKey: ["admin", "finance"] }); onClose(); } }); return <Modal title="Delete payment" isOpen={Boolean(payment)} onClose={onClose} footer={<><button className="h-8 rounded-md px-2 text-xs text-muted hover:bg-surface-subtle" onClick={onClose}>Keep</button><button disabled={mutation.isPending} className="h-8 rounded-md px-3 text-xs font-medium text-danger hover:bg-surface-subtle" onClick={() => mutation.mutate()}>{mutation.isPending ? "Deleting…" : "Delete"}</button></>}><p className="text-xs leading-5 text-muted">This permanently removes the payment record only. Student access is managed separately.</p></Modal>; }
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="mb-1 block text-[11px] font-medium text-muted">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-primary outline-none focus:border-border-strong focus:ring-2 focus:ring-brand/15" /></label>; }
// eslint-disable-next-line react-refresh/only-export-components -- exported for focused URL-range tests.
export function getPaymentRange(preset: DatePreset, from: string | null, to: string | null) { const now = new Date(); if (preset === "all_time") return {}; if (preset === "custom") return { from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined, to: to ? new Date(`${to}T00:00:00`).toISOString() : undefined }; const start = preset === "this_month" ? startOfMonth(now) : preset === "last_30_days" ? subDays(now, 30) : startOfYear(now); return { from: start.toISOString(), to: (preset === "this_month" ? startOfMonth(addDays(start, 32)) : addDays(now, 1)).toISOString() }; }
function dateInputValue(value: Date) { return value.toISOString().slice(0, 10); }
function dateTimeInputValue(value: Date) { return value.toISOString().slice(0, 16); }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
function formatMoney(value: number, currency: string) { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value / 100); }
function paymentMethodLabel(method: PaymentMethod) { return method === "upi" ? "UPI" : method === "bank_transfer" ? "Bank transfer" : method[0].toUpperCase() + method.slice(1); }
