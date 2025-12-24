/**
 * Documents Controller Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import * as documentsController from '../../src/controllers/documents.controller';
import * as documentsService from '../../src/services/documents.service';
import { NotFoundError, ValidationError } from '../../src/utils/errors';
import { createMockRequest, createMockResponse, createMockNext, createMockUser } from '../utils/testHelpers';
import { documentFixtures } from '../utils/fixtures';
import { mockDocument } from '../utils/mocks';

// Mock the service
jest.mock('../../src/services/documents.service');
jest.mock('../../src/utils/response', () => ({
  sendSuccess: jest.fn((res, data, statusCode = 200) => {
    res.status(statusCode).json({ success: true, data });
  }),
}));

describe('Documents Controller', () => {
  let mockReq: any;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('getAllDocuments', () => {
    it('should return all documents with filters', async () => {
      const mockDocuments = [mockDocument];
      const mockResult = {
        documents: mockDocuments,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (documentsService.getAllDocuments as jest.Mock).mockResolvedValue(mockResult);
      mockReq.query = { is_public: 'true', tags: 'policy,public' };

      await documentsController.getAllDocuments(mockReq, mockRes, mockNext);

      expect(documentsService.getAllDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: true,
          tags: ['policy', 'public'],
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (documentsService.getAllDocuments as jest.Mock).mockRejectedValue(error);

      await documentsController.getAllDocuments(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getDocumentById', () => {
    it('should return document by ID', async () => {
      (documentsService.getDocumentById as jest.Mock).mockResolvedValue(mockDocument);
      mockReq.params = { id: 'document-id' };
      mockReq.user = createMockUser();

      await documentsController.getDocumentById(mockReq, mockRes, mockNext);

      expect(documentsService.getDocumentById).toHaveBeenCalledWith('document-id');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      const error = new NotFoundError('Document');
      (documentsService.getDocumentById as jest.Mock).mockRejectedValue(error);
      mockReq.params = { id: 'document-id' };
      mockReq.user = createMockUser();

      await documentsController.getDocumentById(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createDocument', () => {
    it('should create document', async () => {
      const documentData = documentFixtures.validDocument;
      const createdDocument = { ...mockDocument, ...documentData };

      (documentsService.createDocument as jest.Mock).mockResolvedValue(createdDocument);
      mockReq.body = documentData;
      mockReq.user = createMockUser({ role: 'admin', name: 'Admin User' });

      await documentsController.createDocument(mockReq, mockRes, mockNext);

      expect(documentsService.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          ...documentData,
          uploaded_by: 'Admin User',
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if required fields are missing', async () => {
      mockReq.body = { file_name: 'test.pdf' };
      mockReq.user = createMockUser({ role: 'admin' });

      await documentsController.createDocument(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (documentsService.createDocument as jest.Mock).mockRejectedValue(error);
      mockReq.body = documentFixtures.validDocument;
      mockReq.user = createMockUser({ role: 'admin' });

      await documentsController.createDocument(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateDocument', () => {
    it('should update document', async () => {
      const updateData = { description: 'Updated description' };
      const updatedDocument = { ...mockDocument, ...updateData };

      (documentsService.updateDocument as jest.Mock).mockResolvedValue(updatedDocument);
      mockReq.params = { id: 'document-id' };
      mockReq.body = updateData;
      mockReq.user = createMockUser({ role: 'admin' });

      await documentsController.updateDocument(mockReq, mockRes, mockNext);

      expect(documentsService.updateDocument).toHaveBeenCalledWith('document-id', updateData);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no fields provided', async () => {
      mockReq.params = { id: 'document-id' };
      mockReq.body = {};
      mockReq.user = createMockUser({ role: 'admin' });

      await documentsController.updateDocument(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle errors', async () => {
      const error = new NotFoundError('Document');
      (documentsService.updateDocument as jest.Mock).mockRejectedValue(error);
      mockReq.params = { id: 'document-id' };
      mockReq.body = { description: 'Updated' };
      mockReq.user = createMockUser({ role: 'admin' });

      await documentsController.updateDocument(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document', async () => {
      (documentsService.deleteDocument as jest.Mock).mockResolvedValue({ success: true });
      mockReq.params = { id: 'document-id' };
      mockReq.user = createMockUser({ role: 'admin' });

      await documentsController.deleteDocument(mockReq, mockRes, mockNext);

      expect(documentsService.deleteDocument).toHaveBeenCalledWith('document-id');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      const error = new NotFoundError('Document');
      (documentsService.deleteDocument as jest.Mock).mockRejectedValue(error);
      mockReq.params = { id: 'document-id' };
      mockReq.user = createMockUser({ role: 'admin' });

      await documentsController.deleteDocument(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});

