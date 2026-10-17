import { API_BASE } from "./baseUrl";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const fetchMyNotifications = async (): Promise<{
  success: boolean;
  data: {
    notifications: NotificationItem[];
    unreadCount: number;
  };
}> => {
  const res = await fetch(`${API_BASE}/api/v1/notifications/my`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`);
  return res.json();
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await fetch(`${API_BASE}/api/v1/notifications/${id}/read`, {
    method: "PATCH",
    credentials: "include",
  });
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
    method: "PATCH",
    credentials: "include",
  });
};
