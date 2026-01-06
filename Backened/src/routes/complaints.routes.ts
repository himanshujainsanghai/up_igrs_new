import { Router } from "express";
import * as complaintsController from "../controllers/complaints.controller";
import * as complaintHistoryController from "../controllers/complaintHistory.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

/**
 * Complaints Routes
 * /api/v1/complaints
 */

// Public routes (no authentication required)
router.get("/", complaintsController.getAllComplaints); // Get all complaints
router.get("/badaun", complaintsController.getBadaunComplaints); // Get Badaun complaints (must be before /:id)
router.get("/executives", complaintsController.getExecutives); // Get executives (must be before /:id)
router.get("/statistics", complaintsController.getStatistics); // Get statistics (must be before /:id)
router.get("/track/phone/:phoneNumber", complaintsController.trackByPhone); // Track by phone (must be before /:id)
router.post("/", complaintsController.createComplaint); // Create complaint

// Officer self-service routes for notes & attachments (officer only)
router.post(
  "/officer/notes",
  authenticate,
  authorize("officer"),
  complaintsController.addOfficerNote
); // Add officer note (inward/outward)
router.get(
  "/:id/officer-notes",
  authenticate,
  authorize("officer"),
  complaintsController.getOfficerNotes
); // Get officer notes for a complaint
router.post(
  "/officer/attachments",
  authenticate,
  authorize("officer"),
  complaintsController.addOfficerAttachment
); // Add officer attachment (expects S3 URL in body)
router.get(
  "/:id/officer-attachments",
  authenticate,
  authorize("officer"),
  complaintsController.getOfficerAttachments
); // Get officer attachments for a complaint
router.post(
  "/:id/officer/extension",
  authenticate,
  authorize("officer"),
  complaintsController.requestOfficerExtension
); // Officer requests extension
router.post(
  "/:id/officer/close",
  authenticate,
  authorize("officer"),
  complaintsController.closeComplaint
); // Officer closes complaint with details
router.post(
  "/:id/admin/approve-extension",
  authenticate,
  authorize("admin"),
  complaintsController.approveExtension
); // Admin approves extension
router.get(
  "/officer/complaint/:id",
  authenticate,
  authorize("officer"),
  complaintsController.getOfficerComplaintDetail
); // Officer combined complaint detail

// Protected routes (authentication required)
// Specific routes must be before generic /:id route

// Officer routes (must be before /:id)
router.get(
  "/my-complaints",
  authenticate,
  authorize("officer"),
  complaintsController.getMyComplaints
); // Get officer's assigned complaints (officer only)

// Get single complaint (must be after all specific routes)
router.get("/:id", complaintsController.getComplaintById); // Get single complaint

router.put(
  "/:id/assign",
  authenticate,
  authorize("admin"),
  complaintsController.assignComplaintToOfficer
); // Assign complaint to officer user (admin only) - legacy route

router.post(
  "/:id/assign-officer",
  authenticate,
  authorize("admin"),
  complaintsController.assignOfficer
); // Assign complaint to officer (intelligently creates new or uses existing) (admin only)

router.post(
  "/:id/assign-and-send-email",
  authenticate,
  authorize("admin"),
  complaintsController.assignOfficerAndSendEmail
); // Unified: Assign complaint to officer and send email with drafted letter (admin only)

router.put(
  "/:id/unassign",
  authenticate,
  authorize("admin"),
  complaintsController.unassignComplaint
); // Unassign complaint (admin only)

router.put(
  "/:id/research",
  authenticate,
  authorize("admin"),
  complaintsController.updateComplaintResearch
); // Update research data (admin only)

router.put(
  "/:id/stage1",
  authenticate,
  authorize("admin"),
  complaintsController.updateComplaintStage1Data
); // Update stage1 data (admin only)

router.post(
  "/:id/send-email",
  authenticate,
  authorize("admin"),
  complaintsController.sendComplaintEmail
); // Send email with drafted letter (admin only)

router.get(
  "/:id/email-history",
  authenticate,
  authorize("admin"),
  complaintsController.getComplaintEmailHistory
); // Get email history (admin only)

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  complaintsController.updateComplaint
); // Update complaint (admin only)

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  complaintsController.deleteComplaint
); // Delete complaint (admin only)

// Notes routes
router.post(
  "/:id/notes",
  authenticate,
  authorize("admin"),
  complaintsController.addComplaintNote
); // Add note (admin only)

router.get("/:id/notes", complaintsController.getComplaintNotes); // Get notes

// Documents routes
router.post(
  "/:id/documents",
  authenticate,
  authorize("admin"),
  complaintsController.addComplaintDocument
); // Add document (admin only)

router.get("/:id/documents", complaintsController.getComplaintDocuments); // Get documents

// Historical complaint data routes
router.get(
  "/history/comparison",
  complaintHistoryController.getComplaintComparison
); // Get historical comparison
router.get(
  "/history/snapshots",
  complaintHistoryController.getComplaintSnapshots
); // Get historical snapshots
router.post(
  "/history/snapshot",
  authenticate,
  authorize("admin"),
  complaintHistoryController.createComplaintSnapshot
); // Create snapshot (admin only)
router.post(
  "/history/snapshot/all-districts",
  authenticate,
  authorize("admin"),
  complaintHistoryController.createAllDistrictSnapshotsHandler
); // Create all district snapshots (admin only)

export default router;
