/**
 * AI Service Unit Tests
 * Focus on step instructions functions
 */

import * as aiService from '../../src/services/ai.service';
import { AIStepExecutionInstruction } from '../../src/models/AIStepExecutionInstruction';
import { AIResolutionStep } from '../../src/models/AIResolutionStep';
import { Complaint } from '../../src/models/Complaint';
import { NotFoundError } from '../../src/utils/errors';
import { mockAIStepExecutionInstruction, mockAIResolutionStep, mockComplaint } from '../utils/mocks';
import { aiFixtures } from '../utils/fixtures';

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
jest.mock('../../src/models/AIStepExecutionInstruction');
jest.mock('../../src/models/AIResolutionStep');
jest.mock('../../src/models/Complaint');

// Mock OpenRouter API
jest.mock('../../src/services/ai.service', () => {
  const actual = jest.requireActual('../../src/services/ai.service');
  return {
    ...actual,
    callLLM: jest.fn().mockResolvedValue('Mocked instructions'),
  };
});

describe('AI Service - Step Instructions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateStepInstructions', () => {
    it('should return existing instructions if they exist', async () => {
      (AIStepExecutionInstruction.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAIStepExecutionInstruction),
      });

      const result = await aiService.generateStepInstructions('step-id');

      expect(result).toEqual({
        step_id: mockAIStepExecutionInstruction.step_id,
        complaint_id: mockAIStepExecutionInstruction.complaint_id,
        instructions: mockAIStepExecutionInstruction.instructions,
        created_at: mockAIStepExecutionInstruction.created_at,
        updated_at: mockAIStepExecutionInstruction.updated_at,
      });
      expect(AIStepExecutionInstruction.findOne).toHaveBeenCalledWith({
        step_id: 'step-id',
      });
    });

    it('should generate new instructions if they do not exist', async () => {
      (AIStepExecutionInstruction.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      (AIResolutionStep.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAIResolutionStep),
      });
      (Complaint.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockComplaint),
      });

      // Mock callLLM to return instructions
      (aiService.callLLM as jest.Mock).mockResolvedValue(aiFixtures.stepInstructions.instructions);

      const savedInstruction = {
        ...mockAIStepExecutionInstruction,
        save: jest.fn().mockResolvedValue(mockAIStepExecutionInstruction),
      };

      (AIStepExecutionInstruction.prototype.save as jest.Mock) = jest
        .fn()
        .mockResolvedValue(savedInstruction);
      (AIStepExecutionInstruction as any).mockImplementation(() => savedInstruction);

      const result = await aiService.generateStepInstructions('step-id');

      expect(aiService.callLLM).toHaveBeenCalled();
      expect(result.instructions).toBe(aiFixtures.stepInstructions.instructions.trim());
    });

    it('should throw NotFoundError if step not found', async () => {
      (AIStepExecutionInstruction.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      (AIResolutionStep.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(aiService.generateStepInstructions('non-existent-step-id')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError if complaint not found', async () => {
      (AIStepExecutionInstruction.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      (AIResolutionStep.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAIResolutionStep),
      });
      (Complaint.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(aiService.generateStepInstructions('step-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('fetchStepInstructions', () => {
    it('should return instructions if they exist', async () => {
      (AIStepExecutionInstruction.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAIStepExecutionInstruction),
      });

      const result = await aiService.fetchStepInstructions('step-id');

      expect(result).toEqual({
        step_id: mockAIStepExecutionInstruction.step_id,
        complaint_id: mockAIStepExecutionInstruction.complaint_id,
        instructions: mockAIStepExecutionInstruction.instructions,
        created_at: mockAIStepExecutionInstruction.created_at,
        updated_at: mockAIStepExecutionInstruction.updated_at,
      });
      expect(AIStepExecutionInstruction.findOne).toHaveBeenCalledWith({ step_id: 'step-id' });
    });

    it('should return null if instructions do not exist', async () => {
      (AIStepExecutionInstruction.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await aiService.fetchStepInstructions('non-existent-step-id');

      expect(result).toBeNull();
    });
  });
});

