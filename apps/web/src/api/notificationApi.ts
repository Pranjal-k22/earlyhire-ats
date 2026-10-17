import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

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
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{
    success: boolean;
    data: {
      notifications: NotificationItem[];
      unreadCount: number;
    };
  }>(res, "Failed to fetch notifications");
};

export const markNotificationRead = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/api/v1/notifications/${id}/read`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });
  await parseApiResponse<void>(res, "Failed to mark notification as read");
};

export const markAllNotificationsRead = async (): Promise<void> => {
  const res = await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });
  await parseApiResponse<void>(res, "Failed to mark notifications as read");
};
