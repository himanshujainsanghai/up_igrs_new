import { Router } from 'express';
import * as feedbackController from '../controllers/feedback.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * Feedback Routes
 * /api/v1/feedback
 */

// Public route (no authentication required)
router.post('/', feedbackController.createFeedback); // Create feedback

// Protected routes (admin only)
router.get(
  '/',
  authenticate,
  authorize('admin'),
  feedbackController.getAllFeedback
); // Get all feedback

router.get(
  '/statistics',
  authenticate,
  authorize('admin'),
  feedbackController.getFeedbackStatistics
); // Get statistics

router.get(
  '/:id',
  authenticate,
  authorize('admin'),
  feedbackController.getFeedbackById
); // Get single feedback

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  feedbackController.updateFeedback
); // Update feedback

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  feedbackController.deleteFeedback
); // Delete feedback

export default router;

