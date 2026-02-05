/**
 * Background job: run AI parse for WhatsApp free-form complaint, merge into session,
 * then send follow-up (fill-missing prompts or confirm summary).
 * Called via setImmediate after user says "done" in COLLECT_FREE_FORM.
 */

import logger from "../../../config/logger";
import { sessionStore } from "./sessionStore";
import { sendTextMessage } from "./metaClient";
import {
  parseComplaintFromFreeForm,
  getMissingRequiredFieldsOrdered,
} from "./aiParse.service";
import { getPromptForField, summary } from "../conversation/stateMachine";
import { templates } from "../conversation/templates";
import type { CollectedComplaintData } from "../types";

const FIELD_LABELS: Record<keyof CollectedComplaintData, string> = {
  contact_name: "Name",
  contact_email: "Email",
  contact_phone: "Phone",
  title: "Title",
  description: "Description",
  category: "Category",
  district_name: "District",
  subdistrict_name: "Sub-district",
  area: "Area",
  location: "Location (text)",
  latitude: "Location (pin)",
  longitude: "",
  images: "Images",
  documents: "Documents",
};

function formatHave(data: Partial<CollectedComplaintData>): string {
  const parts: string[] = [];
  if (data.contact_name) parts.push(`Name: ${data.contact_name}`);
  if (data.contact_email) parts.push(`Email: ${data.contact_email}`);
  if (data.contact_phone) parts.push(`Phone: ${data.contact_phone}`);
  if (data.title) parts.push(`Title: ${data.title}`);
  if (data.category) parts.push(`Category: ${data.category}`);
  if (data.district_name) parts.push(`District: ${data.district_name}`);
  if (data.subdistrict_name)
    parts.push(`Sub-district: ${data.subdistrict_name}`);
  if (data.area) parts.push(`Area: ${data.area}`);
  if (data.description)
    parts.push(
      `Description: ${data.description.slice(0, 100)}${
        data.description.length > 100 ? "..." : ""
      }`
    );
  if (data.latitude != null && data.longitude != null)
    parts.push(`Location: ${data.latitude}, ${data.longitude}`);
  const n = (data.images?.length ?? 0) + (data.documents?.length ?? 0);
  if (n > 0) parts.push(`Attachments: ${n}`);
  return parts.length > 0 ? parts.join("\n") : "Nothing yet.";
}

function formatNeedList(missing: (keyof CollectedComplaintData)[]): string {
  const names = missing
    .filter((k) => k !== "longitude")
    .map((k) => FIELD_LABELS[k] || k);
  return names.join(", ");
}

/**
 * Run AI parse for the given user, merge validated result into session,
 * set FILL_MISSING or CONFIRM, save, and send WhatsApp reply.
 */
export async function runAiParseJob(userId: string): Promise<void> {
  let session = await sessionStore.getSession(userId);
  if (!session || session.state !== "AI_PROCESSING") {
    logger.debug("AiParseJob: skip, no session or not AI_PROCESSING", {
      userId,
      state: session?.state,
    });
    return;
  }

  const text = (session.freeFormTextBuffer ?? "").trim();
  try {
    const { partial, missingFields } = await parseComplaintFromFreeForm(text, {
      documentSummaries: undefined,
    });

    Object.assign(session.data, partial);
    session.freeFormTextBuffer = undefined;
    session.aiRequestedAt = undefined;

    const missingAfterMerge = getMissingRequiredFieldsOrdered(session.data);

    if (missingAfterMerge.length === 0) {
      session.state = "CONFIRM";
      session.pendingMissingFields = undefined;
      const msg = `${templates.confirm(
        summary(session.data as CollectedComplaintData)
      )}\nReply YES to submit or EDIT <field> to change.`;
      await sessionStore.saveSession(session);
      await sendTextMessage(userId, msg);
      return;
    }

    session.state = "FILL_MISSING";
    session.pendingMissingFields = missingAfterMerge;
    const haveStr = formatHave(session.data);
    const needStr = formatNeedList(missingAfterMerge);
    const firstPrompt = getPromptForField(missingAfterMerge[0]);
    const msg = templates.fillMissingIntro(haveStr, needStr, firstPrompt);
    await sessionStore.saveSession(session);
    await sendTextMessage(userId, msg);
  } catch (err) {
    logger.error("AiParseJob: parse or send failed", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    session = await sessionStore.getSession(userId);
    if (session && session.state === "AI_PROCESSING") {
      session.state = "COLLECT_FREE_FORM";
      session.aiRequestedAt = undefined;
      await sessionStore.saveSession(session);
      await sendTextMessage(userId, templates.aiFailedFallback);
    }
  }
}
