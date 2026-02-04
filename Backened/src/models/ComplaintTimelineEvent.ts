/**
 * COMPLAINT TIMELINE EVENT MODEL
 * Immutable, append-only audit log for every action on a complaint.
 * Single source of truth for complaint history and timeline.
 *
 * Design: One document per action. Payload shape varies by event_type.
 * Current state remains on Complaint; this model is for audit and timeline only.
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

/** All supported event types. Extend this enum for future actions. */
export const ComplaintTimelineEventType = {
  // Lifecycle
  COMPLAINT_CREATED: "complaint_created",
  COMPLAINT_UPDATED: "complaint_updated",
  COMPLAINT_CLOSED: "complaint_closed",
  COMPLAINT_REOPENED: "complaint_reopened",

  // Status / priority
  STATUS_CHANGED: "status_changed",
  PRIORITY_CHANGED: "priority_changed",

  // Admin: notes & documents
  NOTE_ADDED: "note_added",
  DOCUMENT_ADDED: "document_added",

  // Draft letter & officer selection
  OFFICER_SELECTED: "officer_selected",
  LETTER_DRAFTED: "letter_drafted",
  LETTER_REDRAFTED: "letter_redrafted",
  LETTER_SAVED: "letter_saved",
  RECIPIENT_UPDATED: "recipient_updated",

  // Assignment
  OFFICER_ASSIGNED: "officer_assigned",
  OFFICER_REASSIGNED: "officer_reassigned",
  OFFICER_UNASSIGNED: "officer_unassigned",

  // Officer: notes & documents
  OFFICER_NOTE_ADDED: "officer_note_added",
  OFFICER_DOCUMENT_ADDED: "officer_document_added",

  // Extension
  EXTENSION_REQUESTED: "extension_requested",
  EXTENSION_APPROVED: "extension_approved",
  EXTENSION_REJECTED: "extension_rejected",

  // Officer demands (officer asks citizen/admin for more context)
  OFFICER_DEMAND_CREATED: "officer_demand_created",
  OFFICER_DEMAND_FULFILLED: "officer_demand_fulfilled",

  // Optional / future
  RESEARCH_COMPLETED: "research_completed",
  ACTIONS_GENERATED: "actions_generated",

  // Document summarization (AI summary of complaint attachments; can repeat on re-summarize)
  DOCUMENTS_SUMMARIZED: "documents_summarized",
} as const;

export type ComplaintTimelineEventTypeValue =
  (typeof ComplaintTimelineEventType)[keyof typeof ComplaintTimelineEventType];

export interface IComplaintTimelineEvent extends Document {
  id: string;
  complaint_id: string;
  event_type: ComplaintTimelineEventTypeValue;
  at: Date;
  actor_user_id?: string;
  actor_role?: "admin" | "officer" | "system" | "citizen";
  /** Optional: human-readable actor name for display without join */
  actor_name?: string;
  /**
   * Payload shape depends on event_type. Examples:
   * - complaint_created: { title?, category? }
   * - status_changed: { old_status, new_status }
   * - note_added: { note_id, excerpt? }
   * - officer_assigned: { assigned_to_user_id, officer_id, officer_name, officer_email, time_deadline_days }
   * - officer_reassigned: { previous_officer_id, previous_officer_name, new_officer_id, new_officer_name, new_officer_email }
   * - complaint_closed: { closed_by_user_id, closed_by_name, remarks_excerpt?, closed_at }
   * - extension_approved: { request_id, new_deadline_days, decided_by }
   * - documents_summarized: { summary_id, document_count, use_complaint_context?, user_prompt_excerpt? }
   */
  payload?: Record<string, unknown>;
  /** Idempotency: same key => skip duplicate (e.g. note_id for note_added) */
  idempotency_key?: string;
  created_at: Date;
}

/** Plain object shape returned by .lean() queries (for timeline reads / API). Mongoose 8+ no longer exports LeanDocument. */
export interface IComplaintTimelineEventLean {
  _id?: mongoose.Types.ObjectId;
  id: string;
  complaint_id: string;
  event_type: ComplaintTimelineEventTypeValue;
  at: Date;
  actor_user_id?: string;
  actor_role?: "admin" | "officer" | "system" | "citizen";
  actor_name?: string;
  payload?: Record<string, unknown>;
  idempotency_key?: string;
  created_at: Date;
}

const ComplaintTimelineEventSchema = new Schema<IComplaintTimelineEvent>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
      index: true,
    },
    complaint_id: {
      type: String,
      required: [true, "Complaint ID is required"],
      index: true,
    },
    event_type: {
      type: String,
      required: [true, "Event type is required"],
      enum: {
        values: Object.values(ComplaintTimelineEventType),
        message: "{VALUE} is not a valid timeline event type",
      },
      index: true,
    },
    at: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    actor_user_id: {
      type: String,
      trim: true,
      index: true,
    },
    actor_role: {
      type: String,
      enum: ["admin", "officer", "system", "citizen"],
      index: true,
    },
    actor_name: {
      type: String,
      trim: true,
      maxlength: [200, "Actor name cannot exceed 200 characters"],
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    idempotency_key: {
      type: String,
      trim: true,
      default: undefined,
      set: (v: string | null | undefined) =>
        v == null || v === "" ? undefined : v,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
    collection: "complaint_timeline_events",
    strict: true,
  }
);

// Primary query: timeline for a complaint (chronological)
ComplaintTimelineEventSchema.index({ complaint_id: 1, at: 1 });
// By actor (e.g. "all actions by this officer")
ComplaintTimelineEventSchema.index({ actor_user_id: 1, at: -1 });
// By event type (analytics / reporting)
ComplaintTimelineEventSchema.index({ event_type: 1, at: -1 });
// Idempotency: one event per (complaint_id, idempotency_key) only when key is present.
// Partial index allows multiple events without a key (e.g. officer_unassigned, status_changed).
// One-time migration: if the collection had the old sparse unique index, drop it so this one applies:
//   db.complaint_timeline_events.dropIndex("complaint_id_1_idempotency_key_1").catch(() => {})
ComplaintTimelineEventSchema.index(
  { complaint_id: 1, idempotency_key: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotency_key: { $exists: true, $type: "string", $ne: "" },
    },
  }
);

const ComplaintTimelineEvent: Model<IComplaintTimelineEvent> =
  mongoose.models.ComplaintTimelineEvent ||
  mongoose.model<IComplaintTimelineEvent>(
    "ComplaintTimelineEvent",
    ComplaintTimelineEventSchema
  );

export default ComplaintTimelineEvent;
