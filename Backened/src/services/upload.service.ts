/**
 * File Upload Service
 * Handles S3 file uploads, deletions, and URL generation
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";
import logger from "../config/logger";
import { v4 as uuidv4 } from "uuid";

/** Default expiry for presigned view URLs (1 hour) */
const PRESIGNED_VIEW_EXPIRY = 3600;
/** Default expiry for presigned upload URLs (15 min) */
const PRESIGNED_UPLOAD_EXPIRY = 900;

// Initialize S3 client (only if AWS credentials are provided)
const getS3Client = (): S3Client | null => {
  if (
    !env.AWS_ACCESS_KEY_ID ||
    !env.AWS_SECRET_ACCESS_KEY ||
    !env.AWS_REGION ||
    !env.S3_BUCKET_NAME
  ) {
    return null;
  }
  return new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

/**
 * Upload file to S3
 */
export interface UploadFileOptions {
  file: Buffer;
  fileName: string;
  mimeType: string;
  folder?: string; // Optional folder path (e.g., 'complaints', 'meetings', 'documents')
}

export interface UploadResult {
  url: string;
  key: string;
  fileName: string;
  fileSize: number;
}

export const uploadToS3 = async (
  options: UploadFileOptions,
): Promise<UploadResult> => {
  const s3Client = getS3Client();

  if (!s3Client) {
    throw new Error(
      "AWS S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET_NAME environment variables.",
    );
  }

  try {
    const { file, fileName, mimeType, folder = "uploads" } = options;

    // Generate unique file key
    const fileExtension = fileName.split(".").pop() || "";
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const key = `${folder}/${uniqueFileName}`;

    // Upload to S3
    // Note: Modern S3 buckets have ACLs disabled by default
    // Use bucket policy for public access instead of ACL
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: mimeType,
      // ACL removed - use bucket policy for public access if needed
    });

    await s3Client.send(command);

    // Construct public URL
    const url = `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

    logger.info(`File uploaded to S3: ${key}`);

    return {
      url,
      key,
      fileName,
      fileSize: file.length,
    };
  } catch (error) {
    logger.error("S3 upload error:", error);
    throw new Error(
      `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Delete file from S3
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  const s3Client = getS3Client();

  if (!s3Client) {
    throw new Error(
      "AWS S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET_NAME environment variables.",
    );
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    logger.info(`File deleted from S3: ${key}`);
  } catch (error) {
    logger.error("S3 delete error:", error);
    throw new Error(
      `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Extract S3 key from URL
 */
export const extractKeyFromUrl = (url: string): string | null => {
  try {
    // Extract key from S3 URL: https://bucket.s3.region.amazonaws.com/folder/file.ext
    const match = url.match(/https:\/\/[^\/]+\.s3\.[^\/]+\/(.+)$/);
    return match ? match[1] : null;
  } catch (error) {
    logger.error("Error extracting key from URL:", error);
    return null;
  }
};

/**
 * Generate presigned URL for viewing a private S3 object (GET)
 */
export const generatePresignedUrl = async (
  key: string,
  expiresIn: number = PRESIGNED_VIEW_EXPIRY,
): Promise<string> => {
  const s3Client = getS3Client();

  if (!s3Client) {
    throw new Error(
      "AWS S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET_NAME environment variables.",
    );
  }

  try {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error("Error generating presigned URL:", error);
    throw new Error(
      `Failed to generate presigned URL: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Generate presigned URL for uploading a file to S3 (PUT).
 * Client should PUT the file to uploadUrl with Content-Type header set to contentType.
 * Returns the key and canonical url to store in DB (same format as uploadToS3).
 */
export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  url: string;
  expiresIn: number;
}

export const generatePresignedUploadUrl = async (options: {
  fileName: string;
  contentType: string;
  folder?: string;
  expiresIn?: number;
}): Promise<PresignedUploadResult> => {
  const s3Client = getS3Client();

  if (!s3Client) {
    throw new Error(
      "AWS S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET_NAME environment variables.",
    );
  }

  const {
    fileName,
    contentType,
    folder = "uploads",
    expiresIn = PRESIGNED_UPLOAD_EXPIRY,
  } = options;

  try {
    const fileExtension = fileName.split(".").pop() || "";
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const key = `${folder}/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
    const url = `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

    logger.info(`Presigned upload URL generated for key: ${key}`);

    return {
      uploadUrl,
      key,
      url,
      expiresIn,
    };
  } catch (error) {
    logger.error("Error generating presigned upload URL:", error);
    throw new Error(
      `Failed to generate presigned upload URL: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Validate file type
 */
export const validateFileType = (
  mimeType: string,
  allowedTypes: string[],
): boolean => {
  return allowedTypes.includes(mimeType);
};

/**
 * Validate file size
 */
export const validateFileSize = (
  fileSize: number,
  maxSizeBytes: number,
): boolean => {
  return fileSize <= maxSizeBytes;
};

/**
 * Allowed file types
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
];

/**
 * Max file sizes (in bytes)
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export default {
  uploadToS3,
  deleteFromS3,
  extractKeyFromUrl,
  generatePresignedUrl,
  generatePresignedUploadUrl,
  validateFileType,
  validateFileSize,
};
