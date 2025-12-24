import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as feedbackService from '../services/feedback.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { ValidationError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Feedback Controller
 * Handles HTTP requests for feedback operations
 */

/**
 * POST /api/v1/feedback
 * Create new feedback (public endpoint)
 */
export const createFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const feedbackData = req.body;

    if (!feedbackData.type || !feedbackData.content) {
      throw new ValidationError('Type and content are required');
    }

    const feedback = await feedbackService.createFeedback(feedbackData);
    sendSuccess(res, feedback, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/feedback
 * Get all feedback (admin only)
 */
export const getAllFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      type: req.query.type as string,
      status: req.query.status as string,
      is_anonymous: req.query.is_anonymous === 'true' ? true : req.query.is_anonymous === 'false' ? false : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await feedbackService.getAllFeedback(filters);

    sendPaginated(
      res,
      result.feedback,
      filters.page,
      filters.limit,
      result.pagination.total
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/feedback/:id
 * Get single feedback (admin only)
 */
export const getFeedbackById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const feedback = await feedbackService.getFeedbackById(id);
    sendSuccess(res, feedback);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/feedback/:id
 * Update feedback (admin only)
 */
export const updateFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      reviewed_by: req.user?.email,
    };
    const feedback = await feedbackService.updateFeedback(id, updateData);
    sendSuccess(res, feedback);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/feedback/:id
 * Delete feedback (admin only)
 */
export const deleteFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await feedbackService.deleteFeedback(id);
    sendSuccess(res, { message: 'Feedback deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/feedback/statistics
 * Get feedback statistics (admin only)
 */
export const getFeedbackStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const statistics = await feedbackService.getFeedbackStatistics();
    sendSuccess(res, statistics);
  } catch (error) {
    next(error);
  }
};

