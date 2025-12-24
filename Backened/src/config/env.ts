import dotenv from 'dotenv';

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
  LOCATIONIQ_API_KEY?: string;
  CORS_ORIGIN: string;
  FRONTEND_URL: string;
}

/**
 * Validate and export environment variables
 */
const validateEnv = (): EnvConfig => {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // AWS S3 variables - optional in development, required for file uploads
  const awsVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET_NAME'];
  const missingAws = awsVars.filter((key) => !process.env[key]);
  if (missingAws.length > 0) {
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    if (isDev) {
      console.warn(`⚠️  Warning: Missing AWS S3 variables: ${missingAws.join(', ')}. File upload features will not work.`);
    } else {
      throw new Error(`Missing required AWS S3 environment variables: ${missingAws.join(', ')}`);
    }
  }

  // Either OpenAI or OpenRouter key is required for AI features
  if (!process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    console.warn('⚠️  Warning: Neither OPENAI_API_KEY nor OPENROUTER_API_KEY is set. AI features will not work.');
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    MONGODB_URI: process.env.MONGODB_URI!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openai/gpt-4o',
    OPENROUTER_VISION_MODEL: process.env.OPENROUTER_VISION_MODEL || 'openai/gpt-4o',
    LOCATIONIQ_API_KEY: process.env.LOCATIONIQ_API_KEY || '',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:8080',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8080',
  };
};

export const env = validateEnv();

export default env;

