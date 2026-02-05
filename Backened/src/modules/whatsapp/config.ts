import env from "../../config/env";

export interface WhatsAppConfig {
  accessToken: string;
  verifyToken: string;
  phoneNumberId: string;
  flowId?: string;
  flowToken?: string;
  webhookPath: string;
  apiBaseUrl: string;
  appBaseUrl?: string;
  redisUrl?: string;
  /** Model for AI-assisted free-form complaint parsing (WHATSAPP_CONVERSATION_MODEL). */
  conversationModel?: string;
}

export const whatsappConfig: WhatsAppConfig = {
  accessToken: env.WHATSAPP_ACCESS_TOKEN || "",
  verifyToken: env.WHATSAPP_VERIFY_TOKEN || "",
  phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || "",
  flowId: env.WHATSAPP_FLOW_ID,
  flowToken: env.WHATSAPP_FLOW_TOKEN,
  webhookPath: env.WHATSAPP_WEBHOOK_PATH || "/api/v1/whatsapp/webhook",
  apiBaseUrl: "https://graph.facebook.com/v19.0",
  appBaseUrl: env.FRONTEND_URL || "http://localhost:8080",
  redisUrl: env.REDIS_URL,
  conversationModel: env.WHATSAPP_CONVERSATION_MODEL,
};

export const isWhatsAppConfigured = (): boolean =>
  Boolean(
    whatsappConfig.accessToken &&
      whatsappConfig.verifyToken &&
      whatsappConfig.phoneNumberId
  );
