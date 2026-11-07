import { api } from "@/api/http";

export type NotificationItem = {
  id: string;
  notification_type: string;
  category: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  action_label: string | null;
  action_url: string | null;
  occurred_at: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationList = {
  items: NotificationItem[];
  next_cursor: string | null;
};

export async function listNotifications(params: {
  state: "all" | "unread";
  category?: string;
  cursor?: string;
}): Promise<NotificationList> {
  const response = await api.get<NotificationList>("/notifications", { params });
  return response.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await api.get<{ count: number }>("/notifications/unread-count");
  return response.data.count;
}

export async function setNotificationRead(notificationId: string, isRead: boolean): Promise<void> {
  await api.patch(`/notifications/${notificationId}`, { is_read: isRead });
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
