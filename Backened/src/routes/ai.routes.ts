import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * AI Routes
 * /api/v1/ai
 */

// Protected routes (admin only)
// GET routes must be before POST routes to avoid conflicts
router.get(
  '/complaints/:id/progress',
  authenticate,
  authorize('admin'),
  aiController.getAIAnalysisProgress
); // Get AI analysis progress (admin only)

router.post(
  '/complaints/:id/analyze',
  authenticate,
  authorize('admin'),
  aiController.triggerAIAnalysis
); // Trigger AI analysis (admin only)

router.post(
  '/complaints/:id/regenerate',
  authenticate,
  authorize('admin'),
  aiController.regenerateAIAnalysis
); // Regenerate AI analysis (admin only)

router.post(
  '/documents/process',
  authenticate,
  aiController.processDocument
); // Process document (authenticated)

router.post(
  '/documents/process-batch',
  authenticate,
  aiController.processDocumentsBatch
); // Process multiple documents in batch (authenticated)

// Advanced AI endpoints (admin only)
router.post(
  '/complaints/:id/research',
  authenticate,
  authorize('admin'),
  aiController.researchRelatedIssues
); // Research related issues

router.post(
  '/complaints/:id/find-officers',
  authenticate,
  authorize('admin'),
  aiController.findComplaintOfficers
); // Find complaint officers

router.post(
  '/complaints/:id/draft-letter',
  authenticate,
  authorize('admin'),
  aiController.draftComplaintLetter
); // Draft complaint letter

router.post(
  '/complaints/:id/generate-actions',
  authenticate,
  authorize('admin'),
  aiController.generateComplaintActions
); // Generate actions

// Step instructions routes (must be before /complaints/:id routes to avoid conflicts)
router.post(
  '/steps/:stepId/instructions',
  authenticate,
  authorize('admin'),
  aiController.generateStepInstructions
); // Generate step instructions (admin only)

router.get(
  '/steps/:stepId/instructions',
  authenticate,
  authorize('admin'),
  aiController.fetchStepInstructions
); // Fetch step instructions (admin only)

export default router;

