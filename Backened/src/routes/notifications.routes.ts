/**
 * NOTIFICATIONS ROUTES
 * Authenticated user: list, unread count, mark read.
 * Admin-only: GET/PATCH /settings (notification event on/off).
 */

import { Router } from "express";
import * as notificationsController from "../controllers/notifications.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

// User endpoints (any authenticated user sees own notifications)
router.get("/", notificationsController.listNotifications);
router.get("/unread-count", notificationsController.getUnreadCount);
router.patch("/read-all", notificationsController.markAllAsRead);

// Admin-only: notification control (which events trigger notifications)
router.get(
  "/settings",
  authorize("admin"),
  notificationsController.getSettings
);
router.patch(
  "/settings",
  authorize("admin"),
  notificationsController.updateSettings
);

// Mark single as read (must be after /read-all and /settings)
router.patch("/:id/read", notificationsController.markAsRead);

export default router;
