/**
 * Upload Middleware
 * Multer configuration for file uploads
 */

import multer from 'multer';
import { Request } from 'express';
import logger from '../config/logger';

/**
 * Memory storage for Multer (files stored in memory as Buffer)
 */
const storage = multer.memoryStorage();

/**
 * File filter function
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allow all file types for now, validate in service layer
  cb(null, true);
};

/**
 * Configure Multer
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 10, // Max 10 files at once
  },
});

/**
 * Single file upload middleware
 */
export const uploadSingle = upload.single('file');

/**
 * Multiple files upload middleware
 */
export const uploadMultiple = upload.array('files', 10);

/**
 * Fields upload middleware (for different file types)
 */
export const uploadFields = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'documents', maxCount: 5 },
]);

/**
 * Error handling middleware for multer errors
 */
export const handleUploadError = (
  err: any,
  req: Request,
  res: any,
  next: any
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum allowed size (100MB)',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
      });
    }
  }

  next(err);
};

export default upload;

