/**
 * NOTIFICATION MODULE - EVENT HANDLERS
 * Maps each notifiable event type to recipients (admins + officers) and title/body.
 * Admin: receives every notification when event is enabled.
 * Officer: receives only officer-relevant events (assign/unassign/reassign/extension).
 * Complaint-isolated: complaint_id is always set on every notification.
 */

import type { RecipientResult } from "./types";
import type { NotificationInput } from "./types";
import {
  getAllAdminUserIds,
  getAssignedOfficerUserId,
  getExtensionRequesterUserId,
} from "./recipients";

export interface ResolveResult {
  recipients: RecipientResult;
  title: string;
  body: string;
}

type Payload = Record<string, unknown>;

/**
 * Resolve recipients and build title/body for a timeline event.
 * Returns combined admin + officer user ids and one title/body for the event.
 */
export async function resolveForEvent(
  eventType: string,
  complaintId: string,
  payload: Payload = {}
): Promise<ResolveResult> {
  const adminUserIds = await getAllAdminUserIds();
  const officerUserIds: string[] = [];

  const p = payload as {
    assigned_to_user_id?: string;
    previous_officer_id?: string;
    new_officer_id?: string;
    request_id?: string;
    officer_name?: string;
    new_officer_name?: string;
    previous_officer_name?: string;
    closed_by_name?: string;
    excerpt?: string;
    file_name?: string;
    file_type?: string;
  };

  let title = "";
  let body = "";

  switch (eventType) {
    case "complaint_created":
      title = "New complaint created";
      body = payload?.title
        ? String(payload.title)
        : "A new complaint was created.";
      break;

    case "officer_assigned":
      title = "Complaint assigned to you";
      body = p.officer_name
        ? `You have been assigned to a complaint.`
        : "Complaint assigned.";
      if (p.assigned_to_user_id) officerUserIds.push(p.assigned_to_user_id);
      break;

    case "officer_reassigned":
      title = "Complaint reassigned";
      body = p.new_officer_name
        ? `Complaint reassigned to ${p.new_officer_name}.`
        : "Complaint reassigned.";
      if (p.previous_officer_id) officerUserIds.push(p.previous_officer_id);
      if (p.new_officer_id) officerUserIds.push(p.new_officer_id);
      break;

    case "officer_unassigned":
      title = "Complaint unassigned from you";
      body = "The complaint has been unassigned from you.";
      if (p.previous_officer_id) officerUserIds.push(p.previous_officer_id);
      break;

    case "extension_requested":
      title = "Extension requested";
      body = "An officer has requested a time extension for a complaint.";
      break;

    case "extension_approved": {
      title = "Extension approved";
      body = "Your time extension request has been approved.";
      const requester = p.request_id
        ? await getExtensionRequesterUserId(String(p.request_id))
        : null;
      if (requester) officerUserIds.push(requester);
      break;
    }

    case "extension_rejected": {
      title = "Extension rejected";
      body = "Your time extension request has been rejected.";
      const requester = p.request_id
        ? await getExtensionRequesterUserId(String(p.request_id))
        : null;
      if (requester) officerUserIds.push(requester);
      break;
    }

    case "complaint_closed":
      title = "Complaint closed";
      body = p.closed_by_name
        ? `Closed by ${p.closed_by_name}.`
        : "Complaint has been closed.";
      break;

    case "note_added":
      title = "Note added to complaint";
      body = p.excerpt ? String(p.excerpt).slice(0, 120) : "A note was added.";
      const noteOfficer = await getAssignedOfficerUserId(complaintId);
      if (noteOfficer) officerUserIds.push(noteOfficer);
      break;

    case "document_added":
      title = "Document added to complaint";
      body = p.file_name
        ? `Document: ${p.file_name} (${String(
            p.file_type ?? ""
          ).toLowerCase()})`
        : "A document was added.";
      const docOfficer = await getAssignedOfficerUserId(complaintId);
      if (docOfficer) officerUserIds.push(docOfficer);
      break;

    case "officer_note_added":
      title = "Officer added a note";
      body = p.excerpt
        ? String(p.excerpt).slice(0, 120)
        : "An officer added a note.";
      break;

    case "officer_document_added":
      title = "Officer added a document";
      body = p.file_name
        ? `Document: ${p.file_name}`
        : "An officer added a document.";
      break;

    default:
      title = "Complaint update";
      body = `Event: ${eventType}`;
  }

  const officerDedup = [...new Set(officerUserIds)];
  return {
    recipients: { adminUserIds, officerUserIds: officerDedup },
    title,
    body,
  };
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
