import { Document } from '../models/Document';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Documents Service
 * Business logic for general document repository operations
 */

export interface CreateDocumentDto {
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  s3_key?: string;
  uploaded_by?: string;
  description?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface UpdateDocumentDto {
  description?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface DocumentFilters {
  is_public?: boolean;
  tags?: string[];
  file_type?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all documents with filters and pagination
 */
export const getAllDocuments = async (filters: DocumentFilters = {}) => {
  const {
    is_public,
    tags,
    file_type,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

  // Build query
  const query: any = {};

  if (is_public !== undefined) {
    query.is_public = is_public;
  }

  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  if (file_type) {
    query.file_type = file_type;
  }

  // Fetch documents
  const [documents, total] = await Promise.all([
    Document.find(query)
      .sort({ uploaded_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Document.countDocuments(query),
  ]);

  return {
    documents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get document by ID
 */
export const getDocumentById = async (documentId: string) => {
  const document = await Document.findOne({ id: documentId }).lean();

  if (!document) {
    throw new NotFoundError('Document');
  }

  return document;
};

/**
 * Create document
 */
export const createDocument = async (documentData: CreateDocumentDto) => {
  try {
    const document = new Document({
      ...documentData,
      is_public: documentData.is_public ?? false,
    });

    await document.save();
    logger.info(`Document created: ${document.id}`);

    return document.toObject();
  } catch (error) {
    logger.error('Error in createDocument service:', error);
    throw error;
  }
};

/**
 * Update document
 */
export const updateDocument = async (
  documentId: string,
  updateData: UpdateDocumentDto
) => {
  const document = await Document.findOne({ id: documentId });

  if (!document) {
    throw new NotFoundError('Document');
  }

  // Update only provided fields
  if (updateData.description !== undefined) {
    document.description = updateData.description;
  }
  if (updateData.tags !== undefined) {
    document.tags = updateData.tags;
  }
  if (updateData.is_public !== undefined) {
    document.is_public = updateData.is_public;
  }

  document.updated_at = new Date();
  await document.save();

  logger.info(`Document updated: ${documentId}`);
  return document.toObject();
};

/**
 * Delete document
 */
export const deleteDocument = async (documentId: string) => {
  const document = await Document.findOne({ id: documentId });

  if (!document) {
    throw new NotFoundError('Document');
  }

  await Document.deleteOne({ id: documentId });
  logger.info(`Document deleted: ${documentId}`);

  return { success: true };
};

