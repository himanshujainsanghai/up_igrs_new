/**
 * NOTIFICATIONS SERVICE
 * Complaint-isolated: list/filter by complaint_id. Admin gets every notification;
 * officer gets only officer-relevant (stored the same; filtering by recipient is by user_id).
 */

import Notification from "../models/Notification";
import NotificationSettings from "../models/NotificationSettings";
import { NOTIFIABLE_EVENT_TYPES } from "../modules/notifications";
import { NotFoundError } from "../utils/errors";

export interface ListNotificationsFilters {
  user_id: string;
  complaint_id?: string;
  event_type?: string;
  unread_only?: boolean;
  limit?: number;
  skip?: number;
}

export async function listNotifications(
  filters: ListNotificationsFilters
): Promise<{ notifications: any[]; total: number }> {
  const q: Record<string, unknown> = { user_id: filters.user_id };
  if (filters.complaint_id) q.complaint_id = filters.complaint_id;
  if (filters.event_type) q.event_type = filters.event_type;
  if (filters.unread_only) q.read_at = null;

  const limit = Math.min(filters.limit ?? 50, 100);
  const skip = filters.skip ?? 0;

  const [notifications, total] = await Promise.all([
    Notification.find(q)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(q),
  ]);

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      user_id: n.user_id,
      event_type: n.event_type,
      complaint_id: n.complaint_id,
      title: n.title,
      body: n.body,
      payload: n.payload,
      read_at: n.read_at,
      created_at: n.created_at,
    })),
    total,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ user_id: userId, read_at: null });
}

export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  const n = await Notification.findOne({ id: notificationId, user_id: userId });
  if (!n) throw new NotFoundError("Notification");
  n.read_at = new Date();
  await n.save();
}

export async function markAllAsRead(userId: string): Promise<number> {
  const result = await Notification.updateMany(
    { user_id: userId, read_at: null },
    { $set: { read_at: new Date() } }
  );
  return result.modifiedCount ?? 0;
}

/** Admin-only: get all notification settings (which event types are on/off) */
export async function getNotificationSettings(): Promise<
  { event_type: string; enabled: boolean }[]
> {
  const existing = await NotificationSettings.find().lean();
  const byType = new Map(existing.map((s) => [s.event_type, s.enabled]));

  return NOTIFIABLE_EVENT_TYPES.map((event_type) => ({
    event_type,
    enabled: byType.get(event_type) ?? true,
  }));
}

/** Admin-only: set enabled for one or more event types */
export async function updateNotificationSettings(
  updates: { event_type: string; enabled: boolean }[]
): Promise<{ event_type: string; enabled: boolean }[]> {
  const result: { event_type: string; enabled: boolean }[] = [];
  for (const { event_type, enabled } of updates) {
    await NotificationSettings.findOneAndUpdate(
      { event_type },
      { $set: { enabled, updated_at: new Date() } },
      { upsert: true, new: true }
    );
    result.push({ event_type, enabled });
  }
  return result;
}
