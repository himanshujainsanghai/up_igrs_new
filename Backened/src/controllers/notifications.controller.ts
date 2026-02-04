/**
 * NOTIFICATIONS CONTROLLER
 * List/mark read for current user; settings (admin-only) for event on/off.
 */

import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as notificationsService from "../services/notifications.service";
import { sendSuccess } from "../utils/response";
import { ValidationError } from "../utils/errors";

/**
 * GET /api/v1/notifications
 * List notifications for current user. Complaint-isolated: optional ?complaint_id=&event_type=&unread_only=
 */
export const listNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const complaint_id = req.query.complaint_id as string | undefined;
    const event_type = req.query.event_type as string | undefined;
    const unread_only = req.query.unread_only === "true";
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;
    const skip = req.query.skip
      ? parseInt(req.query.skip as string, 10)
      : undefined;

    const limitNum = limit ?? 50;
    const skipNum = skip ?? 0;

    const { notifications, total } =
      await notificationsService.listNotifications({
        user_id: userId,
        complaint_id,
        event_type,
        unread_only,
        limit: limitNum,
        skip: skipNum,
      });

    const totalPages = limitNum > 0 ? Math.ceil(total / limitNum) : 0;
    const page = limitNum > 0 ? Math.floor(skipNum / limitNum) + 1 : 1;

    sendSuccess(res, { notifications, total }, 200, {
      total,
      limit: limitNum,
      page,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications/unread-count
 * Unread count for current user (e.g. badge).
 */
export const getUnreadCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const count = await notificationsService.getUnreadCount(userId);
    sendSuccess(res, { count });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark one notification as read (only own).
 */
export const markAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await notificationsService.markAsRead(id, userId);
    sendSuccess(res, { id, read: true });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications as read for current user.
 */
export const markAllAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const modifiedCount = await notificationsService.markAllAsRead(userId);
    sendSuccess(res, { modifiedCount });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications/settings
 * Admin-only: list which event types are enabled for notifications.
 */
export const getSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await notificationsService.getNotificationSettings();
    sendSuccess(res, { settings });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/settings
 * Admin-only: update enabled flag for one or more event types.
 * Body: { settings: [{ event_type: string, enabled: boolean }] }
 */
export const updateSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { settings } = req.body as {
      settings?: { event_type: string; enabled: boolean }[];
    };
    if (!Array.isArray(settings) || settings.length === 0) {
      next(
        new ValidationError("settings array is required and must not be empty")
      );
      return;
    }
    const updated = await notificationsService.updateNotificationSettings(
      settings
    );
    sendSuccess(res, { settings: updated });
  } catch (error) {
    next(error);
  }
};
