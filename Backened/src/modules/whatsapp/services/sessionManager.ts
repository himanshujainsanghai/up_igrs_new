import logger from "../../../config/logger";
import { serializeErrorForLog } from "../../../utils/errors";
import {
  processChatMessage,
  FIRST_COMPLAINT_PROMPT,
  getPromptForField,
} from "../conversation/stateMachine";
import { getTrackingReplies } from "../conversation/trackHandler";
import { templates, STALE_SESSION_MS } from "../conversation/templates";
import { downloadMedia } from "./metaClient";
import { persistMedia } from "./storage";
import { sessionStore } from "./sessionStore";
import {
  ConversationIntent,
  WhatsAppInboundMessage,
  WhatsAppSession,
  ComplaintCreateResult,
} from "../types";
import { runAiParseJob } from "./aiParseJob";

/** Result from session manager: what to send and whether to persist. */
export interface SessionManagerResult {
  replies: string[];
  session: WhatsAppSession;
  /** If true, controller must save session. If false, do not save (e.g. error or rate limit). */
  saveSession: boolean;
  /** If true, controller must clear session after sending replies (e.g. complaint submitted, other). */
  endSession: boolean;
  complaintCreated?: ComplaintCreateResult;
}

/** Keywords that reset session to START (cancel). */
const CANCEL_KEYWORDS = new Set([
  "cancel",
  "cancelar",
  "quit",
  "back",
  "0",
  "stop",
]);

/** Parse intent from START: 1/2/3 or file/track/other. */
function parseIntent(text: string | undefined): ConversationIntent | null {
  if (!text || !text.trim()) return null;
  const t = text.trim().toLowerCase();
  if (t === "1" || t === "file" || t === "complaint") return "file";
  if (t === "2" || t === "track" || t === "status") return "track";
  if (
    t === "3" ||
    t === "other" ||
    t === "hi" ||
    t === "hello" ||
    t === "no" ||
    t === "nothing"
  )
    return "other";
  return null;
}

function isCancelKeyword(text: string | undefined): boolean {
  if (!text || !text.trim()) return false;
  return CANCEL_KEYWORDS.has(text.trim().toLowerCase());
}

/** Per-user rate limit: in-memory, window 1 min, max 15 messages. */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 15;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(user: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(user);
  if (!entry) {
    rateLimitMap.set(user, { count: 1, windowStart: now });
    return false;
  }
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function createNewSession(user: string): WhatsAppSession {
  return {
    user,
    state: "START",
    data: {},
    retries: 0,
  };
}

function resetToStart(session: WhatsAppSession): void {
  session.state = "START";
  session.intent = undefined;
  session.data = {};
}

/**
 * Session manager: single entry for all WhatsApp chat flows.
 * - Rate limit, get/create session, stale check, cancel, intent capture.
 * - Routes to complaint (file), track, or other (goodbye).
 * - Save only on success; never save on error or rate limit.
 */
export async function handleIncomingMessage(
  message: WhatsAppInboundMessage
): Promise<SessionManagerResult> {
  const from = message.from;

  // 1. Rate limit
  if (isRateLimited(from)) {
    logger.warn("User rate limited", {
      service: "grievance-aid-backend",
      from,
    });
    return {
      replies: [templates.rateLimit],
      session: createNewSession(from),
      saveSession: false,
      endSession: false,
    };
  }

  // 2. Retrieve existing session
  let session = await sessionStore.getSession(from);
  if (!session) {
    session = createNewSession(from);
    logger.info("User session created", {
      service: "grievance-aid-backend",
      from,
      state: session.state,
    });
    // First message: only welcome + intent menu (no parsing of their message yet)
    return {
      replies: [templates.welcomeIntent],
      session,
      saveSession: true,
      endSession: false,
    };
  }

  logger.info("User session restored", {
    service: "grievance-aid-backend",
    from,
    state: session.state,
    intent: session.intent,
  });

  // 3. Stale session: reset to START and show welcome back (we only reach here with existing session)
  const lastMessageAt = session.lastMessageAt ?? 0;
  if (lastMessageAt && Date.now() - lastMessageAt > STALE_SESSION_MS) {
    resetToStart(session);
    logger.info("User session reset (stale)", {
      service: "grievance-aid-backend",
      from,
      lastMessageAt: new Date(lastMessageAt).toISOString(),
    });
    return {
      replies: [templates.welcomeBack + templates.welcomeIntent],
      session,
      saveSession: true,
      endSession: false,
    };
  }

  // 4. Cancel: clear session so user starts fresh; show menu again.
  // If they continue, next message will create a new session and they'll pick intent again.
  if (isCancelKeyword(message.text)) {
    logger.info("User session cleared (cancel)", {
      service: "grievance-aid-backend",
      from,
    });
    return {
      replies: [templates.cancel + templates.welcomeIntent],
      session: createNewSession(from),
      saveSession: false,
      endSession: true,
    };
  }

  // 5. Intent capture (START)
  if (session.state === "START") {
    const intent = parseIntent(message.text);
    if (intent === null) {
      return {
        replies: [templates.invalidIntent, templates.welcomeIntent],
        session,
        saveSession: false,
        endSession: false,
      };
    }
    session.intent = intent;
    if (intent === "other") {
      session.state = "DONE";
      logger.info("User session terminated", {
        service: "grievance-aid-backend",
        from,
        reason: "goodbye",
      });
      return {
        replies: [templates.goodbye],
        session,
        saveSession: true,
        endSession: true,
      };
    }
    if (intent === "file") {
      session.state = "COLLECT_FILE_MODE";
      return {
        replies: [templates.askFileMode],
        session,
        saveSession: true,
        endSession: false,
      };
    }
    // intent === "track"
    session.state = "TRACK_START";
    try {
      const trackResult = await getTrackingReplies(message.text);
      const endTrack = trackResult.resolved;
      if (endTrack) {
        session.state = "DONE";
      }
      return {
        replies: trackResult.replies,
        session,
        saveSession: true,
        endSession: endTrack,
      };
    } catch (err) {
      logger.error("Track handler error", {
        from,
        ...serializeErrorForLog(err),
      });
      return {
        replies: [templates.errorGeneric],
        session,
        saveSession: false,
        endSession: false,
      };
    }
  }

  // 6. Route by intent (file or track)
  if (session.intent === "track") {
    try {
      const trackResult = await getTrackingReplies(message.text);
      if (trackResult.resolved) {
        session.state = "DONE";
        logger.info("User session terminated", {
          service: "grievance-aid-backend",
          from,
          reason: "track_resolved",
        });
      }
      return {
        replies: trackResult.replies,
        session,
        saveSession: true,
        endSession: trackResult.resolved,
      };
    } catch (err) {
      logger.error("Track handler error", { from });
      return {
        replies: [templates.errorGeneric],
        session,
        saveSession: false,
        endSession: false,
      };
    }
  }

  // 6b. File mode choice (A = describe in one go, B = step-by-step)
  if (session.intent === "file" && session.state === "COLLECT_FILE_MODE") {
    const t = (message.text || "").trim().toLowerCase();
    if (t === "a" || t === "ai" || t === "1a") {
      session.fileMode = "ai";
      session.state = "COLLECT_FREE_FORM";
      session.freeFormTextBuffer = undefined;
      return {
        replies: [templates.askFreeForm],
        session,
        saveSession: true,
        endSession: false,
      };
    }
    if (t === "b" || t === "step" || t === "1b") {
      session.fileMode = "step";
      session.state = "COLLECT_BASICS";
      return {
        replies: [FIRST_COMPLAINT_PROMPT],
        session,
        saveSession: true,
        endSession: false,
      };
    }
    return {
      replies: [templates.invalidFileMode, templates.askFileMode],
      session,
      saveSession: false,
      endSession: false,
    };
  }

  // 7. File complaint: handle media then state machine
  if (session.intent === "file") {
    if (
      (message.type === "image" || message.type === "document") &&
      message.mediaId
    ) {
      try {
        const media = await downloadMedia(message.mediaId);
        const stored = await persistMedia(media, "complaints");
        if (message.type === "image") {
          session.data.images = session.data.images || [];
          session.data.images.push({
            url: stored.url,
            fileName: media.fileName,
            mimeType: media.mimeType,
          });
        } else {
          session.data.documents = session.data.documents || [];
          session.data.documents.push({
            url: stored.url,
            fileName: media.fileName,
            mimeType: media.mimeType,
          });
        }
      } catch (err) {
        logger.error("Media processing error in session manager", {
          service: "grievance-aid-backend",
          messageId: message.id,
          mediaId: message.mediaId,
          from: message.from,
          ...serializeErrorForLog(err),
        });
        const msg =
          err instanceof Error && err.message.includes("Unsupported")
            ? "That file type isn’t supported. Please send an image (JPG, PNG) or document (PDF, Word, Excel)."
            : err instanceof Error && err.message.includes("too large")
            ? "File is too large. Images max 10MB, documents max 50MB."
            : err instanceof Error &&
              err.message.includes("AWS S3 is not configured")
            ? "File upload is not configured. Please contact support."
            : "We could not process that file. Please try again or send a smaller file.";
        return {
          replies: [msg],
          session,
          saveSession: false,
          endSession: false,
        };
      }
    }

    try {
      const result = await processChatMessage(message, session);
      let outSession = result.session;

      if (
        outSession.state === "COLLECT_FREE_FORM" &&
        (message.text || "").trim().toLowerCase() === "done"
      ) {
        const hasContent =
          (outSession.freeFormTextBuffer ?? "").trim().length >= 20 ||
          (outSession.data.images?.length ?? 0) > 0 ||
          (outSession.data.documents?.length ?? 0) > 0;
        if (!hasContent) {
          return {
            replies: [templates.freeFormDoneMinContent],
            session: outSession,
            saveSession: true,
            endSession: false,
          };
        }
        outSession.state = "AI_PROCESSING";
        outSession.aiRequestedAt = Date.now();
        setImmediate(() => runAiParseJob(from));
      }

      const replies = [...result.replies];
      if (result.endSession) {
        logger.info("User session terminated", {
          service: "grievance-aid-backend",
          from,
          reason: "complaint_submitted",
          complaintId: result.complaintCreated?.complaint_id,
        });
        replies.push(templates.goodbye);
      }
      return {
        replies,
        session: outSession,
        saveSession: true,
        endSession: Boolean(result.endSession),
        complaintCreated: result.complaintCreated,
      };
    } catch (err) {
      logger.error("Complaint flow error", { from });
      return {
        replies: [templates.errorGeneric],
        session,
        saveSession: false,
        endSession: false,
      };
    }
  }

  // Fallback: should not reach (other already ended)
  return {
    replies: [templates.welcomeIntent],
    session: createNewSession(from),
    saveSession: true,
    endSession: false,
  };
}
