/**
 * NOTIFICATION MODULE - EVENT HANDLERS
 * Resolves recipients using EVENT_RECEIVER_MAP (single source of truth) and builds title/body.
 * To change who receives what: edit eventReceiversMap.ts (append to receivers array to add recipients).
 */

import type { RecipientResult } from "./types";
import type { NotificationInput } from "./types";
import type { NotifiableEventType } from "./types";
import { isNotifiableEventType } from "./types";
import {
  getAllAdminUserIds,
  getAssignedOfficerUserId,
  getExtensionRequesterUserId,
  getOfficerUserId,
} from "./recipients";
import {
  EVENT_RECEIVER_MAP,
  type EventReceiverConfig,
  type ReceiverKind,
} from "./eventReceiversMap";

export interface ResolveResult {
  recipients: RecipientResult;
  title: string;
  body: string;
}

type Payload = Record<string, unknown>;

type PayloadShape = {
  assigned_to_user_id?: string;
  previous_officer_id?: string;
  new_officer_id?: string;
  request_id?: string;
  officer_name?: string;
  new_officer_name?: string;
  closed_by_name?: string;
  closed_by_user_id?: string;
  created_by_user_id?: string;
  excerpt?: string;
  file_name?: string;
  file_type?: string;
};

/**
 * Resolve one receiver kind to user ids (used by resolveForEvent from EVENT_RECEIVER_MAP).
 */
async function resolveReceiverKind(
  kind: ReceiverKind,
  complaintId: string,
  payload: PayloadShape,
  config: EventReceiverConfig
): Promise<{ adminIds: string[]; officerIds: string[] }> {
  const adminIds: string[] = [];
  const officerIds: string[] = [];

  switch (kind) {
    case "admins": {
      let ids = await getAllAdminUserIds();
      if (
        config.excludeSelfPayloadKey &&
        payload[config.excludeSelfPayloadKey as keyof PayloadShape]
      ) {
        const exclude =
          payload[config.excludeSelfPayloadKey as keyof PayloadShape];
        ids = ids.filter((id) => id !== exclude);
      }
      adminIds.push(...ids);
      break;
    }
    case "assigned_officer": {
      const id = await getAssignedOfficerUserId(complaintId);
      if (
        config.assignedOfficerExceptCloser &&
        id === payload.closed_by_user_id
      )
        break;
      if (id) officerIds.push(id);
      break;
    }
    case "previous_officer":
      if (payload.previous_officer_id) {
        const uid = await getOfficerUserId(String(payload.previous_officer_id));
        if (uid) officerIds.push(uid);
      }
      break;
    case "new_officer":
      if (payload.new_officer_id) {
        const uid = await getOfficerUserId(String(payload.new_officer_id));
        if (uid) officerIds.push(uid);
      }
      break;
    case "extension_requester":
      if (payload.request_id) {
        const uid = await getExtensionRequesterUserId(
          String(payload.request_id)
        );
        if (uid) officerIds.push(uid);
      }
      break;
  }

  return { adminIds, officerIds };
}

/**
 * Resolve recipients from EVENT_RECEIVER_MAP and build title/body for a timeline event.
 */
export async function resolveForEvent(
  eventType: string,
  complaintId: string,
  payload: Payload = {}
): Promise<ResolveResult> {
  const p = payload as PayloadShape;
  let adminUserIds: string[] = [];
  let officerUserIds: string[] = [];

  const config = isNotifiableEventType(eventType)
    ? EVENT_RECEIVER_MAP[eventType as NotifiableEventType]
    : null;

  if (config) {
    for (const kind of config.receivers) {
      const { adminIds, officerIds } = await resolveReceiverKind(
        kind,
        complaintId,
        p,
        config
      );
      adminUserIds.push(...adminIds);
      officerUserIds.push(...officerIds);
    }
    officerUserIds = [...new Set(officerUserIds)];
  }

  const { title, body } = getTitleAndBody(eventType, payload);
  return {
    recipients: { adminUserIds, officerUserIds },
    title,
    body,
  };
}

/** Title and body per event (payload-dependent copy). */
function getTitleAndBody(
  eventType: string,
  payload: Payload
): { title: string; body: string } {
  const p = payload as PayloadShape;
  switch (eventType) {
    case "complaint_created":
      return {
        title: "New complaint created",
        body: payload?.title
          ? String(payload.title)
          : "A new complaint was created.",
      };
    case "officer_assigned":
      return {
        title: "Complaint assigned to you",
        body: p.officer_name
          ? "You have been assigned to a complaint."
          : "Complaint assigned.",
      };
    case "officer_reassigned":
      return {
        title: "Complaint reassigned",
        body: p.new_officer_name
          ? `Complaint reassigned to ${p.new_officer_name}.`
          : "Complaint reassigned.",
      };
    case "officer_unassigned":
      return {
        title: "Complaint unassigned from you",
        body: "The complaint has been unassigned from you.",
      };
    case "extension_requested":
      return {
        title: "Extension requested",
        body: "An officer has requested a time extension for a complaint.",
      };
    case "extension_approved":
      return {
        title: "Extension approved",
        body: "Your time extension request has been approved.",
      };
    case "extension_rejected":
      return {
        title: "Extension rejected",
        body: "Your time extension request has been rejected.",
      };
    case "complaint_closed":
      return {
        title: "Complaint closed",
        body: p.closed_by_name
          ? `Closed by ${p.closed_by_name}.`
          : "Complaint has been closed.",
      };
    case "note_added":
      return {
        title: "Note added to complaint",
        body: p.excerpt ? String(p.excerpt).slice(0, 120) : "A note was added.",
      };
    case "document_added":
      return {
        title: "Document added to complaint",
        body: p.file_name
          ? `Document: ${p.file_name} (${String(
              p.file_type ?? ""
            ).toLowerCase()})`
          : "A document was added.",
      };
    case "officer_note_added":
      return {
        title: "Officer added a note",
        body: p.excerpt
          ? String(p.excerpt).slice(0, 120)
          : "An officer added a note.",
      };
    case "officer_document_added":
      return {
        title: "Officer added a document",
        body: p.file_name
          ? `Document: ${p.file_name}`
          : "An officer added a document.",
      };
    default:
      return { title: "Complaint update", body: `Event: ${eventType}` };
  }
}

/**
 * Build NotificationInput list for all recipients (complaint-isolated: same complaint_id for all).
 */
export function buildNotificationInputs(
  complaintId: string,
  eventType: string,
  timelineEventId: string,
  res: ResolveResult
): NotificationInput[] {
  const allUserIds = [
    ...new Set([
      ...res.recipients.adminUserIds,
      ...res.recipients.officerUserIds,
    ]),
  ];
  return allUserIds.map((user_id) => ({
    user_id,
    event_type: eventType,
    complaint_id: complaintId,
    title: res.title,
    body: res.body,
    payload: {},
    timeline_event_id: timelineEventId,
  }));
}
