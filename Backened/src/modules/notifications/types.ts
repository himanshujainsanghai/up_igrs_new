/**
 * NOTIFICATION MODULE - TYPES
 * Complaint-isolated: every notification is tied to complaint_id + event_type.
 */

import type { IComplaintTimelineEvent } from "../../models/ComplaintTimelineEvent";

/** Result of resolving who should receive a notification for one event */
export interface RecipientResult {
  /** Admin user ids (get every notification when event is enabled) */
  adminUserIds: string[];
  /** Officer user ids (only for officer-relevant events: assign/unassign/reassign/extension) */
  officerUserIds: string[];
}

/** Input to build one in-app notification */
export interface NotificationInput {
  user_id: string;
  event_type: string;
  complaint_id: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  timeline_event_id?: string;
}

/** Event types we support for notifications (subset of ComplaintTimelineEventType) */
export const NOTIFIABLE_EVENT_TYPES = [
  "complaint_created",
  "officer_assigned",
  "officer_reassigned",
  "officer_unassigned",
  "extension_requested",
  "extension_approved",
  "extension_rejected",
  "complaint_closed",
  "note_added",
  "document_added",
  "officer_note_added",
  "officer_document_added",
] as const;

export type NotifiableEventType = (typeof NOTIFIABLE_EVENT_TYPES)[number];

export function isNotifiableEventType(
  eventType: string
): eventType is NotifiableEventType {
  return (NOTIFIABLE_EVENT_TYPES as readonly string[]).includes(eventType);
}

/** Timeline event shape we receive (plain or document) */
export type TimelineEventLike = Pick<
  IComplaintTimelineEvent,
  "id" | "complaint_id" | "event_type" | "payload" | "actor_name"
>;
