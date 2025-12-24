import { Router } from 'express';
import * as complaintsController from '../controllers/complaints.controller';
import * as complaintHistoryController from '../controllers/complaintHistory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * Complaints Routes
 * /api/v1/complaints
 */

// Public routes (no authentication required)
router.get('/', complaintsController.getAllComplaints); // Get all complaints
router.get('/executives', complaintsController.getExecutives); // Get executives (must be before /:id)
router.get('/statistics', complaintsController.getStatistics); // Get statistics (must be before /:id)
router.get('/track/phone/:phoneNumber', complaintsController.trackByPhone); // Track by phone (must be before /:id)
router.get('/:id', complaintsController.getComplaintById); // Get single complaint
router.post('/', complaintsController.createComplaint); // Create complaint

// Protected routes (authentication required)
// Specific routes must be before generic /:id route

// Officer routes (must be before /:id)
router.get(
  '/my-complaints',
  authenticate,
  authorize('officer'),
  complaintsController.getMyComplaints
); // Get officer's assigned complaints (officer only)

router.put(
  '/:id/assign',
  authenticate,
  authorize('admin'),
  complaintsController.assignComplaintToOfficer
); // Assign complaint to officer (admin only)

router.put(
  '/:id/unassign',
  authenticate,
  authorize('admin'),
  complaintsController.unassignComplaint
); // Unassign complaint (admin only)

router.put(
  '/:id/research',
  authenticate,
  authorize('admin'),
  complaintsController.updateComplaintResearch
); // Update research data (admin only)

router.put(
  '/:id/stage1',
  authenticate,
  authorize('admin'),
  complaintsController.updateComplaintStage1Data
); // Update stage1 data (admin only)

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  complaintsController.updateComplaint
); // Update complaint (admin only)

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  complaintsController.deleteComplaint
); // Delete complaint (admin only)

// Notes routes
router.post(
  '/:id/notes',
  authenticate,
  authorize('admin'),
  complaintsController.addComplaintNote
); // Add note (admin only)

router.get('/:id/notes', complaintsController.getComplaintNotes); // Get notes

// Documents routes
router.post(
  '/:id/documents',
  authenticate,
  authorize('admin'),
  complaintsController.addComplaintDocument
); // Add document (admin only)

router.get('/:id/documents', complaintsController.getComplaintDocuments); // Get documents

// Historical complaint data routes
router.get('/history/comparison', complaintHistoryController.getComplaintComparison); // Get historical comparison
router.get('/history/snapshots', complaintHistoryController.getComplaintSnapshots); // Get historical snapshots
router.post('/history/snapshot', authenticate, authorize('admin'), complaintHistoryController.createComplaintSnapshot); // Create snapshot (admin only)
router.post('/history/snapshot/all-districts', authenticate, authorize('admin'), complaintHistoryController.createAllDistrictSnapshotsHandler); // Create all district snapshots (admin only)

export default router;

