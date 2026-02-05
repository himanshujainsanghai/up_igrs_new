import logger from "../../../config/logger";
import { Complaint } from "../../../models/Complaint";
import { mapToComplaintCreate } from "../mappers/complaintMapper";
import { templates } from "./templates";
import { validateComplaintData } from "../validators/complaintValidator";
import {
  validateContactName,
  validateEmail,
  validateTitle,
  validateDistrictOrSubdistrict,
  validateArea,
  validateLatitude,
  validateLongitude,
  validateContactPhone,
} from "../validators/inputValidators";
import * as complaintTimeline from "../../../services/complaintTimeline.service";
import {
  CollectedComplaintData,
  ComplaintCreateResult,
  ConversationIntent,
  ConversationState,
  WhatsAppInboundMessage,
  WhatsAppSession,
} from "../types";

const CATEGORY_SET = new Set([
  "roads",
  "water",
  "electricity",
  "documents",
  "health",
  "education",
]);

const BASIC_FIELDS_ORDER: Array<{
  key: keyof CollectedComplaintData;
  prompt: string;
  parse?: (text: string) => any;
}> = [
  { key: "contact_name", prompt: "What is your name?" },
  { key: "contact_email", prompt: "What is your email?" },
  { key: "title", prompt: "Complaint title (5-255 characters)?" },
  {
    key: "category",
    prompt:
      "Choose a category: roads, water, electricity, documents, health, education.",
    parse: (text: string) => text.toLowerCase(),
  },
  { key: "district_name", prompt: "District?" },
  { key: "subdistrict_name", prompt: "Sub-district?" },
  { key: "area", prompt: "Area/locality?" },
  // Single "location" step: user shares pin (handled by handleLocationMessage) or sends "lat, long" as fallback
  { key: "latitude", prompt: templates.askLocation },
];

/** First prompt when user chooses "file complaint". Exported for session manager. */
export const FIRST_COMPLAINT_PROMPT = BASIC_FIELDS_ORDER[0].prompt;

export interface StateMachineResult {
  replies: string[];
  session: WhatsAppSession;
  complaintCreated?: ComplaintCreateResult;
  /** When true, session should end and user gets goodbye. */
  endSession?: boolean;
}

const ensureSession = (
  user: string,
  intent: ConversationIntent
): WhatsAppSession => ({
  user,
  intent,
  state: "COLLECT_BASICS",
  data: {},
  retries: 0,
});

const setField = (
  data: CollectedComplaintData,
  key: keyof CollectedComplaintData,
  value: any
) => {
  if (value === undefined || value === null || value === "") return;
  (data as any)[key] = value;
};

export const summary = (data: CollectedComplaintData) => {
  const parts: string[] = [];
  parts.push(`Name: ${data.contact_name}`);
  parts.push(`Email: ${data.contact_email}`);
  if (data.contact_phone) parts.push(`Phone: ${data.contact_phone}`);
  parts.push(`Title: ${data.title}`);
  parts.push(`Category: ${data.category}`);
  parts.push(
    `District/Sub-district/Area: ${data.district_name} / ${data.subdistrict_name} / ${data.area}`
  );
  parts.push(`Coords: ${data.latitude}, ${data.longitude}`);
  parts.push(
    `Description: ${data.description?.slice(0, 140)}${
      (data.description || "").length > 140 ? "..." : ""
    }`
  );
  if (data.images?.length) parts.push(`Images: ${data.images.length}`);
  if (data.documents?.length) parts.push(`Documents: ${data.documents.length}`);
  return parts.join("\n");
};

const handleLocationMessage = (
  msg: WhatsAppInboundMessage,
  session: WhatsAppSession
): string[] => {
  if (!msg.location) return [];
  setField(session.data, "latitude", msg.location.latitude);
  setField(session.data, "longitude", msg.location.longitude);
  setField(session.data, "location", msg.location.address || msg.location.name);
  return ["Location received."];
};

const nextMissingBasicKey = (data: CollectedComplaintData) => {
  return BASIC_FIELDS_ORDER.find(({ key }) => !(data as any)[key]);
};

/** Map "edit phone" / "edit name" etc. to data key. */
const EDIT_FIELD_MAP: Record<string, keyof CollectedComplaintData> = {
  name: "contact_name",
  email: "contact_email",
  phone: "contact_phone",
  title: "title",
  category: "category",
  district: "district_name",
  subdistrict: "subdistrict_name",
  "sub-district": "subdistrict_name",
  area: "area",
  location: "latitude",
  description: "description",
};

export function getPromptForField(key: keyof CollectedComplaintData): string {
  const entry = BASIC_FIELDS_ORDER.find((e) => e.key === key);
  if (entry) return entry.prompt;
  if (key === "description") return templates.askDescription;
  if (key === "contact_phone") return templates.askPhone;
  return `Please provide ${key}.`;
}

/** Validate and set a single field (for EDIT_FIELD). Returns error message or null on success. */
function validateAndSetSingleField(
  session: WhatsAppSession,
  key: keyof CollectedComplaintData,
  raw: string,
  senderPhone: string
): string | null {
  const trimmed = raw.trim();
  if (key === "contact_name") {
    const v = validateContactName(trimmed);
    if (!v.ok) return v.error ?? "Invalid name.";
    setField(session.data, key, trimmed);
  } else if (key === "contact_email") {
    const v = validateEmail(trimmed);
    if (!v.ok) return v.error ?? "Invalid email.";
    setField(session.data, key, trimmed.toLowerCase());
  } else if (key === "title") {
    const v = validateTitle(trimmed);
    if (!v.ok) return v.error ?? "Invalid title.";
    setField(session.data, key, trimmed);
  } else if (key === "category") {
    const parsed = trimmed.toLowerCase();
    if (!CATEGORY_SET.has(parsed)) return templates.invalidCategory;
    setField(session.data, key, parsed);
  } else if (key === "district_name" || key === "subdistrict_name") {
    const v = validateDistrictOrSubdistrict(trimmed);
    if (!v.ok) return v.error ?? "Invalid value.";
    setField(session.data, key, trimmed);
  } else if (key === "area") {
    const v = validateArea(trimmed);
    if (!v.ok) return v.error ?? "Invalid area.";
    setField(session.data, key, trimmed);
  } else if (key === "latitude") {
    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    const latNum = parts.length >= 1 ? Number(parts[0]) : NaN;
    const longNum = parts.length >= 2 ? Number(parts[1]) : NaN;
    const vLat = validateLatitude(latNum);
    const vLong = validateLongitude(longNum);
    if (!vLat.ok) return vLat.error ?? "Invalid latitude.";
    if (!vLong.ok) return vLong.error ?? "Invalid longitude.";
    setField(session.data, "latitude", latNum);
    setField(session.data, "longitude", longNum);
  } else if (key === "description") {
    if (trimmed.length < 20)
      return "Description must be at least 20 characters.";
    if (trimmed.length > 5000)
      return "Description cannot exceed 5000 characters.";
    setField(session.data, key, trimmed);
  } else if (key === "contact_phone") {
    if (USE_CURRENT_PHONE_KEYWORDS.has(trimmed.toLowerCase())) {
      setField(session.data, key, senderPhone);
    } else {
      const v = validateContactPhone(trimmed);
      if (!v.ok) return v.error ?? "Invalid phone number.";
      setField(
        session.data,
        key,
        v.normalized ? `+91${v.normalized}` : trimmed
      );
    }
  } else {
    setField(session.data, key, trimmed);
  }
  return null;
}

const handleBasicFieldInput = (
  session: WhatsAppSession,
  messageText: string
): string | null => {
  const nextField = nextMissingBasicKey(session.data);
  if (!nextField) return null;
  const raw = messageText.trim();
  const parsed = nextField.parse ? nextField.parse(raw) : raw;

  // Per-field validation aligned with Complaint model
  if (nextField.key === "contact_name") {
    const v = validateContactName(raw);
    if (!v.ok) return v.error ?? "Invalid name.";
  } else if (nextField.key === "contact_email") {
    const v = validateEmail(raw);
    if (!v.ok) return v.error ?? "Invalid email.";
  } else if (nextField.key === "title") {
    const v = validateTitle(raw);
    if (!v.ok) return v.error ?? "Invalid title.";
  } else if (nextField.key === "category") {
    if (!CATEGORY_SET.has(String(parsed))) return templates.invalidCategory;
  } else if (
    nextField.key === "district_name" ||
    nextField.key === "subdistrict_name"
  ) {
    const v = validateDistrictOrSubdistrict(raw);
    if (!v.ok) return v.error ?? "Invalid value.";
  } else if (nextField.key === "area") {
    const v = validateArea(raw);
    if (!v.ok) return v.error ?? "Invalid area.";
  } else if (nextField.key === "latitude") {
    // Location step: accept "lat, long" or "lat long" as fallback when user didn't share pin
    const parts = raw.split(/[\s,]+/).filter(Boolean);
    const latNum = parts.length >= 1 ? Number(parts[0]) : NaN;
    const longNum = parts.length >= 2 ? Number(parts[1]) : NaN;
    const vLat = validateLatitude(latNum);
    const vLong = validateLongitude(longNum);
    if (!vLat.ok) return vLat.error ?? "Invalid latitude.";
    if (!vLong.ok) return vLong.error ?? "Invalid longitude.";
    setField(session.data, "latitude", latNum);
    setField(session.data, "longitude", longNum);
    const remaining = nextMissingBasicKey(session.data);
    if (remaining) return remaining.prompt;
    session.state = "COLLECT_DESCRIPTION";
    session.pendingDescriptionBuffer = undefined;
    return templates.askDescription;
  }

  setField(session.data, nextField.key, parsed);
  const remaining = nextMissingBasicKey(session.data);
  if (remaining) {
    return remaining.prompt;
  }
  session.state = "COLLECT_DESCRIPTION";
  session.pendingDescriptionBuffer = undefined;
  return templates.askDescription;
};

const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 5000;

export interface HandleDescriptionOptions {
  /** After valid "done": state to set (default COLLECT_PHONE). */
  afterDoneState?: ConversationState;
  /** After valid "done": reply to return (default templates.askPhone). */
  afterDoneReply?: string;
  /** If set, clear pendingEditField when finalizing (for EDIT description). */
  pendingEditFieldToClear?: boolean;
}

const handleDescription = (
  session: WhatsAppSession,
  text: string,
  options?: HandleDescriptionOptions
): string => {
  const cleaned = text.trim().toLowerCase();
  const buffer = session.pendingDescriptionBuffer ?? "";

  if (cleaned === "done") {
    const final = buffer.trim();
    if (final.length < DESCRIPTION_MIN) {
      return templates.descriptionTooShort;
    }
    if (final.length > DESCRIPTION_MAX) {
      return templates.descriptionTooLong;
    }
    setField(session.data, "description", final);
    session.pendingDescriptionBuffer = undefined;
    session.state = options?.afterDoneState ?? "COLLECT_PHONE";
    if (options?.pendingEditFieldToClear) {
      session.pendingEditField = undefined;
    }
    return options?.afterDoneReply ?? templates.askPhone;
  }

  const trimmed = text.trim();
  if (!trimmed) return templates.descriptionAdded;

  const next = buffer ? `${buffer}\n${trimmed}` : trimmed;
  if (next.length > DESCRIPTION_MAX) {
    return templates.descriptionTooLong;
  }
  session.pendingDescriptionBuffer = next;
  return templates.descriptionAdded;
};

/** Keywords to use sender's current WhatsApp number. */
const USE_CURRENT_PHONE_KEYWORDS = new Set([
  "yes",
  "y",
  "use current",
  "current",
  "same",
  "this number",
  "my number",
  "ok",
]);

const handlePhone = (
  session: WhatsAppSession,
  text: string,
  senderPhone: string
): string => {
  const cleaned = text.trim();
  if (!cleaned) return templates.askPhone;

  if (USE_CURRENT_PHONE_KEYWORDS.has(cleaned.toLowerCase())) {
    setField(session.data, "contact_phone", senderPhone);
    session.state = "COLLECT_MEDIA";
    return templates.askMedia;
  }

  const v = validateContactPhone(cleaned);
  if (!v.ok) return v.error ?? "Invalid phone number.";
  setField(
    session.data,
    "contact_phone",
    v.normalized
      ? `+91${v.normalized}`
      : cleaned.replace(/\D/g, "").length === 10
      ? `+91${cleaned.replace(/\D/g, "")}`
      : cleaned
  );
  session.state = "COLLECT_MEDIA";
  return templates.askMedia;
};

const handleMedia = (
  session: WhatsAppSession,
  msg: WhatsAppInboundMessage
): string => {
  // Session manager already downloads, persists to S3, and adds { url, fileName, mimeType }.
  // Do NOT add a second entry (with empty url) or validation fails on images.1.url / documents.1.url.
  if (msg.type === "image") {
    const already = session.data.images?.some(
      (i) =>
        i.mediaId === msg.mediaId ||
        i.fileName === msg.mediaId ||
        (i.url && msg.mediaId && i.fileName?.startsWith(msg.mediaId))
    );
    if (already) return `Image received. ${templates.askDoneConfirm}`;
    session.data.images = session.data.images || [];
    session.data.images.push({
      url: "",
      mediaId: msg.mediaId,
      mimeType: msg.mimeType,
      fileName: msg.fileName,
    });
    return `Image received. ${templates.askDoneConfirm}`;
  }
  if (msg.type === "document") {
    const already = session.data.documents?.some(
      (i) =>
        i.mediaId === msg.mediaId ||
        i.fileName === msg.mediaId ||
        (i.url && msg.mediaId && i.fileName?.startsWith(msg.mediaId))
    );
    if (already) return `Document received. ${templates.askDoneConfirm}`;
    session.data.documents = session.data.documents || [];
    session.data.documents.push({
      url: "",
      mediaId: msg.mediaId,
      mimeType: msg.mimeType,
      fileName: msg.fileName,
    });
    return `Document received. ${templates.askDoneConfirm}`;
  }
  if (msg.text?.toLowerCase() === "done") {
    session.state = "CONFIRM";
    return templates.confirm(summary(session.data));
  }
  return `Send images/documents, or reply DONE when finished. ${templates.askDoneConfirm}`;
};

const handleConfirm = async (
  session: WhatsAppSession,
  text: string
): Promise<{
  replies: string[];
  complaintCreated?: ComplaintCreateResult;
  endSession?: boolean;
}> => {
  const lower = text.trim().toLowerCase();
  if (lower === "yes" || lower === "submit") {
    // Only keep media entries that have a valid url (session manager adds these; state machine may have added duplicates with url: "")
    if (session.data.images?.length) {
      session.data.images = session.data.images.filter(
        (i) => i.url && i.url.startsWith("http")
      );
    }
    if (session.data.documents?.length) {
      session.data.documents = session.data.documents.filter(
        (i) => i.url && i.url.startsWith("http")
      );
    }
    const validation = validateComplaintData(session.data);
    if (!validation.success) {
      const missing = validation.error.errors
        .map((e) => e.path.join("."))
        .join(", ");
      return {
        replies: [`Cannot submit yet. Issues: ${missing}`],
      };
    }
    const toCreate = mapToComplaintCreate(validation.data);
    const doc = await Complaint.create(toCreate);
    try {
      await complaintTimeline.appendComplaintCreated(
        doc.id,
        { title: doc.title, category: doc.category },
        { role: "citizen" }
      );
    } catch (err) {
      logger.warn(
        "Timeline appendComplaintCreated failed (WhatsApp flow):",
        err
      );
    }
    session.state = "DONE";
    return {
      replies: [templates.submitted(doc.complaint_id || doc.id)],
      complaintCreated: {
        complaint_id: doc.complaint_id || doc.id,
        id: doc.id,
      },
      endSession: true,
    };
  }
  if (lower.startsWith("edit")) {
    const rest = lower.replace(/^edit\s*/, "").trim();
    const fieldKey = rest ? EDIT_FIELD_MAP[rest] : undefined;
    if (!rest) {
      return {
        replies: [
          "Which field do you want to change? Reply:\nEDIT NAME, EDIT EMAIL, EDIT PHONE, EDIT TITLE, EDIT CATEGORY, EDIT DISTRICT, EDIT SUBDISTRICT, EDIT AREA, EDIT LOCATION, or EDIT DESCRIPTION.",
        ],
      };
    }
    if (!fieldKey) {
      return {
        replies: [
          `I didn't recognise "${rest}". Reply EDIT NAME, EDIT EMAIL, EDIT PHONE, EDIT TITLE, EDIT CATEGORY, EDIT DISTRICT, EDIT SUBDISTRICT, EDIT AREA, EDIT LOCATION, or EDIT DESCRIPTION.`,
        ],
      };
    }
    session.pendingEditField = fieldKey;
    session.state = "EDIT_FIELD";
    if (fieldKey === "latitude") {
      session.data.latitude = undefined;
      session.data.longitude = undefined;
      session.data.location = undefined;
    }
    if (fieldKey === "description") {
      session.pendingDescriptionBuffer = undefined;
    }
    return {
      replies: [getPromptForField(fieldKey)],
    };
  }
  return { replies: ["Please reply YES to submit or EDIT <field> to change."] };
};

export const processChatMessage = async (
  incoming: WhatsAppInboundMessage,
  session: WhatsAppSession | null
): Promise<StateMachineResult> => {
  const current = session || ensureSession(incoming.from, "file");
  const FREE_FORM_TEXT_CAP = 15_000;

  if (incoming.text && incoming.text.trim().toLowerCase() === "new") {
    current.state = "COLLECT_BASICS";
    current.data = {};
    current.pendingDescriptionBuffer = undefined;
    current.fileMode = undefined;
    current.freeFormTextBuffer = undefined;
    current.pendingMissingFields = undefined;
    return {
      replies: ["Starting a new complaint. " + BASIC_FIELDS_ORDER[0].prompt],
      session: current,
    };
  }
  const replies: string[] = [];

  // Handle location pins at any step (sets latitude, longitude, location when user shares pin)
  replies.push(...handleLocationMessage(incoming, current));

  if (current.state === "COLLECT_FREE_FORM") {
    const text = (incoming.text || "").trim();
    if (text.toLowerCase() === "done") {
      replies.push(templates.freeFormDoneProcessing);
      return { replies, session: current };
    }
    if (text) {
      const buf = current.freeFormTextBuffer ?? "";
      const next = buf ? `${buf}\n${text}` : text;
      if (next.length > FREE_FORM_TEXT_CAP) {
        replies.push(
          "Message limit reached. Reply *done* to continue with what we have."
        );
      } else {
        current.freeFormTextBuffer = next;
        replies.push(templates.freeFormAdded);
      }
    } else {
      // Media-only message (image/document): acknowledge so user gets a reply
      replies.push(templates.freeFormAdded);
    }
    return { replies, session: current };
  }

  if (current.state === "AI_PROCESSING") {
    replies.push(templates.aiProcessingWait);
    return { replies, session: current };
  }

  if (
    current.state === "FILL_MISSING" &&
    current.pendingMissingFields?.length
  ) {
    const key = current.pendingMissingFields[0];
    if (key === "latitude") {
      if (incoming.location) {
        setField(current.data, "latitude", incoming.location.latitude);
        setField(current.data, "longitude", incoming.location.longitude);
        setField(
          current.data,
          "location",
          incoming.location.address || incoming.location.name
        );
        current.pendingMissingFields = current.pendingMissingFields.slice(1);
        if (current.pendingMissingFields.length === 0) {
          current.state = "CONFIRM";
          replies.push(templates.confirm(summary(current.data)));
          replies.push("Reply YES to submit or EDIT <field> to change.");
        } else {
          replies.push(getPromptForField(current.pendingMissingFields[0]));
        }
      } else {
        const raw = (incoming.text || "").trim();
        const parts = raw.split(/[\s,]+/).filter(Boolean);
        const latNum = parts.length >= 1 ? Number(parts[0]) : NaN;
        const longNum = parts.length >= 2 ? Number(parts[1]) : NaN;
        const vLat = validateLatitude(latNum);
        const vLong = validateLongitude(longNum);
        if (!vLat.ok) {
          replies.push(vLat.error ?? "Invalid latitude.");
          replies.push(templates.askLocation);
        } else if (!vLong.ok) {
          replies.push(vLong.error ?? "Invalid longitude.");
          replies.push(templates.askLocation);
        } else {
          setField(current.data, "latitude", latNum);
          setField(current.data, "longitude", longNum);
          current.pendingMissingFields = current.pendingMissingFields.slice(1);
          if (current.pendingMissingFields.length === 0) {
            current.state = "CONFIRM";
            replies.push(templates.confirm(summary(current.data)));
            replies.push("Reply YES to submit or EDIT <field> to change.");
          } else {
            replies.push(getPromptForField(current.pendingMissingFields[0]));
          }
        }
      }
    } else {
      const err = validateAndSetSingleField(
        current,
        key,
        (incoming.text || "").trim(),
        current.user
      );
      if (err) {
        replies.push(err);
        replies.push(getPromptForField(key));
      } else {
        current.pendingMissingFields = current.pendingMissingFields.slice(1);
        if (current.pendingMissingFields.length === 0) {
          current.state = "CONFIRM";
          replies.push(templates.confirm(summary(current.data)));
          replies.push("Reply YES to submit or EDIT <field> to change.");
        } else {
          replies.push(getPromptForField(current.pendingMissingFields[0]));
        }
      }
    }
    return { replies, session: current };
  }

  if (current.state === "COLLECT_BASICS") {
    const prompt = handleBasicFieldInput(current, incoming.text || "");
    if (prompt) {
      replies.push(prompt);
    } else if (!nextMissingBasicKey(current.data)) {
      // All basics filled (e.g. user just sent location pin) → ask for description
      current.state = "COLLECT_DESCRIPTION";
      current.pendingDescriptionBuffer = undefined;
      replies.push(templates.askDescription);
    }
  } else if (current.state === "COLLECT_DESCRIPTION") {
    replies.push(handleDescription(current, incoming.text || ""));
  } else if (current.state === "COLLECT_PHONE") {
    replies.push(handlePhone(current, incoming.text || "", current.user));
  } else if (current.state === "COLLECT_MEDIA") {
    replies.push(handleMedia(current, incoming));
  } else if (current.state === "CONFIRM") {
    const result = await handleConfirm(current, incoming.text || "");
    replies.push(...result.replies);
    if (result.complaintCreated) {
      return {
        replies,
        session: current,
        complaintCreated: result.complaintCreated,
        endSession: result.endSession,
      };
    }
  } else if (current.state === "EDIT_FIELD" && current.pendingEditField) {
    const key = current.pendingEditField;
    if (key === "latitude" && incoming.location) {
      current.pendingEditField = undefined;
      current.state = "CONFIRM";
      replies.push("Location updated.");
      replies.push(templates.confirm(summary(current.data)));
      replies.push("Reply YES to submit or EDIT <field> to change.");
    } else if (key === "description") {
      const reply = handleDescription(current, incoming.text || "", {
        afterDoneState: "CONFIRM",
        afterDoneReply: `Updated.\n${templates.confirm(
          summary(current.data)
        )}\nReply YES to submit or EDIT <field> to change.`,
        pendingEditFieldToClear: true,
      });
      replies.push(reply);
    } else {
      const text = incoming.text || "";
      const err = validateAndSetSingleField(current, key, text, current.user);
      if (err) {
        replies.push(err);
        replies.push(getPromptForField(key));
      } else {
        current.pendingEditField = undefined;
        current.state = "CONFIRM";
        replies.push("Updated.");
        replies.push(templates.confirm(summary(current.data)));
        replies.push("Reply YES to submit or EDIT <field> to change.");
      }
    }
  } else if (current.state === "DONE") {
    replies.push(
      "Your complaint is already submitted. Reply NEW to start again."
    );
  } else {
    replies.push(templates.askBasics);
    current.state = "COLLECT_BASICS";
  }

  return { replies, session: current };
};
