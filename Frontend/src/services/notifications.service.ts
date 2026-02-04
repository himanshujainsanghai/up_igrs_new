/**
 * Notifications Service
 * Maps to backend /api/v1/notifications routes
 */

import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";

export interface NotificationItem {
  id: string;
  user_id: string;
  event_type: string;
  complaint_id: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationSettingsItem {
  event_type: string;
  enabled: boolean;
}

export interface ListNotificationsParams {
  complaint_id?: string;
  event_type?: string;
  unread_only?: boolean;
  limit?: number;
  skip?: number;
}

/** GET /notifications - list for current user */
export async function listNotifications(
  params?: ListNotificationsParams
): Promise<{ notifications: NotificationItem[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.complaint_id) search.set("complaint_id", params.complaint_id);
  if (params?.event_type) search.set("event_type", params.event_type);
  if (params?.unread_only) search.set("unread_only", "true");
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.skip != null) search.set("skip", String(params.skip));
  const url = search.toString()
    ? `/notifications?${search.toString()}`
    : "/notifications";
  const response = await apiClient.get<
    ApiResponse<{ notifications: NotificationItem[]; total: number }>
  >(url);
  if (!response.success || response.data == null) {
    throw new Error("Failed to fetch notifications");
  }
  return response.data;
}

/** GET /notifications/unread-count */
export async function getUnreadCount(): Promise<number> {
  const response = await apiClient.get<ApiResponse<{ count: number }>>(
    "/notifications/unread-count"
  );
  if (!response.success || response.data == null) {
    return 0;
  }
  return response.data.count;
}

/** PATCH /notifications/:id/read */
export async function markAsRead(id: string): Promise<void> {
  const response = await apiClient.patch<
    ApiResponse<{ id: string; read: boolean }>
  >(`/notifications/${id}/read`);
  if (!response.success) {
    throw new Error("Failed to mark notification as read");
  }
}

/** PATCH /notifications/read-all */
export async function markAllAsRead(): Promise<number> {
  const response = await apiClient.patch<
    ApiResponse<{ modifiedCount: number }>
  >("/notifications/read-all");
  if (!response.success || response.data == null) {
    throw new Error("Failed to mark all as read");
  }
  return response.data.modifiedCount;
}

/** GET /notifications/settings (admin only) */
export async function getNotificationSettings(): Promise<
  NotificationSettingsItem[]
> {
  const response = await apiClient.get<
    ApiResponse<{ settings: NotificationSettingsItem[] }>
  >("/notifications/settings");
  if (!response.success || response.data == null) {
    throw new Error("Failed to fetch notification settings");
  }
  return response.data.settings;
}

/** PATCH /notifications/settings (admin only) */
export async function updateNotificationSettings(
  settings: { event_type: string; enabled: boolean }[]
): Promise<NotificationSettingsItem[]> {
  const response = await apiClient.patch<
    ApiResponse<{ settings: NotificationSettingsItem[] }>
  >("/notifications/settings", { settings });
  if (!response.success || response.data == null) {
    throw new Error("Failed to update notification settings");
  }
  return response.data.settings;
}

/** Named export for use as notificationsService.* */
export const notificationsService = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotificationSettings,
  updateNotificationSettings,
};
