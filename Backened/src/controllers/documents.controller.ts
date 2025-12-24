import { Request, Response, NextFunction } from 'express';
import * as documentsService from '../services/documents.service';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../utils/errors';

/**
 * Documents Controller
 * Handles HTTP requests for document repository operations
 */

/**
 * GET /api/v1/documents
 * Get all documents with filters and pagination
 */
export const getAllDocuments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      is_public: req.query.is_public === 'true' ? true : req.query.is_public === 'false' ? false : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      file_type: req.query.file_type as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const result = await documentsService.getAllDocuments(filters);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/documents/:id
 * Get document by ID
 */
export const getDocumentById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const document = await documentsService.getDocumentById(id);
    sendSuccess(res, document);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/documents
 * Create document
 */
export const createDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      file_name,
      file_type,
      file_size,
      file_url,
      s3_key,
      uploaded_by,
      description,
      tags,
      is_public,
    } = req.body;

    if (!file_name || !file_type || !file_size || !file_url) {
      throw new ValidationError('File name, type, size, and URL are required');
    }

    const documentData = {
      file_name,
      file_type,
      file_size,
      file_url,
      s3_key,
      uploaded_by: uploaded_by || req.user?.name || 'Unknown',
      description,
      tags,
      is_public,
    };

    const document = await documentsService.createDocument(documentData);
    sendSuccess(res, document, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/documents/:id
 * Update document
 */
export const updateDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('At least one field is required for update');
    }

    const document = await documentsService.updateDocument(id, updateData);
    sendSuccess(res, document);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/documents/:id
 * Delete document
 */
export const deleteDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await documentsService.deleteDocument(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

