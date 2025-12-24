import { Router } from 'express';
import * as documentsController from '../controllers/documents.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * Documents Routes
 * /api/v1/documents
 */

// Public routes (viewing public documents)
router.get('/', documentsController.getAllDocuments); // Get all documents (filtered by is_public)

// Protected routes (authenticated users)
router.get('/:id', authenticate, documentsController.getDocumentById); // Get document by ID

// Admin-only routes
router.post(
  '/',
  authenticate,
  authorize('admin'),
  documentsController.createDocument
); // Create document (admin only)

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  documentsController.updateDocument
); // Update document (admin only)

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  documentsController.deleteDocument
); // Delete document (admin only)

export default router;

