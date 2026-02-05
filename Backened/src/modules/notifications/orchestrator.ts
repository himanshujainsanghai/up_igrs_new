/**
 * NOTIFICATION MODULE - ORCHESTRATOR
 * Async, fire-and-forget: never blocks timeline or domain logic.
 * Complaint-isolated: every created notification has complaint_id + event_type.
 */

import Notification from "../../models/Notification";
import NotificationSettings from "../../models/NotificationSettings";
import type { TimelineEventLike } from "./types";
import { isNotifiableEventType } from "./types";
import { resolveForEvent, buildNotificationInputs } from "./handlers";
import { emitNewNotificationsToUsers } from "./socket";
import logger from "../../config/logger";

/**
 * Process one timeline event: create in-app notifications for all recipients.
 * Only runs when event type is notifiable and enabled in settings.
 * Does not throw to caller when called via notifyAsync (errors logged only).
 */
export async function handleTimelineEvent(
  event: TimelineEventLike
): Promise<void> {
  const { id: timelineEventId, complaint_id, event_type, payload = {} } = event;

  if (!isNotifiableEventType(event_type)) {
    logger.debug(`Notification skip: event type ${event_type} not notifiable`);
    return;
  }

  let enabled = true;
  try {
    const setting = await NotificationSettings.findOne({
      event_type,
    }).lean();
    enabled = setting?.enabled ?? true;
  } catch (err) {
    logger.warn("NotificationSettings lookup failed, defaulting enabled", {
      event_type,
      err,
    });
  }

  if (!enabled) {
    logger.debug(
      `Notification skip: event type ${event_type} disabled by settings`
    );
    return;
  }

  let res;
  try {
    res = await resolveForEvent(event_type, complaint_id, payload);
  } catch (err) {
    logger.error("resolveForEvent failed", { event_type, complaint_id, err });
    return;
  }

  const inputs = buildNotificationInputs(
    complaint_id,
    event_type,
    timelineEventId,
    res
  );

  if (inputs.length === 0) {
    logger.debug(
      `Notification skip: no recipients for ${event_type} complaint=${complaint_id}`
    );
    return;
  }

  try {
    await Notification.insertMany(
      inputs.map((inp) => ({
        user_id: inp.user_id,
        event_type: inp.event_type,
        complaint_id: inp.complaint_id,
        title: inp.title,
        body: inp.body,
        payload: inp.payload ?? {},
        timeline_event_id: inp.timeline_event_id,
      }))
    );
    logger.debug(
      `Notifications created: ${inputs.length} for ${event_type} complaint=${complaint_id}`
    );
    const userIds = inputs.map((inp) => inp.user_id);
    emitNewNotificationsToUsers(userIds);
  } catch (err) {
    logger.error("Notification insertMany failed", {
      event_type,
      complaint_id,
      count: inputs.length,
      err,
    });
  }
}

/**
 * Fire-and-forget: schedule notification handling so it never blocks or fails the caller.
 * Call this from timeline appendEvent after save. Never await in the caller.
 */
export function notifyAsync(event: TimelineEventLike): void {
  setImmediate(() => {
    handleTimelineEvent(event).catch((err) => {
      logger.error("Notification handleTimelineEvent failed", {
        eventId: event.id,
        complaint_id: event.complaint_id,
        event_type: event.event_type,
        err,
      });
    });
  });
}
