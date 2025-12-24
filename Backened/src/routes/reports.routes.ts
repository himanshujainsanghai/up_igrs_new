import { Router } from 'express';
import * as reportsController from '../controllers/reports.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * Reports Routes
 * /api/v1/reports
 * 
 * All routes require admin authentication
 */

router.use(authenticate);
router.use(authorize('admin'));

router.get('/statistics', reportsController.getReportStatistics); // Get statistics
router.get('/pdf', reportsController.generatePDFReport); // Generate PDF (HTML)
router.get('/excel', reportsController.generateExcelExport); // Export to Excel (CSV)
router.get('/complaints/export', reportsController.exportComplaints); // Export complaints (JSON)

export default router;

