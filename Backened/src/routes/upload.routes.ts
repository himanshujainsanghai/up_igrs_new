import { Router } from "express";
import * as uploadController from "../controllers/upload.controller";
import {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
} from "../middleware/upload.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

/**
 * Upload Routes
 * /api/v1/upload
 */

// Presigned URL routes (no file in request for upload URL; view URL is GET)
router.post("/presigned/upload", uploadController.getPresignedUploadUrl); // Get presigned upload URL (public - for complaint filing)

// Public upload routes (for complaint filing without authentication) - legacy, still supported
router.post(
  "/image",
  uploadSingle,
  handleUploadError,
  uploadController.uploadImage,
); // Upload single image (public)

router.post(
  "/document",
  uploadSingle,
  handleUploadError,
  uploadController.uploadDocument,
); // Upload single document (public)

// Protected routes (authentication required)
router.use(authenticate);

// Presigned view URL (requires auth - for viewing private S3 objects)
router.get("/presigned/view", uploadController.getPresignedViewUrl); // GET /upload/presigned/view?key=... or ?url=...

router.post(
  "/video",
  uploadSingle,
  handleUploadError,
  uploadController.uploadVideo,
); // Upload single video

// Multiple files upload
router.post(
  "/multiple",
  uploadMultiple,
  handleUploadError,
  uploadController.uploadMultiple,
); // Upload multiple files

// Delete file (admin only)
router.delete("/:key", authorize("admin"), uploadController.deleteFile); // Delete file from S3

export default router;
