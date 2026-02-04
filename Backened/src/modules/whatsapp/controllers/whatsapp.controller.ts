import { Request, Response } from "express";
import logger from "../../../config/logger";
import { serializeErrorForLog } from "../../../utils/errors";
import { whatsappConfig, isWhatsAppConfigured } from "../config";
import { processFlowSubmission } from "../conversation/flowProcessor";
import { sendFlowMessage, sendTextMessage } from "../services/metaClient";
import { sessionStore } from "../services/sessionStore";
import { handleIncomingMessage } from "../services/sessionManager";
import {
  FlowSubmissionPayload,
  WhatsAppInboundMessage,
} from "../types";

const normalizeMessage = (raw: any): WhatsAppInboundMessage => {
  const base = {
    from: raw.from,
    id: raw.id,
    type: (raw.type || "unknown") as WhatsAppInboundMessage["type"],
  } as WhatsAppInboundMessage;

  if (raw.type === "text") {
    base.text = raw.text?.body;
  } else if (raw.type === "interactive") {
    base.interactiveType = raw.interactive?.type;
    if (raw.interactive?.list_reply) {
      base.text = raw.interactive.list_reply.title;
    }
    if (raw.interactive?.button_reply) {
      base.text = raw.interactive.button_reply.title;
    }
    if (raw.interactive?.nfm_reply?.response_json) {
      base.flowPayloadRaw = raw.interactive.nfm_reply.response_json;
    }
  } else if (raw.type === "location") {
    base.location = raw.location;
  } else if (raw.type === "image") {
    base.mediaId = raw.image?.id;
    base.mimeType = raw.image?.mime_type;
    base.fileName = raw.image?.filename;
  } else if (raw.type === "document") {
    base.mediaId = raw.document?.id;
    base.mimeType = raw.document?.mime_type;
    base.fileName = raw.document?.filename;
  }
  return base;
};

const mapFlowPayload = (
  payload: FlowSubmissionPayload["data"] & { name?: string; email?: string },
) => ({
  contact_name: payload.contact_name || payload.name,
  contact_email: payload.contact_email || payload.email,
  contact_phone: payload.contact_phone,
  title: payload.title,
  description: payload.description,
  category: payload.category,
  district_name: payload.district_name,
  subdistrict_name: payload.subdistrict_name,
  area: payload.area,
  location: payload.location,
  latitude: payload.latitude ? Number(payload.latitude) : undefined,
  longitude: payload.longitude ? Number(payload.longitude) : undefined,
  images: payload.images,
  documents: payload.documents,
});

export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === whatsappConfig.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

/**
 * Track processed message IDs to prevent duplicate processing.
 * Uses a simple in-memory Set with automatic cleanup.
 */
const processedMessageIds = new Set<string>();
const MESSAGE_ID_TTL_MS = 5 * 60 * 1000; // 5 minutes

const markMessageProcessed = (messageId: string): boolean => {
  if (processedMessageIds.has(messageId)) {
    return false; // Already processed
  }
  processedMessageIds.add(messageId);
  // Auto-cleanup after TTL
  setTimeout(() => processedMessageIds.delete(messageId), MESSAGE_ID_TTL_MS);
  return true;
};

/**
 * Process a single incoming message.
 * Flow submissions bypass session; all other messages go through session manager.
 * Save session only on success; clear on endSession (e.g. complaint submitted, other).
 */
const processMessage = async (message: WhatsAppInboundMessage): Promise<void> => {
  try {
    // Flow submission path (highest priority) - bypasses session
    if (message.flowPayloadRaw) {
      try {
        const parsed = JSON.parse(message.flowPayloadRaw);
        const flowPayload: FlowSubmissionPayload = {
          submissionId: message.id,
          phone: message.from,
          flowId: whatsappConfig.flowId || "unknown",
          flowToken: whatsappConfig.flowToken,
          data: mapFlowPayload(parsed),
        };
        const result = await processFlowSubmission(flowPayload);
        await sendTextMessage(message.from, result.message);
        await sendTextMessage(message.from, "Thanks for contacting us. Feel free to reach out anytime.");
      } catch (err) {
        logger.error("Flow submission processing error", {
          messageId: message.id,
          from: message.from,
          ...serializeErrorForLog(err),
        });
        try {
          await sendTextMessage(
            message.from,
            "We could not process the form submission. Please try again.",
          );
        } catch {
          // Ignore send failure
        }
      }
      return;
    }

    // All other messages: session manager (intent capture, file complaint, track, other)
    const result = await handleIncomingMessage(message);

    // Save session only on success (edge case: internal error / rate limit → no save)
    if (result.saveSession) {
      await sessionStore.saveSession(result.session);
    }

    // End session: clear after sending (e.g. complaint submitted, user chose "other")
    if (result.endSession) {
      await sessionStore.clearSession(message.from);
    }

    // Optional: offer Flow when user starts complaint (if Flow is configured)
    if (
      result.saveSession &&
      result.session.intent === "file" &&
      result.session.state === "COLLECT_BASICS" &&
      !result.session.data.contact_name
    ) {
      try {
        await sendFlowMessage(message.from);
      } catch {
        // Fallback to chat; replies already include first prompt
      }
    }

    // Send replies
    for (const reply of result.replies) {
      try {
        await sendTextMessage(message.from, reply);
      } catch (err) {
        logger.error("Failed to send reply", {
          from: message.from,
          ...serializeErrorForLog(err),
        });
      }
    }
  } catch (err) {
    logger.error("Unexpected error processing message", {
      messageId: message.id,
      from: message.from,
      type: message.type,
      ...serializeErrorForLog(err),
    });
  }
};

/**
 * WhatsApp Webhook Handler
 *
 * CRITICAL: Always returns 200 immediately to prevent Meta retries.
 * Message processing happens asynchronously after acknowledgment.
 *
 * This prevents:
 * - Infinite retry loops when internal errors occur
 * - Account blocking due to repeated failures
 * - Webhook timeout issues
 */
export const handleWebhook = async (req: Request, res: Response) => {
  // ALWAYS acknowledge receipt immediately - this is critical!
  // Meta will retry if we don't return 200 within ~20 seconds
  res.sendStatus(200);

  // Exit early if not configured
  if (!isWhatsAppConfigured()) {
    logger.warn("WhatsApp webhook hit but config missing");
    return;
  }

  // Process messages asynchronously (after 200 is sent)
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Handle message status updates (delivery receipts, read receipts)
    // We acknowledge but don't process these
    if (value?.statuses) {
      logger.debug("Received message status update", {
        statusCount: value.statuses.length,
      });
      return;
    }

    const messages = value?.messages || [];

    if (messages.length === 0) {
      return;
    }

    logger.info("Processing webhook messages", { count: messages.length });

    // Process each message
    for (const raw of messages) {
      const message = normalizeMessage(raw);

      // Skip if already processed (deduplication)
      if (!markMessageProcessed(message.id)) {
        logger.debug("Skipping duplicate message", { messageId: message.id });
        continue;
      }

      // Process message (never throws)
      await processMessage(message);
    }
  } catch (err) {
    // Log but don't throw - we already sent 200
    logger.error("Webhook processing error (non-fatal, already acknowledged)", {
      ...serializeErrorForLog(err),
    });
  }
};

export const testChat = async (req: Request, res: Response) => {
  const { from, message } = req.body;
  if (!from || !message) {
    return res.status(400).json({ error: "from and message are required" });
  }
  const result = await handleIncomingMessage({
    from,
    id: "test",
    type: "text",
    text: message,
  });
  if (result.saveSession) {
    await sessionStore.saveSession(result.session);
  }
  if (result.endSession) {
    await sessionStore.clearSession(from);
  }
  return res.json({
    replies: result.replies,
    state: result.session.state,
    intent: result.session.intent,
    data: result.session.data,
    complaintCreated: result.complaintCreated,
    saveSession: result.saveSession,
    endSession: result.endSession,
  });
};

export const testFlow = async (req: Request, res: Response) => {
  const { from, data } = req.body;
  if (!from || !data) {
    return res.status(400).json({ error: "from and data are required" });
  }
  try {
    const payload: FlowSubmissionPayload = {
      submissionId: "test",
      phone: from,
      flowId: whatsappConfig.flowId || "test",
      data: mapFlowPayload(data),
    };
    const result = await processFlowSubmission(payload);
    return res.json(result);
  } catch (err) {
    logger.error("testFlow error", serializeErrorForLog(err));
    return res.status(500).json({ error: "failed" });
  }
};
