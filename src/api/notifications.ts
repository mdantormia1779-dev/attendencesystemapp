import { apiRequest } from "./client";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category?: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ALERT";
  scope?: string;
  senderName?: string;
  senderRole?: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export const notificationsApi = {
  getNotifications: async () => {
    return apiRequest<{
      notifications: NotificationItem[];
      unreadCount: number;
    }>("/api/notifications");
  },

  markAsRead: async (id: string) => {
    return apiRequest(`/api/notifications/${id}/read`, {
      method: "PATCH",
    });
  },

  markAllAsRead: async () => {
    return apiRequest("/api/notifications/read-all", {
      method: "POST",
    });
  },
};
