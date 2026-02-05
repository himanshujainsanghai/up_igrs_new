import { IComplaint } from "../../models/Complaint";

export type WhatsAppCategory = IComplaint["category"];

/** Intent is set after user chooses from START (1=file, 2=track, 3=other). */
export type ConversationIntent = "file" | "track" | "other";

export type ConversationState =
  | "START"
  | "COLLECT_FILE_MODE"
  | "COLLECT_BASICS"
  | "COLLECT_LOCATION_DETAILS"
  | "COLLECT_FREE_FORM"
  | "COLLECT_DESCRIPTION"
  | "COLLECT_PHONE"
  | "COLLECT_MEDIA"
  | "AI_PROCESSING"
  | "FILL_MISSING"
  | "CONFIRM"
  | "EDIT_FIELD"
  | "SUBMIT"
  | "TRACK_START"
  | "TRACK_ID_CAPTURE"
  | "TRACK_RESULT"
  | "DONE"
  | "CANCELLED";

/** How the user chose to file: step-by-step or AI-assisted (describe in one go). */
export type FileMode = "step" | "ai";

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
  user: string;
  intent?: ConversationIntent;
  state: ConversationState;
  data: CollectedComplaintData;
  /** Step-by-step vs AI-assisted (describe in one go). Set when filing. */
  fileMode?: FileMode;
  /** Accumulated text in COLLECT_DESCRIPTION until user sends "done". */
  pendingDescriptionBuffer?: string;
  /** In COLLECT_FREE_FORM: text to send to AI until user says "done". */
  freeFormTextBuffer?: string;
  /** When AI_PROCESSING was set (for timeout). */
  aiRequestedAt?: number;
  /** In FILL_MISSING: ordered list of missing field keys to ask for. */
  pendingMissingFields?: (keyof CollectedComplaintData)[];
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
