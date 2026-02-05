/**
 * NOTIFICATION MODULE - EVENT → RECEIVERS MAP
 * Single source of truth: which event sends notifications to whom.
 * Add/modify entries here to change who receives what; handlers use this map.
 *
 * Receiver kinds:
 *   - admins              → all active admin user ids (exclude self via excludeSelfPayloadKey if set)
 *   - assigned_officer    → complaint's assigned_to_user_id (or exclude if assignedOfficerExceptCloser + payload has closer)
 *   - previous_officer    → resolved from payload.previous_officer_id (Officer _id → User id)
 *   - new_officer          → resolved from payload.new_officer_id (Officer _id → User id)
 *   - extension_requester  → resolved from payload.request_id (extension request's requested_by = User id)
 */

import type { NotifiableEventType } from "./types";

/** Receiver kind: who gets the notification (resolved to user ids in handlers). */
export type ReceiverKind =
  | "admins"
  | "assigned_officer"
  | "previous_officer"
  | "new_officer"
  | "extension_requester";

export interface EventReceiverConfig {
  /** Who receives this event. Append here to add receivers. */
  receivers: ReceiverKind[];
  /**
   * If set, exclude this user id from "admins" (e.g. complaint_created: exclude creator).
   * Payload key that holds the user id to exclude (e.g. "created_by_user_id").
   */
  excludeSelfPayloadKey?: string;
  /**
   * If true, for "assigned_officer" we exclude the user in payload.closed_by_user_id
   * (e.g. complaint_closed: notify assigned officer only if they did not close it).
   */
  assignedOfficerExceptCloser?: boolean;
}

/**
 * Map: event_type → receivers and optional exclusions.
 * To add a new event: add to NOTIFIABLE_EVENT_TYPES in types.ts, then add an entry here.
 * To add receivers to an event: append to the receivers array.
 */
export const EVENT_RECEIVER_MAP: Record<
  NotifiableEventType,
  EventReceiverConfig
> = {
  complaint_created: {
    receivers: ["admins"],
    excludeSelfPayloadKey: "created_by_user_id",
  },
  officer_assigned: {
    receivers: ["assigned_officer"],
  },
  officer_reassigned: {
    receivers: ["previous_officer", "new_officer"],
  },
  officer_unassigned: {
    receivers: ["previous_officer"],
  },
  extension_requested: {
    receivers: ["admins"],
  },
  extension_approved: {
    receivers: ["extension_requester"],
  },
  extension_rejected: {
    receivers: ["extension_requester"],
  },
  complaint_closed: {
    receivers: ["assigned_officer"],
    assignedOfficerExceptCloser: true,
  },
  note_added: {
    receivers: ["assigned_officer"],
  },
  document_added: {
    receivers: ["assigned_officer"],
  },
  officer_note_added: {
    receivers: ["admins"],
  },
  officer_document_added: {
    receivers: ["admins"],
  },
};
