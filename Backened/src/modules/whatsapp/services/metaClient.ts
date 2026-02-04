import axios from "axios";
import logger from "../../../config/logger";
import { serializeErrorForLog } from "../../../utils/errors";
import { whatsappConfig } from "../config";
import { MediaDownloadResult } from "../types";

const graph = axios.create({
  baseURL: whatsappConfig.apiBaseUrl,
  timeout: 12000,
});

const authHeaders = () => ({
  Authorization: `Bearer ${whatsappConfig.accessToken}`,
  "Content-Type": "application/json",
});

/** Transient network errors that are worth retrying. */
const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ENETUNREACH",
  "EAI_AGAIN",
]);

function isRetryableNetworkError(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err
      ? (err as { code?: string }).code
      : undefined;
  return typeof code === "string" && RETRYABLE_CODES.has(code);
}

const META_SEND_RETRIES = 3;
const META_SEND_RETRY_DELAY_MS = 500;

/** Run a Meta API call with retries on transient network errors. */
async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= META_SEND_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const canRetry =
        attempt < META_SEND_RETRIES && isRetryableNetworkError(err);
      if (canRetry) {
        const delayMs = META_SEND_RETRY_DELAY_MS * attempt;
        logger.warn(
          `${context}: transient error (attempt ${attempt}/${META_SEND_RETRIES}), retrying in ${delayMs}ms`,
          { code: (err as { code?: string }).code }
        );
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

export const sendTextMessage = async (to: string, body: string) => {
  if (!whatsappConfig.accessToken || !whatsappConfig.phoneNumberId) {
    logger.warn("WhatsApp not configured; skipping send");
    return;
  }
  try {
    await withRetry(
      () =>
        graph.post(
          `/${whatsappConfig.phoneNumberId}/messages`,
          {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { preview_url: false, body },
          },
          { headers: authHeaders() }
        ),
      "Meta API: send text message"
    );
  } catch (err) {
    logger.error("Meta API: Failed to send text message", {
      to,
      ...serializeErrorForLog(err),
    });
    throw err;
  }
};

export const sendListMessage = async (
  to: string,
  header: string,
  body: string,
  buttonText: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>
) => {
  if (!whatsappConfig.accessToken || !whatsappConfig.phoneNumberId) {
    logger.warn("WhatsApp not configured; skipping send");
    return;
  }
  try {
    await withRetry(
      () =>
        graph.post(
          `/${whatsappConfig.phoneNumberId}/messages`,
          {
            messaging_product: "whatsapp",
            to,
            type: "interactive",
            interactive: {
              type: "list",
              header: { type: "text", text: header },
              body: { text: body },
              footer: { text: "Select an option" },
              action: {
                button: buttonText,
                sections,
              },
            },
          },
          { headers: authHeaders() }
        ),
      "Meta API: send list message"
    );
  } catch (err) {
    logger.error("Meta API: Failed to send list message", {
      to,
      ...serializeErrorForLog(err),
    });
    throw err;
  }
};

/**
 * Send a WhatsApp Flow message to initiate the complaint form.
 *
 * Per Meta's API docs, required parameters are:
 * - flow_message_version: "3"
 * - flow_id or flow_name
 * - flow_cta (button text, max 20 chars)
 *
 * Optional parameters:
 * - mode: "draft" or "published"
 * - flow_token: identifier for the session
 * - flow_action: "navigate" (default) or "data_exchange"
 * - flow_action_payload: { screen, data } for initial screen/data
 */
export const sendFlowMessage = async (
  to: string,
  initialData?: Record<string, unknown>
) => {
  if (
    !whatsappConfig.accessToken ||
    !whatsappConfig.phoneNumberId ||
    !whatsappConfig.flowId
  ) {
    logger.warn("WhatsApp Flow not configured; skipping send");
    return;
  }
  try {
    // Build parameters object per Meta's Flow API spec
    const parameters: Record<string, unknown> = {
      flow_message_version: "3", // REQUIRED by Meta
      flow_id: whatsappConfig.flowId, // REQUIRED
      flow_cta: "File Complaint", // REQUIRED - button text (max 20 chars)
      flow_action: "navigate", // Optional, default is "navigate"
      mode: "draft", // "draft" for testing, "published" for prod
      flow_token: whatsappConfig.flowToken || "unused",
    };

    // If initial data needs to be passed to the Flow's first screen
    if (initialData && Object.keys(initialData).length > 0) {
      parameters.flow_action_payload = {
        screen: "COMPLAINT_DETAILS", // Must match your Flow's first screen ID
        data: initialData,
      };
    }

    await withRetry(
      () =>
        graph.post(
          `/${whatsappConfig.phoneNumberId}/messages`,
          {
            messaging_product: "whatsapp",
            to,
            type: "interactive",
            interactive: {
              type: "flow",
              header: { type: "text", text: "File a Complaint" },
              body: {
                text: "Tap the button below to open the complaint form.",
              },
              footer: { text: "All fields marked * are required." },
              action: {
                name: "flow",
                parameters,
              },
            },
          },
          { headers: authHeaders() }
        ),
      "Meta API: send Flow message"
    );
  } catch (err) {
    logger.error("Meta API: Failed to send Flow message", {
      to,
      ...serializeErrorForLog(err),
    });
    throw err;
  }
};

/** Base URL is already https://graph.facebook.com/v19.0 — use path /{mediaId} only. */
export const fetchMediaUrl = async (
  mediaId: string
): Promise<{ url: string; mimeType: string }> => {
  const response = await graph.get(`/${mediaId}`, { headers: authHeaders() });
  const url = response.data?.url;
  const mimeType = response.data?.mime_type || "application/octet-stream";
  if (!url) {
    throw new Error("Media URL not returned by API");
  }
  return { url, mimeType };
};

/** Map MIME type to file extension for stored filename. */
const mimeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
};

export const downloadMedia = async (
  mediaId: string
): Promise<MediaDownloadResult> => {
  const { url, mimeType } = await fetchMediaUrl(mediaId);
  const ext =
    mimeToExtension[mimeType] || mimeType.split("/")[1]?.split("+")[0] || "bin";
  const fileName = `${mediaId}.${ext}`;

  const res = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    headers: authHeaders(),
    maxContentLength: 60 * 1024 * 1024, // 60MB
    maxBodyLength: 60 * 1024 * 1024,
  });
  const buffer = Buffer.from(res.data);
  return { buffer, fileName, mimeType, fileSize: buffer.length };
};

export const markMessageRead = async (messageId: string) => {
  if (!whatsappConfig.accessToken || !whatsappConfig.phoneNumberId) return;
  try {
    await graph.post(
      `/${whatsappConfig.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
      { headers: authHeaders() }
    );
  } catch (err) {
    logger.warn(
      "Meta API: Failed to mark message read",
      serializeErrorForLog(err)
    );
  }
};
