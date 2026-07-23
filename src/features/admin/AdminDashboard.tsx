import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CircleDollarSign,
  GraduationCap,
  RefreshCw,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import {
  getAdminDashboardSummary,
  type AdminDashboardSummary,
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

export function AdminDashboard() {
  const [windowPreset, setWindowPreset] = useState<DashboardWindowPreset>("today");
  const dashboardWindow = useMemo(() => getDashboardWindow(windowPreset), [windowPreset]);

  const summaryQuery = useQuery({
    queryKey: ["admin", "dashboard-summary", dashboardWindow],
    queryFn: () => getAdminDashboardSummary(dashboardWindow),
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
      {summary ? <DashboardSummary summary={summary} /> : null}
    </section>
  );
}

function DashboardSummary({ summary }: { summary: AdminDashboardSummary }) {
  const cards = [
    {
      label: "Learners",
      value: summary.students.total,
      detail: `${formatNumber(summary.students.active)} active, ${formatNumber(
        summary.students.expired_access,
      )} expired access`,
      icon: GraduationCap,
    },
    {
      label: "Teachers",
      value: summary.teachers.total,
      detail: `${formatNumber(summary.teachers.active)} active, ${formatNumber(
        summary.teachers.inactive,
      )} inactive`,
      icon: UsersRound,
    },
    {
      label: "Groups",
      value: summary.batch_groups.total,
      detail: `${formatNumber(summary.batch_groups.active)} active groups`,
      icon: TrendingUp,
    },
    {
      label: "Sessions",
      value: summary.classes.scheduled,
      detail: `${formatNumber(summary.classes.completed)} completed, ${formatNumber(
        summary.classes.cancelled,
      )} cancelled`,
      icon: CalendarDays,
    },
    {
      label: "Bookings",
      value: summary.bookings.booked,
      detail: `${formatNumber(summary.bookings.attended)} attended, ${formatNumber(
        summary.bookings.missed,
      )} missed`,
      icon: CalendarDays,
    },
    {
      label: "Payments",
      value: formatMinorCurrency(summary.payments.total_amount_paid),
      detail: `${formatNumber(summary.payments.count)} payments recorded`,
      icon: CircleDollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-surface px-4 py-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-primary">{formatLocalWindow(summary)}</p>
          <p className="text-xs text-muted">
            Generated {formatLocalDateTime(summary.window.generated_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.label} className="rounded-md border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-primary">{card.value}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-md bg-surface-subtle text-brand">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-sm text-muted">{card.detail}</p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-primary">Operational Mix</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <SummaryRow label="Enrolled" value={summary.students.enrolled} />
            <SummaryRow label="Paused" value={summary.students.paused} />
            <SummaryRow label="Completed" value={summary.students.completed} />
            <SummaryRow label="Cancelled" value={summary.students.cancelled} />
            <SummaryRow label="Active access" value={summary.students.active_with_valid_access} />
            <SummaryRow label="Expired access" value={summary.students.expired_access} />
          </div>
        </section>

        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-primary">Focus</h2>
          <div className="mt-5 space-y-4">
            <FocusItem
              label="Access follow-up"
              value={summary.students.expired_access}
              caption="Active learners whose access has expired."
            />
            <FocusItem
              label="Attendance review"
              value={summary.bookings.missed}
              caption="Missed bookings in the selected window."
            />
            <FocusItem
              label="Teacher capacity"
              value={summary.teachers.active}
              caption="Active teachers available for operations planning."
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-semibold text-primary">{formatNumber(value)}</span>
    </div>
  );
}

function FocusItem({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="border-l-2 border-brand pl-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-primary">{label}</p>
        <p className="text-sm font-semibold text-primary">{formatNumber(value)}</p>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted">{caption}</p>
    </div>
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
