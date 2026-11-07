import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, isToday } from "date-fns";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  CreditCard,
  GraduationCap,
  LoaderCircle,
  MailOpen,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/features/auth/auth-context";
import {
  listNotifications,
  markAllNotificationsRead,
  setNotificationRead,
  type NotificationItem,
} from "@/features/notifications/api";
import { cn } from "@/lib/utils";

const categories = ["all", "classes", "access", "account", "feedback", "payments", "updates"];

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<"all" | "unread">("all");
  const [category, setCategory] = useState("all");
  const queryKey = ["notifications", state, category];
  const notifications = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      listNotifications({
        state,
        category: category === "all" ? undefined : category,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const updateRead = useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      setNotificationRead(id, isRead),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const items = useMemo(
    () => notifications.data?.pages.flatMap((page) => page.items) ?? [],
    [notifications.data],
  );
  const todayItems = items.filter((item) => isToday(new Date(item.occurred_at)));
  const olderItems = items.filter((item) => !isToday(new Date(item.occurred_at)));
  const portalLabel =
    user?.role === "admin" ? "Admin" : user?.role === "teacher" ? "Teacher" : "Student";

  const openNotification = (notification: NotificationItem) => {
    if (!notification.read_at) updateRead.mutate({ id: notification.id, isRead: true });
    if (notification.action_url) navigate(notification.action_url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={portalLabel}
        title="Notifications"
        actions={
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || !items.some((item) => !item.read_at)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-surface-subtle hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "unread"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setState(value)}
            className={cn(
              "h-8 rounded-md px-3 text-xs font-medium transition",
              state === value ? "bg-surface-subtle text-primary" : "text-muted hover:text-primary",
            )}
          >
            {value === "all" ? "All" : "Unread"}
          </button>
        ))}
        <div className="ml-auto flex max-w-full gap-1 overflow-x-auto pb-0.5">
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={cn(
                "h-8 whitespace-nowrap rounded-md px-2 text-xs capitalize transition",
                category === value ? "text-brand" : "text-muted hover:text-primary",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {notifications.isLoading ? <NotificationLoading /> : null}
      {notifications.isError ? (
        <div className="rounded-lg border border-border bg-surface p-5 text-sm text-muted">
          Notifications are unavailable.{" "}
          <button className="text-brand" onClick={() => void notifications.refetch()}>
            Try again
          </button>
        </div>
      ) : null}
      {!notifications.isLoading && !notifications.isError && items.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-surface-subtle/40 p-6 text-center">
          <div>
            <Bell className="mx-auto h-5 w-5 text-muted" />
            <p className="mt-3 text-sm font-medium text-primary">You’re all caught up</p>
            <p className="mt-1 text-xs text-muted">
              Updates that need your attention will appear here.
            </p>
          </div>
        </div>
      ) : null}
      {todayItems.length > 0 ? (
        <NotificationGroup
          label="Today"
          items={todayItems}
          role={user?.role}
          onOpen={openNotification}
          onToggle={updateRead.mutate}
        />
      ) : null}
      {olderItems.length > 0 ? (
        <NotificationGroup
          label="Earlier"
          items={olderItems}
          role={user?.role}
          onOpen={openNotification}
          onToggle={updateRead.mutate}
        />
      ) : null}
      {notifications.hasNextPage ? (
        <button
          type="button"
          onClick={() => void notifications.fetchNextPage()}
          disabled={notifications.isFetchingNextPage}
          className="mx-auto flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium text-muted hover:bg-surface-subtle hover:text-primary"
        >
          {notifications.isFetchingNextPage ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          Load more
        </button>
      ) : null}
    </div>
  );
}

function NotificationGroup({
  label,
  items,
  role,
  onOpen,
  onToggle,
}: {
  label: string;
  items: NotificationItem[];
  role: string | undefined;
  onOpen: (notification: NotificationItem) => void;
  onToggle: (input: { id: string; isRead: boolean }) => void;
}) {
  return (
    <section>
      <p className="mb-2 text-xs font-medium text-muted">{label}</p>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((notification) => (
          <article
            key={notification.id}
            className={cn(
              "group flex items-start gap-3 border-b border-border px-3 py-3.5 last:border-0 sm:px-4",
              !notification.read_at && "bg-brand/[0.035]",
            )}
          >
            <NotificationIcon notificationType={notification.notification_type} unread={!notification.read_at} />
            <button
              type="button"
              onClick={() => onOpen(notification)}
              className="min-w-0 flex-1 text-left focus:outline-none"
            >
              <p className="text-sm font-semibold text-primary">
                {notificationLabel(notification.notification_type)}
              </p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
                {notificationMessage(notification)}
              </p>
              <p
                className="mt-1.5 text-[11px] text-muted"
                title={format(new Date(notification.occurred_at), "PPp")}
              >
                {formatDistanceToNow(new Date(notification.occurred_at), { addSuffix: true })}
              </p>
            </button>
            <div className="flex shrink-0 items-start gap-1">
              <button
                type="button"
                onClick={() => onToggle({ id: notification.id, isRead: !notification.read_at })}
                className="inline-grid h-7 w-7 place-items-center rounded-md text-muted opacity-0 transition hover:bg-background hover:text-primary group-hover:opacity-100 focus:opacity-100"
                aria-label={notification.read_at ? "Mark unread" : "Mark read"}
              >
                <MailOpen className="h-3.5 w-3.5" />
              </button>
              {notificationAction(notification, role) ? (
                <button
                  type="button"
                  onClick={() => onOpen(notification)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[11px] font-semibold text-primary transition hover:border-brand hover:bg-brand hover:text-white"
                >
                  Open <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NotificationIcon({ notificationType, unread }: { notificationType: string; unread: boolean }) {
  const Icon = notificationType.startsWith("booking.") || notificationType === "class.reminder_1h"
    ? CalendarClock
    : notificationType.startsWith("payment.")
      ? CreditCard
      : notificationType.startsWith("access.") || notificationType.startsWith("student.")
        ? GraduationCap
        : CircleCheck;

  return (
    <span
      className={cn(
        "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full",
        unread ? "bg-brand/10 text-brand" : "bg-surface-subtle text-muted",
      )}
      aria-label={unread ? "Unread notification" : "Read notification"}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}

function notificationMessage(notification: NotificationItem) {
  const teacherName = getMetadataText(notification.metadata, "teacher_name");
  const startsAt = getMetadataText(notification.metadata, "starts_at");
  const endsAt = getMetadataText(notification.metadata, "ends_at");
  const classSchedule = startsAt ? formatClassSentence(startsAt, endsAt) : null;
  const teacher = teacherName ? ` with ${teacherName}` : "";

  switch (notification.notification_type) {
    case "booking.created":
      return classSchedule
        ? `Your class${teacher} is scheduled ${classSchedule}.`
        : "Your class has been scheduled. Open it to review the details.";
    case "booking.rescheduled":
      return classSchedule
        ? `Your class${teacher} has been moved ${classSchedule}.`
        : "Your class time has been updated. Open it to review the details.";
    case "booking.cancelled":
      return classSchedule
        ? `Your class${teacher}, scheduled ${classSchedule}, has been cancelled.`
        : "A class in your schedule has been cancelled.";
    case "class.reminder_1h":
      return classSchedule
        ? `Your class${teacher} starts in 1 hour ${classSchedule}.`
        : "Your class starts in 1 hour. Open it to join or review the details.";
    case "booking.attendance_marked":
      return "Attendance has been updated for one of your classes.";
    case "feedback.published":
      return "Your teacher has shared new feedback for you to review.";
    case "payment.recorded":
      return "A payment has been recorded on your account.";
    case "payment.updated":
      return "A payment on your account has been updated.";
    case "payment.removed":
      return "A payment record has been removed from your account.";
    case "access.granted":
      return "Your course access has been updated.";
    case "access.expiring_7d":
      return "Your course access is due to end in 7 days.";
    case "access.expiring_1d":
      return "Your course access ends tomorrow.";
    case "access.expired":
      return "Your course access has expired.";
    case "student.program_changed":
      return "Your learning program has been updated.";
    case "student.teacher_assignment_changed":
      return "Your assigned teacher has been updated.";
    case "student.status_changed":
      return "Your student account status has been updated.";
    case "teacher.profile_paused":
      return "A teacher profile has been paused.";
    case "account.email_changed":
      return "The email address for your account has been changed.";
    case "account.status_changed":
      return "Your account status has been updated.";
    default:
      return "There is a new update on your account.";
  }
}

function notificationAction(
  notification: NotificationItem,
  role: string | undefined,
) {
  if (!notification.action_url) return null;
  const classEvents = new Set([
    "booking.created",
    "booking.rescheduled",
    "booking.cancelled",
    "booking.attendance_marked",
    "class.reminder_1h",
  ]);
  const roleDestinations: Record<string, Set<string>> = {
    student: new Set([
      ...classEvents,
      "feedback.published",
    ]),
    teacher: new Set([
      ...classEvents,
      "student.teacher_assignment_changed",
      "teacher.profile_paused",
    ]),
    admin: new Set([
      ...classEvents,
      "payment.recorded",
      "payment.updated",
      "payment.removed",
      "student.status_changed",
      "student.program_changed",
      "student.teacher_assignment_changed",
      "teacher.profile_paused",
    ]),
  };
  const allowed = role ? roleDestinations[role] : undefined;
  return allowed?.has(notification.notification_type) ? notification.action_url : null;
}

function getMetadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function notificationLabel(notificationType: string) {
  const labels: Record<string, string> = {
    "booking.created": "Class scheduled",
    "booking.rescheduled": "Class rescheduled",
    "booking.cancelled": "Class cancelled",
    "class.reminder_1h": "Class starts in 1 hour",
    "booking.attendance_marked": "Attendance updated",
    "access.granted": "Course access updated",
    "access.expiring_7d": "Course access ends soon",
    "access.expiring_1d": "Course access ends tomorrow",
    "access.expired": "Course access expired",
    "payment.recorded": "Payment recorded",
    "payment.updated": "Payment updated",
    "payment.removed": "Payment removed",
    "student.status_changed": "Student status updated",
    "student.teacher_assignment_changed": "Teacher assignment updated",
    "student.program_changed": "Learning program updated",
    "teacher.profile_paused": "Teacher profile paused",
    "account.email_changed": "Login email changed",
    "account.status_changed": "Account status updated",
    "feedback.published": "New teacher feedback",
  };
  return labels[notificationType] ?? "New update";
}

function formatClassSentence(startsAt: string, endsAt: string | null) {
  const starts = new Date(startsAt);
  if (Number.isNaN(starts.getTime())) return "at a time to be confirmed";
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(starts);
  const startTime = new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(starts);
  if (!endsAt) return `on ${date} at ${startTime}`;
  const ends = new Date(endsAt);
  if (Number.isNaN(ends.getTime())) return `on ${date} at ${startTime}`;
  const endTime = new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(ends);
  return `on ${date} from ${startTime} to ${endTime}`;
}

function NotificationLoading() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex gap-3 border-b border-border p-3 last:border-0">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-surface-subtle" />
          <div className="flex-1 animate-pulse space-y-2">
            <div className="h-3 w-40 rounded bg-surface-subtle" />
            <div className="h-2.5 w-4/5 rounded bg-surface-subtle" />
          </div>
        </div>
      ))}
    </div>
  );
}
