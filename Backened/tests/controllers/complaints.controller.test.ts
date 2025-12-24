/**
 * Complaints Controller Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import * as complaintsController from '../../src/controllers/complaints.controller';
import * as complaintsService from '../../src/services/complaints.service';
import * as responseUtils from '../../src/utils/response';
import { NotFoundError, ValidationError } from '../../src/utils/errors';
import { createMockRequest, createMockResponse, createMockNext, createMockUser } from '../utils/testHelpers';
import { complaintFixtures } from '../utils/fixtures';
import { mockComplaint } from '../utils/mocks';

// Mock the service
jest.mock('../../src/services/complaints.service');
jest.mock('../../src/utils/response', () => ({
  sendSuccess: jest.fn(),
}));

describe('Complaints Controller', () => {
  let mockReq: any;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('getAllComplaints', () => {
    it('should return all complaints with filters', async () => {
      const mockComplaints = [mockComplaint];
      const mockResult = {
        complaints: mockComplaints,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      (complaintsService.getAllComplaints as jest.Mock).mockResolvedValue(mockResult);
      mockReq.query = { sub_category: 'potholes' };

      await complaintsController.getAllComplaints(mockReq, mockRes, mockNext);

      expect(complaintsService.getAllComplaints).toHaveBeenCalledWith(
        expect.objectContaining({ sub_category: 'potholes' })
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(mockRes, mockResult);
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (complaintsService.getAllComplaints as jest.Mock).mockRejectedValue(error);

      await complaintsController.getAllComplaints(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateComplaintResearch', () => {
    it('should update research data', async () => {
      const researchData = complaintFixtures.researchData;
      const updatedComplaint = { ...mockComplaint, research_data: researchData };

      (complaintsService.updateComplaintResearch as jest.Mock).mockResolvedValue(updatedComplaint);
      mockReq.params = { id: 'complaint-id' };
      mockReq.body = { research_data: researchData };
      mockReq.user = createMockUser({ role: 'admin' });

      await complaintsController.updateComplaintResearch(mockReq, mockRes, mockNext);

      expect(complaintsService.updateComplaintResearch).toHaveBeenCalledWith(
        'complaint-id',
        researchData
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if research_data is missing', async () => {
      mockReq.params = { id: 'complaint-id' };
      mockReq.body = {};
      mockReq.user = createMockUser({ role: 'admin' });

      await complaintsController.updateComplaintResearch(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle errors', async () => {
      const error = new NotFoundError('Complaint');
      (complaintsService.updateComplaintResearch as jest.Mock).mockRejectedValue(error);
      mockReq.params = { id: 'complaint-id' };
      mockReq.body = { research_data: {} };
      mockReq.user = createMockUser({ role: 'admin' });

      await complaintsController.updateComplaintResearch(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateComplaintStage1Data', () => {
    it('should update Stage 1 data', async () => {
      const stage1Data = complaintFixtures.stage1Data;
      const updatedComplaint = { ...mockComplaint, ...stage1Data };

      (complaintsService.updateComplaintStage1Data as jest.Mock).mockResolvedValue(updatedComplaint);
      mockReq.params = { id: 'complaint-id' };
      mockReq.body = stage1Data;
      mockReq.user = createMockUser({ role: 'admin' });

      await complaintsController.updateComplaintStage1Data(mockReq, mockRes, mockNext);

      expect(complaintsService.updateComplaintStage1Data).toHaveBeenCalledWith(
        'complaint-id',
        stage1Data
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no fields provided', async () => {
      mockReq.params = { id: 'complaint-id' };
      mockReq.body = {};
      mockReq.user = createMockUser({ role: 'admin' });

      await complaintsController.updateComplaintStage1Data(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle errors', async () => {
      const error = new NotFoundError('Complaint');
      (complaintsService.updateComplaintStage1Data as jest.Mock).mockRejectedValue(error);
      mockReq.params = { id: 'complaint-id' };
      mockReq.body = { primary_officer: {} };
      mockReq.user = createMockUser({ role: 'admin' });

      await complaintsController.updateComplaintStage1Data(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});

