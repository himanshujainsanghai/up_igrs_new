import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as uploadService from "../services/upload.service";
import { sendSuccess } from "../utils/response";
import { ValidationError } from "../utils/errors";
import logger from "../config/logger";

/**
 * Upload Controller
 * Handles file upload requests
 */

/**
 * POST /api/v1/upload/image
 * Upload image file
 */
export const uploadImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      throw new ValidationError("No file uploaded");
    }

    // Validate file type
    if (
      !uploadService.validateFileType(
        file.mimetype,
        uploadService.ALLOWED_IMAGE_TYPES,
      )
    ) {
      throw new ValidationError(
        "Invalid image type. Allowed: JPEG, PNG, GIF, WebP",
      );
    }

    // Validate file size
    if (
      !uploadService.validateFileSize(file.size, uploadService.MAX_IMAGE_SIZE)
    ) {
      throw new ValidationError(
        `File size exceeds maximum allowed size (${uploadService.MAX_IMAGE_SIZE / 1024 / 1024}MB)`,
      );
    }

    // Determine folder based on query param or default
    const folder = (req.query.folder as string) || "images";

    // Upload to S3
    const result = await uploadService.uploadToS3({
      file: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      folder,
    });

    logger.info(`Image uploaded: ${result.key}`);

    sendSuccess(
      res,
      {
        url: result.url,
        key: result.key,
        fileName: result.fileName,
        fileSize: result.fileSize,
      },
      201,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/upload/document
 * Upload document file
 */
export const uploadDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      throw new ValidationError("No file uploaded");
    }

    // Validate file type
    if (
      !uploadService.validateFileType(
        file.mimetype,
        uploadService.ALLOWED_DOCUMENT_TYPES,
      )
    ) {
      throw new ValidationError(
        "Invalid document type. Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT",
      );
    }

    // Validate file size
    if (
      !uploadService.validateFileSize(
        file.size,
        uploadService.MAX_DOCUMENT_SIZE,
      )
    ) {
      throw new ValidationError(
        `File size exceeds maximum allowed size (${uploadService.MAX_DOCUMENT_SIZE / 1024 / 1024}MB)`,
      );
    }

    // Determine folder based on query param or default
    const folder = (req.query.folder as string) || "documents";

    // Upload to S3
    const result = await uploadService.uploadToS3({
      file: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      folder,
    });

    logger.info(`Document uploaded: ${result.key}`);

    sendSuccess(
      res,
      {
        url: result.url,
        key: result.key,
        fileName: result.fileName,
        fileSize: result.fileSize,
      },
      201,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/upload/video
 * Upload video file
 */
export const uploadVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      throw new ValidationError("No file uploaded");
    }

    // Validate file type
    if (
      !uploadService.validateFileType(
        file.mimetype,
        uploadService.ALLOWED_VIDEO_TYPES,
      )
    ) {
      throw new ValidationError("Invalid video type. Allowed: MP4, MOV, AVI");
    }

    // Validate file size
    if (
      !uploadService.validateFileSize(file.size, uploadService.MAX_VIDEO_SIZE)
    ) {
      throw new ValidationError(
        `File size exceeds maximum allowed size (${uploadService.MAX_VIDEO_SIZE / 1024 / 1024}MB)`,
      );
    }

    // Determine folder
    const folder = (req.query.folder as string) || "videos";

    // Upload to S3
    const result = await uploadService.uploadToS3({
      file: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      folder,
    });

    logger.info(`Video uploaded: ${result.key}`);

    sendSuccess(
      res,
      {
        url: result.url,
        key: result.key,
        fileName: result.fileName,
        fileSize: result.fileSize,
      },
      201,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/upload/multiple
 * Upload multiple files
 */
export const uploadMultiple = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new ValidationError("No files uploaded");
    }

    const folder = (req.query.folder as string) || "uploads";
    const results = [];

    // Upload each file
    for (const file of files) {
      // Basic validation
      const maxSize = uploadService.MAX_IMAGE_SIZE; // Default to image size
      if (file.size > maxSize) {
        logger.warn(`File ${file.originalname} exceeds size limit, skipping`);
        continue;
      }

      const result = await uploadService.uploadToS3({
        file: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        folder,
      });

      results.push({
        url: result.url,
        key: result.key,
        fileName: result.fileName,
        fileSize: result.fileSize,
      });
    }

    logger.info(`Uploaded ${results.length} files`);

    sendSuccess(
      res,
      {
        files: results,
        count: results.length,
      },
      201,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/upload/:key
 * Delete file from S3
 */
export const deleteFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { key } = req.params;

    if (!key) {
      throw new ValidationError("File key is required");
    }

    // If key is a URL, extract the key
    const s3Key = uploadService.extractKeyFromUrl(key) || key;

    await uploadService.deleteFromS3(s3Key);

    logger.info(`File deleted: ${s3Key}`);

    sendSuccess(res, {
      message: "File deleted successfully",
      key: s3Key,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/upload/presigned/upload
 * Get presigned URL for client-side upload (PUT to S3)
 * Body: { fileName, contentType, folder? }
 */
export const getPresignedUploadUrl = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { fileName, contentType, folder } = req.body as {
      fileName?: string;
      contentType?: string;
      folder?: string;
    };

    if (!fileName || !contentType) {
      throw new ValidationError("fileName and contentType are required");
    }

    const isImage = uploadService.ALLOWED_IMAGE_TYPES.includes(contentType);
    const isDocument =
      uploadService.ALLOWED_DOCUMENT_TYPES.includes(contentType);
    const isVideo = uploadService.ALLOWED_VIDEO_TYPES.includes(contentType);

    if (!isImage && !isDocument && !isVideo) {
      throw new ValidationError(
        "Invalid contentType. Allowed: images (JPEG, PNG, GIF, WebP), documents (PDF, DOC, DOCX, XLS, XLSX, TXT), videos (MP4, MOV, AVI)",
      );
    }

    const resolvedFolder =
      folder || (isImage ? "images" : isDocument ? "documents" : "videos");

    const result = await uploadService.generatePresignedUploadUrl({
      fileName,
      contentType,
      folder: resolvedFolder,
      expiresIn: 900,
    });

    sendSuccess(
      res,
      {
        uploadUrl: result.uploadUrl,
        key: result.key,
        url: result.url,
        expiresIn: result.expiresIn,
      },
      201,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/upload/presigned/view
 * Get presigned URL for viewing a private S3 object
 * Query: key=... (S3 key) or url=... (full S3 URL - key will be extracted)
 */
export const getPresignedViewUrl = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const keyParam = (req.query.key as string) || "";
    const urlParam = (req.query.url as string) || "";

    let s3Key: string | null = keyParam ? keyParam : null;
    if (!s3Key && urlParam) {
      s3Key = uploadService.extractKeyFromUrl(urlParam);
    }

    if (!s3Key) {
      throw new ValidationError("Query parameter key or url is required");
    }

    const viewUrl = await uploadService.generatePresignedUrl(s3Key, 3600);

    sendSuccess(res, {
      viewUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    next(error);
  }
};
