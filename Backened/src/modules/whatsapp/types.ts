import { IComplaint } from "../../models/Complaint";

export type WhatsAppCategory = IComplaint["category"];

/** Intent is set after user chooses from START (1=file, 2=track, 3=other). */
export type ConversationIntent = "file" | "track" | "other";

export type ConversationState =
  | "START"
  | "COLLECT_BASICS"
  | "COLLECT_LOCATION_DETAILS"
  | "COLLECT_DESCRIPTION"
  | "COLLECT_PHONE"
  | "COLLECT_MEDIA"
  | "CONFIRM"
  | "EDIT_FIELD"
  | "SUBMIT"
  | "TRACK_START"
  | "TRACK_ID_CAPTURE"
  | "TRACK_RESULT"
  | "DONE"
  | "CANCELLED";

export interface AttachmentMeta {
  url: string;
  fileName?: string;
  mimeType?: string;
  mediaId?: string;
}

export interface CollectedComplaintData {
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  title?: string;
  description?: string;
  category?: WhatsAppCategory;
  district_name?: string;
  subdistrict_name?: string;
  area?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  images?: AttachmentMeta[];
  documents?: AttachmentMeta[];
}

export interface WhatsAppSession {
  user: string; // WhatsApp phone number (with country code)
  /** Set after intent capture (START → 1/2/3). Undefined when state is START. */
  intent?: ConversationIntent;
  state: ConversationState;
  data: CollectedComplaintData;
  /** When state is EDIT_FIELD, which field the user is editing. */
  pendingEditField?: keyof CollectedComplaintData;
  flowVersion?: string;
  lastMessageAt?: number;
  retries?: number;
  correlationId?: string;
}

export interface FlowSubmissionPayload {
  submissionId: string;
  phone: string;
  flowId: string;
  flowToken?: string;
  data: CollectedComplaintData;
}

export interface MediaDownloadResult {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface WhatsAppInboundMessage {
  from: string;
  id: string;
  type:
    | "text"
    | "interactive"
    | "image"
    | "document"
    | "audio"
    | "video"
    | "location"
    | "unknown";
  text?: string;
  interactiveType?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  mediaId?: string;
  mimeType?: string;
  fileName?: string;
  flowPayloadRaw?: string;
}

export interface ComplaintCreateResult {
  complaint_id: string;
  id: string;
}
