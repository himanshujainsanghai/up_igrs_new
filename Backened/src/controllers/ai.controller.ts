import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Complaint } from '../models/Complaint';
import { AIResolutionStep } from '../models/AIResolutionStep';
import * as aiService from '../services/ai.service';
import * as complaintsService from '../services/complaints.service';
import { sendSuccess, sendError } from '../utils/response';
import { NotFoundError } from '../utils/errors';
import logger from '../config/logger';

/**
 * AI Controller
 * Handles AI-powered features for complaints
 */

/**
 * POST /api/v1/ai/complaints/:id/analyze
 * Trigger AI analysis for a complaint
 */
export const triggerAIAnalysis = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Fetch complaint
    const complaint = await Complaint.findOne({ id }).lean();
    if (!complaint) {
      throw new NotFoundError('Complaint');
    }

    if (complaint.ai_analysis_completed) {
      sendSuccess(res, {
        message: 'AI analysis already completed',
        analysis: complaint.ai_analysis,
      });
      return;
    }

    // Generate AI analysis
    logger.info(`Generating AI analysis for complaint: ${id}`);
    const analysis = await aiService.generateAIAnalysis(
      complaint.title,
      complaint.description,
      complaint.category,
      complaint.location || '',
      complaint.priority
    );

    // Save analysis to complaint
    await Complaint.updateOne(
      { id },
      {
        ai_analysis_completed: true,
        ai_severity_score: analysis.severity_score,
        ai_estimated_cost: analysis.estimated_cost,
        ai_estimated_timeline_days: analysis.estimated_timeline_days,
        ai_risks: analysis.risks,
        ai_alternatives: analysis.alternatives,
        ai_success_metrics: analysis.success_metrics,
        ai_resource_requirements: analysis.resource_requirements,
        ai_analysis: analysis.analysis,
        updated_at: new Date(),
      }
    );

    // Save resolution steps
    if (analysis.resolution_steps && analysis.resolution_steps.length > 0) {
      const steps = analysis.resolution_steps.map((step) => ({
        id: require('uuid').v4(),
        complaint_id: id,
        step_number: step.step_number,
        title: step.title,
        description: step.description,
        estimated_cost: step.estimated_cost,
        estimated_days: step.estimated_days,
        department: step.department,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await AIResolutionStep.insertMany(steps);
      logger.info(`Saved ${steps.length} resolution steps`);
    }

    sendSuccess(res, {
      message: 'AI analysis completed successfully',
      analysis,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/ai/documents/process
 * Process document image for text extraction
 */
export const processDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { imageDataUrl } = req.body;

    if (!imageDataUrl) {
      sendError(res, 'imageDataUrl is required', 400, 'VALIDATION_ERROR');
      return;
    }

    logger.info('Processing document image with AI');
    const result = await aiService.processDocumentImage(imageDataUrl);

    // Transform formSuggestions array into a flat data object for easier frontend mapping
    const data: Record<string, any> = {};
    if (result.formSuggestions && Array.isArray(result.formSuggestions)) {
      result.formSuggestions.forEach((suggestion) => {
        if (suggestion.field && suggestion.value) {
          data[suggestion.field] = suggestion.value;
        }
      });
    }

    // Return both formats for compatibility
    const response = {
      extractedText: result.extractedText,
      formSuggestions: result.formSuggestions,
      data, // Flattened data object for easy form mapping
      text: result.extractedText, // Alias for backward compatibility
    };

    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/ai/documents/process-batch
 * Process multiple document images in batch for text extraction
 */
export const processDocumentsBatch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { imageDataUrls } = req.body;

    if (!imageDataUrls || !Array.isArray(imageDataUrls) || imageDataUrls.length === 0) {
      sendError(res, 'imageDataUrls array is required and must not be empty', 400, 'VALIDATION_ERROR');
      return;
    }

    logger.info(`Processing ${imageDataUrls.length} document images in batch with AI`);
    const result = await aiService.processDocumentsBatch(imageDataUrls);

    // Transform formSuggestions array into a flat data object for easier frontend mapping
    const data: Record<string, any> = {};
    if (result.formSuggestions && Array.isArray(result.formSuggestions)) {
      result.formSuggestions.forEach((suggestion) => {
        if (suggestion.field && suggestion.value) {
          data[suggestion.field] = suggestion.value;
        }
      });
    }

    // Return both formats for compatibility
    const response = {
      extractedText: result.extractedText,
      formSuggestions: result.formSuggestions,
      data, // Flattened data object for easy form mapping
      text: result.extractedText, // Alias for backward compatibility
    };

    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/ai/complaints/:id/research
 * Research related issues for a complaint
 */
export const researchRelatedIssues = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { depth } = req.body;

    const complaint = await Complaint.findOne({ id }).lean();
    if (!complaint) {
      throw new NotFoundError('Complaint');
    }

    logger.info(`Researching related issues for complaint: ${id}`);
    const research = await aiService.researchRelatedIssues(
      complaint.title,
      complaint.category,
      complaint.location || '',
      depth || 'detailed'
    );

    // Save research data to complaint
    await Complaint.updateOne(
      { id },
      {
        research_data: research,
        updated_at: new Date(),
      }
    );

    sendSuccess(res, { research });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/ai/complaints/:id/find-officers
 * Find complaint officers for a complaint
 */
export const findComplaintOfficers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findOne({ id }).lean();
    if (!complaint) {
      throw new NotFoundError('Complaint');
    }

    logger.info(`Finding officers for complaint: ${id}`);
    const officers = await aiService.findComplaintOfficers(
      complaint.title,
      complaint.description,
      complaint.location || ''
    );

    // Save officers to complaint
    await Complaint.updateOne(
      { id },
      {
        primary_officer: officers.primary_officer,
        secondary_officer: officers.secondary_officer,
        updated_at: new Date(),
      }
    );

    sendSuccess(res, { officers });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/ai/complaints/:id/draft-letter
 * Draft complaint letter
 */
export const draftComplaintLetter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findOne({ id }).lean();
    if (!complaint) {
      throw new NotFoundError('Complaint');
    }

    logger.info(`Drafting letter for complaint: ${id}`);

    // Use selected executive from request body if provided, otherwise use saved primary_officer
    const selectedOfficer =
      req.body.selected_executive || complaint.primary_officer;

    const letterResponse = await aiService.draftComplaintLetter(
      complaint.title,
      complaint.description,
      complaint.location || '',
      complaint.category,
      complaint.contact_name,
      selectedOfficer as any,
      complaint.research_data
    );

    // Save letter to complaint
    await Complaint.updateOne(
      { id },
      {
        drafted_letter: letterResponse.letter,
        updated_at: new Date(),
      }
    );

    sendSuccess(res, letterResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/ai/complaints/:id/generate-actions
 * Generate complaint actions
 */
export const generateComplaintActions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findOne({ id }).lean();
    if (!complaint) {
      throw new NotFoundError('Complaint');
    }

    logger.info(`Generating actions for complaint: ${id}`);
    const actions = await aiService.generateComplaintActions(
      complaint.title,
      complaint.description,
      complaint.category,
      complaint.location || ''
    );

    sendSuccess(res, actions);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/ai/complaints/:id/progress
 * Get AI analysis progress (admin only)
 */
export const getAIAnalysisProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const progress = await complaintsService.getAIAnalysisProgress(id);
    sendSuccess(res, progress);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/ai/steps/:stepId/instructions
 * Generate step instructions (admin only)
 */
export const generateStepInstructions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { stepId } = req.params;
    logger.info(`Generating instructions for step: ${stepId}`);
    const instructions = await aiService.generateStepInstructions(stepId);
    sendSuccess(res, instructions);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/ai/steps/:stepId/instructions
 * Fetch step instructions (admin only)
 */
export const fetchStepInstructions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { stepId } = req.params;
    const instructions = await aiService.fetchStepInstructions(stepId);

    if (!instructions) {
      throw new NotFoundError('Step Instructions');
    }

    sendSuccess(res, instructions);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/ai/complaints/:id/regenerate
 * Regenerate AI analysis for a complaint (admin only)
 * Clears existing AI data and triggers new analysis
 */
export const regenerateAIAnalysis = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Verify complaint exists
    const complaint = await Complaint.findOne({ id }).lean();
    if (!complaint) {
      throw new NotFoundError('Complaint');
    }

    // Clear existing AI data
    logger.info(`Regenerating AI analysis for complaint: ${id}`);
    await complaintsService.regenerateAIAnalysis(id);

    // Generate new AI analysis
    logger.info(`Generating new AI analysis for complaint: ${id}`);
    const analysis = await aiService.generateAIAnalysis(
      complaint.title,
      complaint.description,
      complaint.category,
      complaint.location || '',
      complaint.priority
    );

    // Save analysis to complaint
    await Complaint.updateOne(
      { id },
      {
        ai_analysis_completed: true,
        ai_severity_score: analysis.severity_score,
        ai_estimated_cost: analysis.estimated_cost,
        ai_estimated_timeline_days: analysis.estimated_timeline_days,
        ai_risks: analysis.risks,
        ai_alternatives: analysis.alternatives,
        ai_success_metrics: analysis.success_metrics,
        ai_resource_requirements: analysis.resource_requirements,
        ai_analysis: analysis.analysis,
        updated_at: new Date(),
      }
    );

    // Save resolution steps
    if (analysis.resolution_steps && analysis.resolution_steps.length > 0) {
      const steps = analysis.resolution_steps.map((step) => ({
        id: require('uuid').v4(),
        complaint_id: id,
        step_number: step.step_number,
        title: step.title,
        description: step.description,
        estimated_cost: step.estimated_cost,
        estimated_days: step.estimated_days,
        department: step.department,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await AIResolutionStep.insertMany(steps);
      logger.info(`Saved ${steps.length} resolution steps`);
    }

    sendSuccess(res, {
      message: 'AI analysis regenerated successfully',
      analysis,
    });
  } catch (error) {
    next(error);
  }
};

