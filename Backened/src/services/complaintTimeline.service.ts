/**
 * COMPLAINT TIMELINE SERVICE
 * Append-only timeline events for every action on a complaint.
 * Single place to emit events; call from domain services (complaints, notes, etc.).
 */

import ComplaintTimelineEvent, {
  ComplaintTimelineEventType,
  ComplaintTimelineEventTypeValue,
  IComplaintTimelineEvent,
  IComplaintTimelineEventLean,
} from "../models/ComplaintTimelineEvent";
import logger from "../config/logger";
import { notifyAsync } from "../modules/notifications";

export interface TimelineActor {
  user_id?: string;
  role?: "admin" | "officer" | "system" | "citizen";
  name?: string;
}

export interface AppendEventOptions {
  /** When true, do not trigger notifications for this event (timeline only). */
  skipNotification?: boolean;
}

/**
 * Core: append one timeline event. Immutable; never update or delete.
 * If idempotency_key is provided and an event already exists for this complaint_id + key, skip (no duplicate).
 *
 * DELINKED: Timeline and notifications are independent. We always attempt both; success of one
 * does not block the other. Notifications run in finally so they are attempted even when
 * timeline save fails (e.g. E11000, timeout). Only skipped on idempotency skip (duplicate event)
 * or when options.skipNotification is true.
 */
export async function appendEvent(
  complaintId: string,
  eventType: ComplaintTimelineEventTypeValue,
  payload: Record<string, unknown> = {},
  actor?: TimelineActor,
  idempotencyKey?: string,
  options?: AppendEventOptions
): Promise<IComplaintTimelineEvent | null> {
  const skipNotificationRequested = options?.skipNotification ?? false;

  // Idempotency: skip duplicate entirely (no timeline write, no notification)
  if (idempotencyKey != null && idempotencyKey !== "") {
    const existing = await ComplaintTimelineEvent.findOne({
      complaint_id: complaintId,
      idempotency_key: idempotencyKey,
    }).lean();
    if (existing) {
      logger.debug(
        `Timeline idempotency: skip duplicate event ${eventType} key=${idempotencyKey} complaint=${complaintId}`
      );
      return null;
    }
  }

  // Omit idempotency_key when undefined so we never store null (sparse unique index
  // would allow only one doc per (complaint_id, null), causing E11000 on second event).
  const docData: Record<string, unknown> = {
    complaint_id: complaintId,
    event_type: eventType,
    at: new Date(),
    actor_user_id: actor?.user_id,
    actor_role: actor?.role,
    actor_name: actor?.name,
    payload: payload && Object.keys(payload).length ? payload : undefined,
  };
  if (idempotencyKey != null && idempotencyKey !== "") {
    docData.idempotency_key = idempotencyKey;
  }
  const doc = new ComplaintTimelineEvent(docData);

  // Event payload for notifications (and any future consumers). Built from inputs so
  // notifications are independent of timeline save success.
  const eventPayload = {
    id: "" as string,
    complaint_id: complaintId,
    event_type: eventType,
    payload: payload && Object.keys(payload).length ? payload : {},
    actor_name: actor?.name,
  };

  let skipNotify = false; // set true when we treat as idempotent (11000) to avoid double-notify

  try {
    await doc.save();
    logger.debug(
      `Timeline event appended: ${eventType} complaint=${complaintId} id=${doc.id}`
    );
    eventPayload.id = doc.id;
    return doc as IComplaintTimelineEvent;
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      logger.warn(
        `Timeline duplicate key (treating as skip): ${eventType} complaint=${complaintId}`
      );
      skipNotify = true; // first attempt already notified; don't notify again
      return null;
    }
    logger.error(
      `Failed to append timeline event: ${eventType} complaint=${complaintId}`,
      err
    );
    throw err;
  } finally {
    // Independent consumer: run notifications regardless of timeline success/failure.
    // Skip when idempotent (11000) or when caller requested timeline-only (e.g. documents_summarized).
    if (!skipNotify && !skipNotificationRequested) {
      try {
        notifyAsync(eventPayload);
      } catch (_) {
        // Notification must not affect timeline or domain; log in notifyAsync internally
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Typed helpers: one per event type. Use these from domain services.
// ---------------------------------------------------------------------------

export async function appendComplaintCreated(
  complaintId: string,
  payload: {
    title?: string;
    category?: string;
    created_by?: string;
    created_by_user_id?: string;
  },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.COMPLAINT_CREATED,
    payload,
    actor,
    `created-${complaintId}`
  );
}

export async function appendComplaintUpdated(
  complaintId: string,
  payload: { field?: string; old_value?: unknown; new_value?: unknown },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.COMPLAINT_UPDATED,
    payload,
    actor
  );
}

export async function appendStatusChanged(
  complaintId: string,
  payload: { old_status: string; new_status: string },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.STATUS_CHANGED,
    payload,
    actor
  );
}

export async function appendPriorityChanged(
  complaintId: string,
  payload: { old_priority: string; new_priority: string },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.PRIORITY_CHANGED,
    payload,
    actor
  );
}

export async function appendNoteAdded(
  complaintId: string,
  payload: { note_id: string; excerpt?: string },
  actor?: TimelineActor,
  idempotencyKey?: string
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.NOTE_ADDED,
    payload,
    actor,
    idempotencyKey ?? `note-${payload.note_id}`
  );
}

export async function appendDocumentAdded(
  complaintId: string,
  payload: {
    document_id: string;
    file_name?: string;
    file_type?: "inward" | "outward";
  },
  actor?: TimelineActor,
  idempotencyKey?: string
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.DOCUMENT_ADDED,
    payload,
    actor,
    idempotencyKey ?? `doc-${payload.document_id}`
  );
}

export async function appendOfficerSelected(
  complaintId: string,
  payload: {
    officer_name?: string;
    officer_email?: string;
    officer_designation?: string;
  },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.OFFICER_SELECTED,
    payload,
    actor
  );
}

export async function appendLetterDrafted(
  complaintId: string,
  payload: { to_name?: string; to_designation?: string },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.LETTER_DRAFTED,
    payload,
    actor
  );
}

export async function appendLetterRedrafted(
  complaintId: string,
  payload: { to_name?: string },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.LETTER_REDRAFTED,
    payload,
    actor
  );
}

export async function appendLetterSaved(
  complaintId: string,
  payload: Record<string, unknown>,
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.LETTER_SAVED,
    payload,
    actor
  );
}

export async function appendRecipientUpdated(
  complaintId: string,
  payload: {
    previous_officer_name?: string;
    new_officer_name?: string;
    new_officer_email?: string;
  },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.RECIPIENT_UPDATED,
    payload,
    actor
  );
}

export async function appendOfficerAssigned(
  complaintId: string,
  payload: {
    assigned_to_user_id: string;
    officer_id: string;
    officer_name: string;
    officer_email: string;
    time_deadline_days?: number;
    is_new_officer?: boolean;
  },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.OFFICER_ASSIGNED,
    payload,
    actor
  );
}

export async function appendOfficerReassigned(
  complaintId: string,
  payload: {
    previous_officer_id?: string;
    previous_officer_name?: string;
    previous_officer_email?: string;
    new_officer_id: string;
    new_officer_name: string;
    new_officer_email: string;
    new_time_deadline_days?: number;
  },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.OFFICER_REASSIGNED,
    payload,
    actor
  );
}

export async function appendOfficerUnassigned(
  complaintId: string,
  payload: {
    previous_officer_id?: string;
    previous_officer_name?: string;
    previous_officer_email?: string;
  },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.OFFICER_UNASSIGNED,
    payload,
    actor
  );
}

export async function appendOfficerNoteAdded(
  complaintId: string,
  payload: {
    note_id: string;
    officer_id?: string;
    type?: "inward" | "outward";
    excerpt?: string;
  },
  actor?: TimelineActor,
  idempotencyKey?: string
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.OFFICER_NOTE_ADDED,
    payload,
    actor,
    idempotencyKey ?? `officer-note-${payload.note_id}`
  );
}

export async function appendOfficerDocumentAdded(
  complaintId: string,
  payload: {
    attachment_id: string;
    officer_id?: string;
    file_name?: string;
    attachment_type?: "inward" | "outward";
  },
  actor?: TimelineActor,
  idempotencyKey?: string
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.OFFICER_DOCUMENT_ADDED,
    payload,
    actor,
    idempotencyKey ?? `officer-doc-${payload.attachment_id}`
  );
}

export async function appendExtensionRequested(
  complaintId: string,
  payload: {
    request_id: string;
    requested_by: string;
    requested_by_role: "officer" | "admin";
    days_requested: number;
    reason?: string;
  },
  actor?: TimelineActor,
  idempotencyKey?: string
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.EXTENSION_REQUESTED,
    payload,
    actor,
    idempotencyKey ?? `ext-req-${payload.request_id}`
  );
}

export async function appendExtensionApproved(
  complaintId: string,
  payload: {
    request_id: string;
    new_deadline_days: number;
    decided_by?: string;
  },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.EXTENSION_APPROVED,
    payload,
    actor,
    `ext-approved-${payload.request_id}`
  );
}

export async function appendExtensionRejected(
  complaintId: string,
  payload: { request_id: string; decided_by?: string; notes?: string },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.EXTENSION_REJECTED,
    payload,
    actor,
    `ext-rejected-${payload.request_id}`
  );
}

export async function appendOfficerDemandCreated(
  complaintId: string,
  payload: {
    demand_id?: string;
    type: "text" | "docs" | "images";
    message?: string;
    attachment_urls?: string[];
    officer_id?: string;
  },
  actor?: TimelineActor,
  idempotencyKey?: string
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.OFFICER_DEMAND_CREATED,
    payload,
    actor,
    idempotencyKey
  );
}

export async function appendOfficerDemandFulfilled(
  complaintId: string,
  payload: { demand_id?: string; fulfilled_by?: string },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.OFFICER_DEMAND_FULFILLED,
    payload,
    actor
  );
}

export async function appendComplaintClosed(
  complaintId: string,
  payload: {
    closed_by_user_id?: string;
    closed_by_name?: string;
    closed_by_email?: string;
    remarks_excerpt?: string;
    closed_at: string;
  },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.COMPLAINT_CLOSED,
    payload,
    actor
  );
}

export async function appendComplaintReopened(
  complaintId: string,
  payload: { reason?: string; previous_closed_at?: string },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.COMPLAINT_REOPENED,
    payload,
    actor
  );
}

export async function appendResearchCompleted(
  complaintId: string,
  payload: Record<string, unknown>,
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.RESEARCH_COMPLETED,
    payload,
    actor
  );
}

export async function appendActionsGenerated(
  complaintId: string,
  payload: { action_count?: number },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.ACTIONS_GENERATED,
    payload,
    actor
  );
}

/** Document summarization (AI summary of complaint attachments). No notification; timeline only. Can repeat when admin re-summarizes. */
export async function appendDocumentsSummarized(
  complaintId: string,
  payload: {
    summary_id: string;
    document_count: number;
    use_complaint_context?: boolean;
    user_prompt_excerpt?: string;
  },
  actor?: TimelineActor
) {
  return appendEvent(
    complaintId,
    ComplaintTimelineEventType.DOCUMENTS_SUMMARIZED,
    payload,
    actor,
    `summary-${payload.summary_id}`,
    { skipNotification: true }
  );
}

// ---------------------------------------------------------------------------
// Read: get timeline for a complaint (chronological)
// ---------------------------------------------------------------------------

export async function getTimelineByComplaintId(
  complaintId: string,
  options?: {
    limit?: number;
    skip?: number;
    event_types?: ComplaintTimelineEventTypeValue[];
  }
): Promise<IComplaintTimelineEventLean[]> {
  const query: Record<string, unknown> = { complaint_id: complaintId };
  if (options?.event_types?.length) {
    query.event_type = { $in: options.event_types };
  }
  const q = ComplaintTimelineEvent.find(query).sort({ at: 1 }).lean();
  if (options?.skip) q.skip(options.skip);
  if (options?.limit) q.limit(options.limit);
  const result = await q.exec();
  return result as unknown as IComplaintTimelineEventLean[];
}

/** Get assignment-related events only (for "assignment history" view) */
export async function getAssignmentHistory(
  complaintId: string
): Promise<IComplaintTimelineEventLean[]> {
  return getTimelineByComplaintId(complaintId, {
    event_types: [
      ComplaintTimelineEventType.OFFICER_ASSIGNED,
      ComplaintTimelineEventType.OFFICER_REASSIGNED,
      ComplaintTimelineEventType.OFFICER_UNASSIGNED,
    ],
  });
}
