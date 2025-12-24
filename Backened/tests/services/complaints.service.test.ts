/**
 * Complaints Service Unit Tests
 */

import * as complaintsService from '../../src/services/complaints.service';
import { Complaint } from '../../src/models/Complaint';
import { AIResolutionStep } from '../../src/models/AIResolutionStep';
import { AIStepExecutionInstruction } from '../../src/models/AIStepExecutionInstruction';
import { NotFoundError, ValidationError } from '../../src/utils/errors';
import { complaintFixtures } from '../utils/fixtures';
import { mockComplaint, mockAIResolutionStep } from '../utils/mocks';

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
jest.mock('../../src/models/Complaint');
jest.mock('../../src/models/AIResolutionStep');
jest.mock('../../src/models/AIStepExecutionInstruction');

describe('Complaints Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllComplaints', () => {
    it('should return all complaints with default pagination', async () => {
      const mockComplaints = [mockComplaint];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockComplaints),
      };
      (Complaint.find as jest.Mock).mockReturnValue(mockQuery);
      (Complaint.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await complaintsService.getAllComplaints();

      expect(result.complaints).toEqual(mockComplaints);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by sub_category', async () => {
      const mockComplaints = [{ ...mockComplaint, sub_category: 'potholes' }];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockComplaints),
      };
      (Complaint.find as jest.Mock).mockReturnValue(mockQuery);
      (Complaint.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await complaintsService.getAllComplaints({ sub_category: 'potholes' });

      expect(Complaint.find).toHaveBeenCalledWith(
        expect.objectContaining({ sub_category: 'potholes' })
      );
      expect(result.complaints).toEqual(mockComplaints);
    });

    it('should handle pagination', async () => {
      const mockComplaints = [mockComplaint];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockComplaints),
      };
      (Complaint.find as jest.Mock).mockReturnValue(mockQuery);
      (Complaint.countDocuments as jest.Mock).mockResolvedValue(50);

      const result = await complaintsService.getAllComplaints({ page: 2, limit: 10 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.totalPages).toBe(5);
    });
  });

  describe('getComplaintById', () => {
    it('should return complaint by ID', async () => {
      (Complaint.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockComplaint),
      } as any);

      const result = await complaintsService.getComplaintById('complaint-id');

      expect(Complaint.findOne).toHaveBeenCalledWith({ id: 'complaint-id' });
      expect(result).toEqual(mockComplaint);
    });

    it('should throw NotFoundError if complaint not found', async () => {
      (Complaint.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        complaintsService.getComplaintById('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('createComplaint', () => {
    it('should create complaint with sub_category', async () => {
      const complaintData = {
        ...complaintFixtures.validComplaint,
        sub_category: 'potholes',
      };
      const savedComplaint = { ...mockComplaint, ...complaintData };
      const mockSave = jest.fn().mockResolvedValue(savedComplaint);
      const mockToObject = jest.fn().mockReturnValue(savedComplaint);

      (Complaint as any).mockImplementation(() => ({
        ...savedComplaint,
        save: mockSave,
        toObject: mockToObject,
      }));

      const result = await complaintsService.createComplaint(complaintData);

      expect(result.sub_category).toBe('potholes');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should create complaint without sub_category', async () => {
      const complaintData = complaintFixtures.complaintWithoutSubCategory;
      const savedComplaint = { ...mockComplaint, ...complaintData };
      const mockSave = jest.fn().mockResolvedValue(savedComplaint);
      const mockToObject = jest.fn().mockReturnValue(savedComplaint);

      (Complaint as any).mockImplementation(() => ({
        ...savedComplaint,
        save: mockSave,
        toObject: mockToObject,
      }));

      const result = await complaintsService.createComplaint(complaintData);

      expect(result.sub_category).toBeUndefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('updateComplaintResearch', () => {
    it('should update research data', async () => {
      const researchData = complaintFixtures.researchData;
      const updatedComplaint = {
        ...mockComplaint,
        research_data: researchData,
      };

      (Complaint.findOne as jest.Mock).mockReturnValue({
        save: jest.fn().mockResolvedValue(updatedComplaint),
        toObject: jest.fn().mockReturnValue(updatedComplaint),
      });

      const result = await complaintsService.updateComplaintResearch(
        'complaint-id',
        researchData
      );

      expect(result.research_data).toEqual(researchData);
      expect(Complaint.findOne).toHaveBeenCalledWith({ id: 'complaint-id' });
    });

    it('should throw NotFoundError if complaint not found', async () => {
      (Complaint.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        complaintsService.updateComplaintResearch('non-existent-id', {})
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateComplaintStage1Data', () => {
    it('should update Stage 1 data', async () => {
      const stage1Data = complaintFixtures.stage1Data;
      const updatedComplaint = {
        ...mockComplaint,
        ...stage1Data,
      };

      (Complaint.findOne as jest.Mock).mockReturnValue({
        save: jest.fn().mockResolvedValue(updatedComplaint),
        toObject: jest.fn().mockReturnValue(updatedComplaint),
      });

      const result = await complaintsService.updateComplaintStage1Data(
        'complaint-id',
        stage1Data
      );

      expect(result.primary_officer).toEqual(stage1Data.primary_officer);
      expect(result.secondary_officer).toEqual(stage1Data.secondary_officer);
      expect(result.drafted_letter).toEqual(stage1Data.drafted_letter);
    });

    it('should update only provided fields', async () => {
      const partialData = {
        primary_officer: complaintFixtures.stage1Data.primary_officer,
      };
      const updatedComplaint = {
        ...mockComplaint,
        primary_officer: partialData.primary_officer,
      };

      (Complaint.findOne as jest.Mock).mockReturnValue({
        save: jest.fn().mockResolvedValue(updatedComplaint),
        toObject: jest.fn().mockReturnValue(updatedComplaint),
      });

      const result = await complaintsService.updateComplaintStage1Data(
        'complaint-id',
        partialData
      );

      expect(result.primary_officer).toEqual(partialData.primary_officer);
      expect(result.secondary_officer).toBeUndefined();
    });

    it('should throw NotFoundError if complaint not found', async () => {
      (Complaint.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        complaintsService.updateComplaintStage1Data('non-existent-id', {})
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAIAnalysisProgress', () => {
    it('should return progress with all steps completed', async () => {
      (Complaint.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          ...mockComplaint,
          ai_analysis_completed: true,
        }),
      });
      (AIResolutionStep.countDocuments as jest.Mock)
        .mockResolvedValueOnce(5) // total steps
        .mockResolvedValueOnce(5); // completed steps
      (AIStepExecutionInstruction.countDocuments as jest.Mock).mockResolvedValue(5);

      const result = await complaintsService.getAIAnalysisProgress('complaint-id');

      expect(result.analysis_completed).toBe(true);
      expect(result.total_steps).toBe(5);
      expect(result.completed_steps).toBe(5);
      expect(result.completion_percentage).toBe(100);
      expect(result.instructions_generated).toBe(5);
    });

    it('should return progress with partial completion', async () => {
      (Complaint.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          ...mockComplaint,
          ai_analysis_completed: true,
        }),
      });
      (AIResolutionStep.countDocuments as jest.Mock)
        .mockResolvedValueOnce(5) // total steps
        .mockResolvedValueOnce(2); // completed steps
      (AIStepExecutionInstruction.countDocuments as jest.Mock).mockResolvedValue(3);

      const result = await complaintsService.getAIAnalysisProgress('complaint-id');

      expect(result.completion_percentage).toBe(40);
      expect(result.instructions_generated).toBe(3);
    });

    it('should return zero progress for no analysis', async () => {
      (Complaint.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          ...mockComplaint,
          ai_analysis_completed: false,
        }),
      });
      (AIResolutionStep.countDocuments as jest.Mock).mockResolvedValue(0);
      (AIStepExecutionInstruction.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await complaintsService.getAIAnalysisProgress('complaint-id');

      expect(result.analysis_completed).toBe(false);
      expect(result.total_steps).toBe(0);
      expect(result.completion_percentage).toBe(0);
    });

    it('should throw NotFoundError if complaint not found', async () => {
      (Complaint.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        complaintsService.getAIAnalysisProgress('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });
});

