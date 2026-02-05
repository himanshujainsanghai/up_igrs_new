/**
 * AI-assisted complaint parsing for WhatsApp free-form flow.
 * Uses WHATSAPP_CONVERSATION_MODEL to extract complaint fields from text + optional document summaries.
 * All extracted values are validated against Complaint model and input validators.
 */

import logger from "../../../config/logger";
import { callLLM } from "../../../services/ai.service";
import { whatsappConfig } from "../config";
import type { CollectedComplaintData, WhatsAppCategory } from "../types";
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
import { validateComplaintData } from "../validators/complaintValidator";

const CATEGORY_SET = new Set<WhatsAppCategory>([
  "roads",
  "water",
  "electricity",
  "documents",
  "health",
  "education",
]);

const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 5000;
const LOCATION_MAX = 500;

/** Ordered keys required for a valid complaint (Complaint model + complaintValidator). */
export const REQUIRED_FIELDS_ORDER: (keyof CollectedComplaintData)[] = [
  "contact_name",
  "contact_email",
  "title",
  "category",
  "district_name",
  "subdistrict_name",
  "area",
  "latitude",
  "longitude",
  "description",
  "contact_phone",
];

/** Raw AI response shape (do not trust; validate everything). */
interface AIExtractRaw {
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  district_name?: string | null;
  subdistrict_name?: string | null;
  area?: string | null;
  location?: string | null;
}

export interface ParseComplaintResult {
  /** Validated partial data safe to merge into session.data. */
  partial: Partial<CollectedComplaintData>;
  /** Ordered list of required field keys still missing (for FILL_MISSING). */
  missingFields: (keyof CollectedComplaintData)[];
}

function setIfValid<T>(
  partial: Partial<CollectedComplaintData>,
  key: keyof CollectedComplaintData,
  value: T
): void {
  if (value === undefined || value === null || value === "") return;
  (partial as Record<string, unknown>)[key] = value;
}

/**
 * Validate AI-extracted fields and merge only valid ones into partial.
 * Aligned with Complaint model and complaintValidator.
 */
function validateAndMerge(
  partial: Partial<CollectedComplaintData>,
  raw: AIExtractRaw
): void {
  if (raw.contact_name != null && raw.contact_name !== "") {
    const v = validateContactName(String(raw.contact_name).trim());
    if (v.ok)
      setIfValid(partial, "contact_name", String(raw.contact_name).trim());
  }
  if (raw.contact_email != null && raw.contact_email !== "") {
    const v = validateEmail(String(raw.contact_email).trim().toLowerCase());
    if (v.ok)
      setIfValid(
        partial,
        "contact_email",
        String(raw.contact_email).trim().toLowerCase()
      );
  }
  if (raw.contact_phone != null && raw.contact_phone !== "") {
    const v = validateContactPhone(String(raw.contact_phone).trim());
    if (v.ok) {
      const normalized =
        v.normalized != null
          ? `+91${v.normalized}`
          : String(raw.contact_phone).trim().replace(/\D/g, "").length === 10
          ? `+91${String(raw.contact_phone).trim().replace(/\D/g, "")}`
          : String(raw.contact_phone).trim();
      setIfValid(partial, "contact_phone", normalized);
    }
  }
  if (raw.title != null && raw.title !== "") {
    const v = validateTitle(String(raw.title).trim());
    if (v.ok) setIfValid(partial, "title", String(raw.title).trim());
  }
  if (raw.description != null && raw.description !== "") {
    const s = String(raw.description).trim();
    if (s.length >= DESCRIPTION_MIN && s.length <= DESCRIPTION_MAX)
      setIfValid(partial, "description", s);
    else if (s.length > DESCRIPTION_MAX)
      setIfValid(partial, "description", s.slice(0, DESCRIPTION_MAX));
  }
  if (raw.category != null && raw.category !== "") {
    const c = String(raw.category).trim().toLowerCase() as WhatsAppCategory;
    if (CATEGORY_SET.has(c)) setIfValid(partial, "category", c);
  }
  if (raw.district_name != null && raw.district_name !== "") {
    const v = validateDistrictOrSubdistrict(String(raw.district_name).trim());
    if (v.ok)
      setIfValid(partial, "district_name", String(raw.district_name).trim());
  }
  if (raw.subdistrict_name != null && raw.subdistrict_name !== "") {
    const v = validateDistrictOrSubdistrict(
      String(raw.subdistrict_name).trim()
    );
    if (v.ok)
      setIfValid(
        partial,
        "subdistrict_name",
        String(raw.subdistrict_name).trim()
      );
  }
  if (raw.area != null && raw.area !== "") {
    const v = validateArea(String(raw.area).trim());
    if (v.ok) setIfValid(partial, "area", String(raw.area).trim());
  }
  if (raw.location != null && raw.location !== "") {
    const s = String(raw.location).trim();
    if (s.length <= LOCATION_MAX) setIfValid(partial, "location", s);
  }
  // Latitude/longitude: only if AI explicitly extracted numbers (e.g. "28.6139, 77.2090")
  const latLongMatch =
    typeof raw.location === "string" &&
    /[-]?\d+\.?\d*\s*,\s*[-]?\d+\.?\d*/.test(raw.location);
  if (latLongMatch && raw.location) {
    const parts = String(raw.location)
      .split(/[\s,]+/)
      .filter(Boolean);
    const latNum = parts.length >= 1 ? Number(parts[0]) : NaN;
    const longNum = parts.length >= 2 ? Number(parts[1]) : NaN;
    if (validateLatitude(latNum).ok && validateLongitude(longNum).ok) {
      setIfValid(partial, "latitude", latNum);
      setIfValid(partial, "longitude", longNum);
    }
  }
}

/**
 * Compute ordered list of missing required fields from current data.
 * Uses same order as REQUIRED_FIELDS_ORDER; latitude/longitude counted as one "latitude" slot.
 */
export function getMissingRequiredFieldsOrdered(
  data: Partial<CollectedComplaintData>
): (keyof CollectedComplaintData)[] {
  const missing: (keyof CollectedComplaintData)[] = [];
  for (const key of REQUIRED_FIELDS_ORDER) {
    if (key === "longitude") continue;
    if (key === "latitude") {
      const hasLat =
        typeof data.latitude === "number" && !Number.isNaN(data.latitude);
      const hasLong =
        typeof data.longitude === "number" && !Number.isNaN(data.longitude);
      if (!hasLat || !hasLong) missing.push("latitude");
      continue;
    }
    const val = (data as Record<string, unknown>)[key];
    if (val === undefined || val === null || val === "") missing.push(key);
  }
  return missing;
}

const SYSTEM_PROMPT = `You are a complaint intake assistant for Uttar Pradesh government grievances. Extract structured fields from the citizen's message and any document summaries. Output ONLY valid JSON. Do not invent data; if something is not stated or not visible, omit that field or use null.

Output a single JSON object with these optional keys (use null or omit if not found):
- contact_name (string, 2-100 chars, English letters and spaces only)
- contact_email (string, valid email)
- contact_phone (string, 10 digits starting with 6/7/8/9, or with +91)
- title (string, 5-255 chars, complaint title)
- description (string, 20-5000 chars, issue description)
- category (one of: roads, water, electricity, documents, health, education)
- district_name (string, 2-100 chars)
- subdistrict_name (string, 2-100 chars)
- area (string, 2-200 chars, locality/area)
- location (string, optional address or place name, max 500 chars)

Do NOT output latitude, longitude, or images. If the user writes coordinates like "28.6139, 77.2090" you may put them in location as-is.`;

function buildUserPrompt(text: string, documentSummaries?: string[]): string {
  let prompt =
    "Extract complaint fields from the following message(s).\n\nTEXT:\n";
  prompt += text || "(no text)";
  if (documentSummaries && documentSummaries.length > 0) {
    prompt += "\n\nATTACHMENT SUMMARIES:\n";
    documentSummaries.forEach((s, i) => {
      prompt += `[${i + 1}]\n${s}\n`;
    });
  }
  prompt +=
    "\n\nRespond with a single JSON object only. Use null for missing fields.";
  return prompt;
}

/**
 * Parse free-form text (and optional document summaries) into validated partial complaint data
 * and ordered missing fields. Uses WHATSAPP_CONVERSATION_MODEL.
 */
export async function parseComplaintFromFreeForm(
  text: string,
  options?: {
    documentSummaries?: string[];
    model?: string;
  }
): Promise<ParseComplaintResult> {
  const model =
    options?.model ||
    whatsappConfig.conversationModel ||
    "google/gemini-3-flash-preview";
  const trimmedText = (text || "").trim();
  const userPrompt = buildUserPrompt(trimmedText, options?.documentSummaries);

  let rawContent: string;
  try {
    rawContent = await callLLM(userPrompt, SYSTEM_PROMPT, {
      model,
      maxTokens: 2000,
      temperature: 0.2,
      responseFormat: "json",
    });
  } catch (err) {
    logger.error("WhatsApp AI parse: LLM call failed", {
      model,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  let raw: AIExtractRaw;
  try {
    const parsed = JSON.parse(rawContent) as Record<string, unknown>;
    raw = {
      contact_name: parsed.contact_name as string | null,
      contact_email: parsed.contact_email as string | null,
      contact_phone: parsed.contact_phone as string | null,
      title: parsed.title as string | null,
      description: parsed.description as string | null,
      category: parsed.category as string | null,
      district_name: parsed.district_name as string | null,
      subdistrict_name: parsed.subdistrict_name as string | null,
      area: parsed.area as string | null,
      location: parsed.location as string | null,
    };
  } catch {
    logger.warn("WhatsApp AI parse: invalid JSON response", {
      model,
      preview: rawContent?.slice(0, 200),
    });
    return {
      partial: {},
      missingFields: [...REQUIRED_FIELDS_ORDER],
    };
  }

  const partial: Partial<CollectedComplaintData> = {};
  validateAndMerge(partial, raw);
  const missingFields = getMissingRequiredFieldsOrdered(partial);
  return { partial, missingFields };
}
