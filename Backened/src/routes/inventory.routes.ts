import { Router } from 'express';
import * as inventoryController from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * Inventory Routes
 * /api/v1/inventory
 */

// Public routes (viewing only)
router.get('/', inventoryController.getAllInventory); // Get all items
router.get('/:id', inventoryController.getInventoryById); // Get single item
router.get('/:id/notes', inventoryController.getInventoryNotes); // Get notes
router.get('/:id/documents', inventoryController.getInventoryDocuments); // Get documents

// Protected routes (admin only)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  inventoryController.createInventory
); // Create item (admin only)

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  inventoryController.updateInventory
); // Update item (admin only)

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  inventoryController.deleteInventory
); // Delete item (admin only)

router.post(
  '/:id/notes',
  authenticate,
  authorize('admin'),
  inventoryController.addInventoryNote
); // Add note (admin only)

router.post(
  '/:id/documents',
  authenticate,
  authorize('admin'),
  inventoryController.addInventoryDocument
); // Add document (admin only)

export default router;

