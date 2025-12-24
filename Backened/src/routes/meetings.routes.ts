import { Router } from 'express';
import * as meetingsController from '../controllers/meetings.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * Meetings Routes
 * /api/v1/meetings
 */

// Public routes (no authentication required)
router.get('/', meetingsController.getAllMeetings); // Get all meetings
router.get('/:id', meetingsController.getMeetingById); // Get single meeting
router.post('/', meetingsController.createMeeting); // Create meeting request
router.get('/status/:status', meetingsController.getMeetingsByStatus); // Get by status

// Protected routes (authentication required)
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  meetingsController.updateMeeting
); // Update meeting (admin only)

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  meetingsController.deleteMeeting
); // Delete meeting (admin only)

// Attachments
router.post(
  '/:id/attachments',
  authenticate,
  authorize('admin'),
  meetingsController.addMeetingAttachment
); // Add attachment (admin only)

export default router;

