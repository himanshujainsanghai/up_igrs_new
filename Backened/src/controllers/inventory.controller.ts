import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as inventoryService from '../services/inventory.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { ValidationError } from '../utils/errors';

/**
 * Inventory Controller
 * Handles HTTP requests for inventory operations
 */

/**
 * GET /api/v1/inventory
 * Get all inventory items with filters and pagination
 */
export const getAllInventory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string,
      type: req.query.type as string,
      fund_source: req.query.fund_source as string,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await inventoryService.getAllInventory(filters);

    sendPaginated(
      res,
      result.items,
      filters.page,
      filters.limit,
      result.pagination.total
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/inventory/:id
 * Get single inventory item by ID
 */
export const getInventoryById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await inventoryService.getInventoryById(id);
    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/inventory
 * Create new inventory item (admin only)
 */
export const createInventory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const itemData = req.body;
    const item = await inventoryService.createInventory(itemData);
    sendSuccess(res, item, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/inventory/:id
 * Update inventory item (admin only)
 */
export const updateInventory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const item = await inventoryService.updateInventory(id, updateData);
    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/inventory/:id
 * Delete inventory item (admin only)
 */
export const deleteInventory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await inventoryService.deleteInventory(id);
    sendSuccess(res, { message: 'Inventory item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/inventory/:id/notes
 * Add note to inventory item (admin only)
 */
export const addInventoryNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || note.trim().length < 5) {
      throw new ValidationError('Note must be at least 5 characters');
    }

    const inventoryNote = await inventoryService.addInventoryNote(id, note);
    sendSuccess(res, inventoryNote, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/inventory/:id/notes
 * Get inventory notes
 */
export const getInventoryNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const notes = await inventoryService.getInventoryNotes(id);
    sendSuccess(res, notes);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/inventory/:id/documents
 * Add document to inventory item (admin only)
 */
export const addInventoryDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { file_url, file_name, file_type, file_size } = req.body;

    if (!file_url || !file_name) {
      throw new ValidationError('file_url and file_name are required');
    }

    const document = await inventoryService.addInventoryDocument(
      id,
      file_url,
      file_name,
      file_type,
      file_size
    );

    sendSuccess(res, document, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/inventory/:id/documents
 * Get inventory documents
 */
export const getInventoryDocuments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const documents = await inventoryService.getInventoryDocuments(id);
    sendSuccess(res, documents);
  } catch (error) {
    next(error);
  }
};

