/**
 * Documents Service Unit Tests
 */

import * as documentsService from '../../src/services/documents.service';
import { Document } from '../../src/models/Document';
import { NotFoundError, ValidationError } from '../../src/utils/errors';
import { documentFixtures } from '../utils/fixtures';
import { mockDocument } from '../utils/mocks';

// Mock logger first
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../src/config/logger', () => ({
  __esModule: true,
  default: mockLogger,
}));

// Mock models
jest.mock('../../src/models/Document');

describe('Documents Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllDocuments', () => {
    it('should return all documents with default pagination', async () => {
      const mockDocuments = [mockDocument];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocuments),
      };
      (Document.find as jest.Mock).mockReturnValue(mockQuery);
      (Document.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await documentsService.getAllDocuments();

      expect(result.documents).toEqual(mockDocuments);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by is_public', async () => {
      const mockDocuments = [{ ...mockDocument, is_public: true }];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocuments),
      };
      (Document.find as jest.Mock).mockReturnValue(mockQuery);
      (Document.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await documentsService.getAllDocuments({ is_public: true });

      expect(Document.find).toHaveBeenCalledWith(
        expect.objectContaining({ is_public: true })
      );
      expect(result.documents).toEqual(mockDocuments);
    });

    it('should filter by tags', async () => {
      const mockDocuments = [mockDocument];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocuments),
      };
      (Document.find as jest.Mock).mockReturnValue(mockQuery);
      (Document.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await documentsService.getAllDocuments({ tags: ['policy', 'public'] });

      expect(Document.find).toHaveBeenCalledWith(
        expect.objectContaining({ tags: { $in: ['policy', 'public'] } })
      );
      expect(result.documents).toEqual(mockDocuments);
    });

    it('should filter by file_type', async () => {
      const mockDocuments = [{ ...mockDocument, file_type: 'application/pdf' }];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocuments),
      };
      (Document.find as jest.Mock).mockReturnValue(mockQuery);
      (Document.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await documentsService.getAllDocuments({ file_type: 'application/pdf' });

      expect(Document.find).toHaveBeenCalledWith(
        expect.objectContaining({ file_type: 'application/pdf' })
      );
      expect(result.documents).toEqual(mockDocuments);
    });

    it('should handle pagination', async () => {
      const mockDocuments = [mockDocument];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDocuments),
      };
      (Document.find as jest.Mock).mockReturnValue(mockQuery);
      (Document.countDocuments as jest.Mock).mockResolvedValue(50);

      const result = await documentsService.getAllDocuments({ page: 2, limit: 10 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.totalPages).toBe(5);
    });
  });

  describe('getDocumentById', () => {
    it('should return document by ID', async () => {
      (Document.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDocument),
      });

      const result = await documentsService.getDocumentById('document-id');

      expect(Document.findOne).toHaveBeenCalledWith({ id: 'document-id' });
      expect(result).toEqual(mockDocument);
    });

    it('should throw NotFoundError if document not found', async () => {
      (Document.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        documentsService.getDocumentById('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('createDocument', () => {
    it('should create document with all fields', async () => {
      const documentData = documentFixtures.validDocument;
      const savedDocument = { ...mockDocument, ...documentData };
      const mockSave = jest.fn().mockResolvedValue(savedDocument);
      const mockToObject = jest.fn().mockReturnValue(savedDocument);

      (Document as any).mockImplementation(() => ({
        ...savedDocument,
        save: mockSave,
        toObject: mockToObject,
      }));

      const result = await documentsService.createDocument(documentData);

      expect(result.file_name).toBe(documentData.file_name);
      expect(result.is_public).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should create document with default is_public false', async () => {
      const documentData = {
        ...documentFixtures.validDocument,
        is_public: undefined,
      };
      const savedDocument = { ...mockDocument, ...documentData, is_public: false };
      const mockSave = jest.fn().mockResolvedValue(savedDocument);
      const mockToObject = jest.fn().mockReturnValue(savedDocument);

      (Document as any).mockImplementation(() => ({
        ...savedDocument,
        save: mockSave,
        toObject: mockToObject,
      }));

      const result = await documentsService.createDocument(documentData);

      expect(result.is_public).toBe(false);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('updateDocument', () => {
    it('should update document description', async () => {
      const updateData = { description: 'Updated description' };
      const updatedDocument = {
        ...mockDocument,
        description: 'Updated description',
      };

      (Document.findOne as jest.Mock).mockReturnValue({
        save: jest.fn().mockResolvedValue(updatedDocument),
        toObject: jest.fn().mockReturnValue(updatedDocument),
      });

      const result = await documentsService.updateDocument('document-id', updateData);

      expect(result.description).toBe('Updated description');
    });

    it('should update document tags', async () => {
      const updateData = { tags: ['updated', 'tags'] };
      const updatedDocument = {
        ...mockDocument,
        tags: ['updated', 'tags'],
      };

      (Document.findOne as jest.Mock).mockReturnValue({
        save: jest.fn().mockResolvedValue(updatedDocument),
        toObject: jest.fn().mockReturnValue(updatedDocument),
      });

      const result = await documentsService.updateDocument('document-id', updateData);

      expect(result.tags).toEqual(['updated', 'tags']);
    });

    it('should update document is_public', async () => {
      const updateData = { is_public: false };
      const updatedDocument = {
        ...mockDocument,
        is_public: false,
      };

      (Document.findOne as jest.Mock).mockReturnValue({
        save: jest.fn().mockResolvedValue(updatedDocument),
        toObject: jest.fn().mockReturnValue(updatedDocument),
      });

      const result = await documentsService.updateDocument('document-id', updateData);

      expect(result.is_public).toBe(false);
    });

    it('should update multiple fields', async () => {
      const updateData = {
        description: 'Updated description',
        tags: ['updated'],
        is_public: false,
      };
      const updatedDocument = {
        ...mockDocument,
        ...updateData,
      };

      (Document.findOne as jest.Mock).mockReturnValue({
        save: jest.fn().mockResolvedValue(updatedDocument),
        toObject: jest.fn().mockReturnValue(updatedDocument),
      });

      const result = await documentsService.updateDocument('document-id', updateData);

      expect(result.description).toBe('Updated description');
      expect(result.tags).toEqual(['updated']);
      expect(result.is_public).toBe(false);
    });

    it('should throw NotFoundError if document not found', async () => {
      (Document.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        documentsService.updateDocument('non-existent-id', {})
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document', async () => {
      (Document.findOne as jest.Mock).mockResolvedValue(mockDocument);
      (Document.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      const result = await documentsService.deleteDocument('document-id');

      expect(Document.deleteOne).toHaveBeenCalledWith({ id: 'document-id' });
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundError if document not found', async () => {
      (Document.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        documentsService.deleteDocument('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });
});

