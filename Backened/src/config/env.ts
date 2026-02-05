import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  AWS_ACCESS_KEY_ID: string; // Optional in development
  AWS_SECRET_ACCESS_KEY: string; // Optional in development
  AWS_REGION: string; // Optional in development
  S3_BUCKET_NAME: string; // Optional in development
  OPENAI_API_KEY: string; // Fallback/legacy
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_VISION_MODEL?: string;
  DOC_SUMMARIZE_MODEL?: string;
  WHATSAPP_CONVERSATION_MODEL?: string; // WhatsApp AI-assisted complaint parsing
  LOCATIONIQ_API_KEY?: string;
  CORS_ORIGIN: string;
  FRONTEND_URL: string;
  // WhatsApp / Meta Cloud
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_FLOW_ID?: string;
  WHATSAPP_FLOW_TOKEN?: string;
  WHATSAPP_WEBHOOK_PATH?: string;
  // Redis (optional, for session store)
  REDIS_URL?: string;
  // SMTP Email Configuration
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM_EMAIL?: string; // Fixed sender email (defaults to SMTP_USER if not provided)
  SMTP_POOL?: boolean; // Enable connection pooling
  SMTP_MAX_CONNECTIONS?: number; // Max connections in pool
  SMTP_MAX_MESSAGES?: number; // Max messages per connection
}

/**
 * Validate and export environment variables
 */
const validateEnv = (): EnvConfig => {
  const required = ["MONGODB_URI", "JWT_SECRET"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // AWS S3 variables - optional in development, required for file uploads
  const awsVars = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "S3_BUCKET_NAME",
  ];
  const missingAws = awsVars.filter((key) => !process.env[key]);
  if (missingAws.length > 0) {
    const isDev =
      process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
    if (isDev) {
      console.warn(
        `⚠️  Warning: Missing AWS S3 variables: ${missingAws.join(
          ", "
        )}. File upload features will not work.`
      );
    } else {
      throw new Error(
        `Missing required AWS S3 environment variables: ${missingAws.join(
          ", "
        )}`
      );
    }
  }

  // Either OpenAI or OpenRouter key is required for AI features
  if (!process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    console.warn(
      "⚠️  Warning: Neither OPENAI_API_KEY nor OPENROUTER_API_KEY is set. AI features will not work."
    );
  }

  // SMTP Email variables - optional, required for email functionality
  const smtpVars = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missingSmtp = smtpVars.filter((key) => !process.env[key]);
  if (missingSmtp.length > 0) {
    const isDev =
      process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
    if (isDev) {
      console.warn(
        `⚠️  Warning: Missing SMTP variables: ${missingSmtp.join(
          ", "
        )}. Email features will not work.`
      );
    } else {
      console.warn(
        `⚠️  Warning: Missing SMTP variables: ${missingSmtp.join(
          ", "
        )}. Email features will not work.`
      );
    }
  }

  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: parseInt(process.env.PORT || "5000", 10),
    MONGODB_URI: process.env.MONGODB_URI!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
    AWS_REGION: process.env.AWS_REGION || "us-east-1",
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || "",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    OPENROUTER_API_KEY:
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "openai/gpt-4o",
    OPENROUTER_VISION_MODEL:
      process.env.OPENROUTER_VISION_MODEL || "openai/gpt-4o",
    DOC_SUMMARIZE_MODEL:
      process.env.DOC_SUMMARIZE_MODEL || "google/gemini-3-flash-preview",
    WHATSAPP_CONVERSATION_MODEL:
      process.env.WHATSAPP_CONVERSATION_MODEL ||
      process.env.DOC_SUMMARIZE_MODEL ||
      "google/gemini-3-flash-preview",
    LOCATIONIQ_API_KEY: process.env.LOCATIONIQ_API_KEY || "",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:8080",
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:8080",
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_FLOW_ID: process.env.WHATSAPP_FLOW_ID,
    WHATSAPP_FLOW_TOKEN: process.env.WHATSAPP_FLOW_TOKEN,
    WHATSAPP_WEBHOOK_PATH:
      process.env.WHATSAPP_WEBHOOK_PATH || "/api/v1/whatsapp/webhook",
    REDIS_URL: process.env.REDIS_URL,
    // SMTP Email Configuration
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT
      ? parseInt(process.env.SMTP_PORT, 10)
      : undefined,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER, // Default to SMTP_USER if not provided
    SMTP_POOL: process.env.SMTP_POOL === "true",
    SMTP_MAX_CONNECTIONS: process.env.SMTP_MAX_CONNECTIONS
      ? parseInt(process.env.SMTP_MAX_CONNECTIONS, 10)
      : 5,
    SMTP_MAX_MESSAGES: process.env.SMTP_MAX_MESSAGES
      ? parseInt(process.env.SMTP_MAX_MESSAGES, 10)
      : 100,
  };
};

export const env = validateEnv();

export default env;
