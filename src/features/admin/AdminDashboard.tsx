import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UserRoundPlus,
} from "lucide-react";

import {
  getAdminDashboardSummary,
  listAdminClassSessions,
  listAdminPayments,
  type AdminPaymentRead,
  type AdminDashboardSummary,
  type ClassSessionRead,
  type DashboardWindowParams,
} from "@/features/admin/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

type DashboardWindowPreset = "today" | "next-7-days";

const windowOptions: Array<{ value: DashboardWindowPreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "next-7-days", label: "Next 7 days" },
];

const localDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const localDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

const numberFormatter = new Intl.NumberFormat();
const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function getDashboardWindow(preset: DashboardWindowPreset): DashboardWindowParams {
  const now = new Date();
  const startsAt = new Date(now);
  startsAt.setHours(0, 0, 0, 0);

  const endsAt = new Date(startsAt);
  endsAt.setDate(startsAt.getDate() + (preset === "today" ? 1 : 7));

  return {
    startsFrom: startsAt.toISOString(),
    startsTo: endsAt.toISOString(),
  };
}

function formatLocalDateTime(value: string) {
  return localDateTimeFormatter.format(new Date(value));
}

function formatLocalWindow(summary: AdminDashboardSummary) {
  return `${localDateFormatter.format(new Date(summary.window.starts_from))} to ${localDateFormatter.format(
    new Date(summary.window.starts_to),
  )}`;
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatMinorCurrency(value: number) {
  return currencyFormatter.format(value / 100);
}

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPaymentDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export function AdminDashboard() {
  const [windowPreset, setWindowPreset] = useState<DashboardWindowPreset>("today");
  const dashboardWindow = useMemo(() => getDashboardWindow(windowPreset), [windowPreset]);

  const summaryQuery = useQuery({
    queryKey: ["admin", "dashboard-summary", dashboardWindow],
    queryFn: () => getAdminDashboardSummary(dashboardWindow),
  });
  const sessionsQuery = useQuery({
    queryKey: ["admin", "dashboard-sessions", dashboardWindow],
    queryFn: () =>
      listAdminClassSessions({
        startsFrom: dashboardWindow.startsFrom,
        startsTo: dashboardWindow.startsTo,
        status: "scheduled",
        sortOrder: "asc",
        pageSize: 6,
      }),
  });
  const recentPaymentsQuery = useQuery({
    queryKey: ["admin", "dashboard-recent-payments"],
    queryFn: () => listAdminPayments({ currency: "INR", pageSize: 6 }),
  });

  const summary = summaryQuery.data;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Dashboard"
        actions={
          <>
            <div
              className="inline-flex h-7 items-center rounded-md border border-border bg-surface p-0.5"
              aria-label="Dashboard window"
            >
              {windowOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "h-6 whitespace-nowrap rounded px-2 text-sm font-medium leading-none text-muted transition hover:text-primary",
                    windowPreset === option.value &&
                      "bg-background text-brand shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
                  )}
                  onClick={() => setWindowPreset(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="inline-grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-surface-subtle hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void summaryQuery.refetch()}
              disabled={summaryQuery.isFetching}
              aria-label="Refresh dashboard"
              title="Refresh"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", summaryQuery.isFetching && "animate-spin")}
                aria-hidden="true"
              />
            </button>
          </>
        }
      />

      {summaryQuery.isLoading ? <DashboardLoading /> : null}
      {summaryQuery.isError ? <DashboardError onRetry={() => void summaryQuery.refetch()} /> : null}
      {summary ? (
        <DashboardSummary
          summary={summary}
          sessions={sessionsQuery.data?.items ?? []}
          sessionsLoading={sessionsQuery.isLoading}
          sessionsError={sessionsQuery.isError}
          payments={recentPaymentsQuery.data?.items ?? []}
          paymentsLoading={recentPaymentsQuery.isLoading}
          paymentsError={recentPaymentsQuery.isError}
          isToday={windowPreset === "today"}
        />
      ) : null}
    </section>
  );
}

function DashboardSummary({
  summary,
  sessions,
  sessionsLoading,
  sessionsError,
  payments,
  paymentsLoading,
  paymentsError,
  isToday,
}: {
  summary: AdminDashboardSummary;
  sessions: ClassSessionRead[];
  sessionsLoading: boolean;
  sessionsError: boolean;
  payments: AdminPaymentRead[];
  paymentsLoading: boolean;
  paymentsError: boolean;
  isToday: boolean;
}) {
  const actionTotal = Object.values(summary.action_items).reduce((total, value) => total + value, 0);
  const cards = [
    {
      label: "Learners",
      value: summary.students.total,
      detail: `${formatNumber(summary.students.active)} active, ${formatNumber(
        summary.students.expired_access,
      )} expired access`,
      icon: GraduationCap,
      to: "/admin/students",
    },
    {
      label: "Sessions",
      value: summary.classes.scheduled,
      detail: `${formatNumber(summary.classes.completed)} completed, ${formatNumber(
        summary.classes.cancelled,
      )} cancelled`,
      icon: CalendarDays,
      to: "/admin/schedule",
    },
    {
      label: "Bookings",
      value: summary.bookings.booked,
      detail: `${formatNumber(summary.bookings.attended)} attended, ${formatNumber(
        summary.bookings.missed,
      )} missed`,
      icon: CalendarDays,
      to: "/admin/schedule",
    },
    {
      label: "Follow-ups",
      value: actionTotal,
      detail: actionTotal === 1 ? "One item needs review" : "Items need review",
      icon: ShieldAlert,
      tone: actionTotal > 0 ? "warning" : "default",
      to: "#needs-attention",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-primary">{formatLocalWindow(summary)}</p>
        <p className="text-xs text-muted">Updated {formatLocalDateTime(summary.window.generated_at)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link key={card.label} to={card.to} className="group rounded-md border border-border bg-surface p-4 transition hover:border-border-strong hover:bg-surface-subtle">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{card.label}</p>
                  <p className={cn("mt-2 text-2xl font-semibold tracking-tight text-primary", card.tone === "warning" && "text-warning")}>
                    {card.value}
                  </p>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-md bg-surface-subtle text-brand transition group-hover:bg-brand/10">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">{card.detail}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <NeedsAttention items={summary.action_items} />
        <OperationalPulse summary={summary} />
      </div>

      <section className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-primary">Learner mix</h2>
            <p className="mt-0.5 text-xs text-muted">Current learner lifecycle and access coverage.</p>
          </div>
          <GraduationCap className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 sm:divide-y-0">
          <SummaryCell label="Enrolled" value={summary.students.enrolled} to="/admin/students?status=enrolled" />
          <SummaryCell label="Paused" value={summary.students.paused} to="/admin/students?status=paused" />
          <SummaryCell label="Completed" value={summary.students.completed} to="/admin/students?status=completed" />
          <SummaryCell label="Cancelled" value={summary.students.cancelled} to="/admin/students?status=cancelled" />
          <SummaryCell label="Active access" value={summary.students.active_with_valid_access} to="/admin/students?status=active&access_state=valid" />
          <SummaryCell label="Expired access" value={summary.students.expired_access} to="/admin/students?status=active&access_state=expired" tone="danger" />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
        <SchedulePanel
          sessions={sessions}
          loading={sessionsLoading}
          error={sessionsError}
          title={isToday ? "Today’s schedule" : "Upcoming schedule"}
        />
        <RecentPaymentsPanel payments={payments} loading={paymentsLoading} error={paymentsError} />
      </div>
    </div>
  );
}

function OperationalPulse({ summary }: { summary: AdminDashboardSummary }) {
  const rows = [
    { label: "Active teachers", value: summary.teachers.active, detail: `${formatNumber(summary.teachers.total)} total`, to: "/admin/teachers" },
    { label: "Active groups", value: summary.batch_groups.active, detail: `${formatNumber(summary.batch_groups.total)} total`, to: "/admin/programs" },
    { label: "Valid access", value: summary.students.active_with_valid_access, detail: "Active learners covered", to: "/admin/students?status=active&access_state=valid" },
    { label: "Attendance done", value: summary.bookings.attended, detail: "In selected window", to: "/admin/schedule" },
  ];

  return (
    <section className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-primary">Operational pulse</h2>
          <p className="mt-0.5 text-xs text-muted">Core coverage at a glance.</p>
        </div>
        <TrendingUp className="h-4 w-4 text-muted" aria-hidden="true" />
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <Link key={row.label} to={row.to} className="group flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-surface-subtle">
            <div>
              <p className="text-sm font-medium text-primary">{row.label}</p>
              <p className="mt-0.5 text-xs text-muted">{row.detail}</p>
            </div>
            <span className="flex items-center gap-1.5 text-lg font-semibold text-primary">{formatNumber(row.value)}<ArrowUpRight className="h-3.5 w-3.5 text-muted transition group-hover:text-brand" aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SchedulePanel({
  sessions,
  loading,
  error,
  title,
}: {
  sessions: ClassSessionRead[];
  loading: boolean;
  error: boolean;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-surface">
      <PanelHeader title={title} to="/admin/schedule" action="Open schedule" />
      {loading ? <PanelMessage>Loading sessions…</PanelMessage> : null}
      {error ? <PanelMessage tone="danger">Sessions could not be loaded.</PanelMessage> : null}
      {!loading && !error && !sessions.length ? <PanelMessage>No scheduled sessions in this window.</PanelMessage> : null}
      {!loading && !error && sessions.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-border bg-surface-subtle text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              <tr><th className="px-4 py-2.5">Time</th><th className="px-4 py-2.5">Session</th><th className="px-4 py-2.5">Teacher</th><th className="px-4 py-2.5 text-right">Booked</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((session) => (
                <tr key={session.id} className="transition hover:bg-surface-subtle">
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-primary">{formatSessionTime(session.starts_at)}</td>
                  <td className="px-4 py-3"><Link to="/admin/schedule" className="text-sm font-medium text-primary hover:text-brand">{session.batch_group?.name ?? (session.program_type === "one_on_one" ? "1-on-1 session" : "Batch session")}</Link><p className="mt-0.5 text-xs text-muted">{session.program_type === "one_on_one" ? "1-on-1" : "Batch"}</p></td>
                  <td className="px-4 py-3 text-xs text-muted">{session.teacher?.display_name ?? "Unassigned"}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-primary">{formatNumber(session.booking_counts?.booked ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function RecentPaymentsPanel({ payments, loading, error }: { payments: AdminPaymentRead[]; loading: boolean; error: boolean }) {
  return (
    <section id="needs-attention" className="overflow-hidden rounded-md border border-border bg-surface">
      <PanelHeader title="Recent payments" to="/admin/payments" action="Open finance" />
      {loading ? <PanelMessage>Loading payments…</PanelMessage> : null}
      {error ? <PanelMessage tone="danger">Payments could not be loaded.</PanelMessage> : null}
      {!loading && !error && !payments.length ? <PanelMessage>No payments recorded yet.</PanelMessage> : null}
      {!loading && !error && payments.length ? (
        <div className="divide-y divide-border">
          {payments.map((payment) => (
            <Link key={payment.id} to={`/admin/students/${payment.student.id}?tab=payments`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-subtle">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{payment.student.full_name.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-primary">{payment.student.full_name}</span><span className="mt-0.5 block text-xs text-muted">{formatPaymentDate(payment.paid_at)} · {payment.payment_method.replace("_", " ")}</span></span>
              <span className="text-right"><span className="block text-sm font-semibold text-primary">{formatMinorCurrency(payment.amount_paid)}</span><span className="mt-0.5 block truncate text-xs text-muted">{payment.package?.name ?? "Unlinked"}</span></span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PanelHeader({ title, to, action }: { title: string; to: string; action: string }) {
  return <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><h2 className="text-sm font-semibold text-primary">{title}</h2><Link to={to} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-primary">{action}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>;
}

function PanelMessage({ children, tone = "muted" }: { children: string; tone?: "muted" | "danger" }) {
  return <p className={cn("px-4 py-8 text-center text-sm", tone === "danger" ? "text-danger" : "text-muted")}>{children}</p>;
}

function NeedsAttention({ items }: { items: AdminDashboardSummary["action_items"] }) {
  const allRows = [
    {
      label: "Students need access",
      count: items.no_access,
      detail: "Assign an access window",
      to: "/admin/students?access_state=none",
      icon: ShieldAlert,
      tone: "warning",
    },
    {
      label: "Student access expired",
      count: items.expired_access,
      detail: "Extend access to continue learning",
      to: "/admin/students?access_state=expired",
      icon: ShieldAlert,
      tone: "danger",
    },
    {
      label: "Leads ready to convert",
      count: items.unconverted_enrolled_leads,
      detail: "Create student records",
      to: "/admin/leads?status=enrolled",
      icon: UserRoundPlus,
      tone: "brand",
    },
    {
      label: "Attendance to record",
      count: items.attendance_due,
      detail: "Close out completed sessions",
      to: "/admin/schedule",
      icon: ClipboardCheck,
      tone: "brand",
    },
  ];
  const rows = allRows.filter((row) => row.count > 0);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-primary">Needs attention</h2>
          <p className="mt-0.5 text-xs text-muted">
            {total > 0 ? "Work waiting for an admin follow-up." : "Nothing waiting for follow-up."}
          </p>
        </div>
        <span className={cn("text-right", total > 0 ? "text-primary" : "text-muted")}>
          <span className="block text-lg font-semibold leading-none">{formatNumber(total)}</span>
          <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.08em]">Open</span>
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="flex min-h-44 items-center justify-center px-4 py-8 text-center">
          <div>
            <ClipboardCheck className="mx-auto h-5 w-5 text-brand" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-primary">You are all caught up.</p>
            <p className="mt-1 text-xs text-muted">No access, conversion, or attendance work is waiting.</p>
          </div>
        </div>
      ) : (
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <Link key={row.label} to={row.to} className="group flex min-w-0 items-center gap-3 px-4 py-3 transition hover:bg-surface-subtle">
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-md",
                row.tone === "danger" && "bg-danger/10 text-danger",
                row.tone === "warning" && "bg-warning/10 text-warning",
                row.tone === "brand" && "bg-brand/10 text-brand",
              )}
            >
              <row.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-primary">{row.label}</span>
              <span className="mt-0.5 block truncate text-xs text-muted">{row.detail}</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              {formatNumber(row.count)}
              <ArrowUpRight className="h-3.5 w-3.5 text-muted transition group-hover:text-brand" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
      )}
    </section>
  );
}

function SummaryCell({
  label,
  value,
  to,
  tone = "default",
}: {
  label: string;
  value: number;
  to: string;
  tone?: "default" | "danger";
}) {
  return (
    <Link to={to} className="group px-4 py-3 transition hover:bg-surface-subtle">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 flex items-center gap-1 text-lg font-semibold text-primary", tone === "danger" && value > 0 && "text-danger")}>
        {formatNumber(value)} <ArrowUpRight className="h-3.5 w-3.5 text-muted transition group-hover:text-brand" aria-hidden="true" />
      </p>
    </Link>
  );
}

function DashboardLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-md border border-border bg-surface"
        />
      ))}
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-md border border-danger bg-surface p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-primary">Dashboard unavailable</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              The admin summary could not be loaded. Check that the backend is running, then retry.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-primary transition hover:bg-surface-subtle"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
