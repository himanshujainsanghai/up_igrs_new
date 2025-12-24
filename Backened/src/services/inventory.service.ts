import { Inventory } from '../models/Inventory';
import { InventoryNote } from '../models/InventoryNote';
import { InventoryDocument } from '../models/InventoryDocument';
import { NotFoundError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Inventory Service
 * Business logic for inventory operations
 */

export interface CreateInventoryDto {
  name: string;
  type: string;
  location: string;
  quantity: number;
  amount: number;
  fund_source: 'personal' | 'mlalad' | 'government';
  purchase_date: Date;
  status?: 'in_stock' | 'distributed' | 'in_use';
}

export interface UpdateInventoryDto {
  name?: string;
  type?: string;
  location?: string;
  quantity?: number;
  amount?: number;
  fund_source?: 'personal' | 'mlalad' | 'government';
  purchase_date?: Date;
  status?: 'in_stock' | 'distributed' | 'in_use';
}

export interface InventoryFilters {
  status?: string;
  type?: string;
  fund_source?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all inventory items with filters and pagination
 */
export const getAllInventory = async (filters: InventoryFilters = {}) => {
  const {
    status,
    type,
    fund_source,
    search,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

  // Build query
  const query: any = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  if (type && type !== 'all') {
    query.type = type;
  }

  if (fund_source && fund_source !== 'all') {
    query.fund_source = fund_source;
  }

  // Text search
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { type: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
    ];
  }

  // Fetch inventory items
  const [items, total] = await Promise.all([
    Inventory.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Inventory.countDocuments(query),
  ]);

  // Fetch notes and documents for all items
  const itemIds = items.map((item) => item.id);
  const [notes, documents] = await Promise.all([
    InventoryNote.find({ inventory_item_id: { $in: itemIds } }).lean(),
    InventoryDocument.find({ inventory_item_id: { $in: itemIds } }).lean(),
  ]);

  // Group notes and documents by item ID
  const notesMap = new Map<string, any[]>();
  notes.forEach((note) => {
    if (!notesMap.has(note.inventory_item_id)) {
      notesMap.set(note.inventory_item_id, []);
    }
    notesMap.get(note.inventory_item_id)!.push(note);
  });

  const documentsMap = new Map<string, any[]>();
  documents.forEach((doc) => {
    if (!documentsMap.has(doc.inventory_item_id)) {
      documentsMap.set(doc.inventory_item_id, []);
    }
    documentsMap.get(doc.inventory_item_id)!.push(doc);
  });

  // Attach notes and documents to items
  const itemsWithDetails = items.map((item) => ({
    ...item,
    notes: notesMap.get(item.id) || [],
    documents: documentsMap.get(item.id) || [],
  }));

  return {
    items: itemsWithDetails,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single inventory item by ID
 */
export const getInventoryById = async (id: string) => {
  const item = await Inventory.findOne({ id }).lean();

  if (!item) {
    throw new NotFoundError('Inventory item');
  }

  // Fetch notes and documents
  const [notes, documents] = await Promise.all([
    InventoryNote.find({ inventory_item_id: id }).sort({ created_at: 1 }).lean(),
    InventoryDocument.find({ inventory_item_id: id }).sort({ uploaded_at: 1 }).lean(),
  ]);

  return {
    ...item,
    notes,
    documents,
  };
};

/**
 * Create new inventory item
 */
export const createInventory = async (data: CreateInventoryDto) => {
  const item = new Inventory({
    ...data,
    status: data.status || 'in_stock',
  });

  await item.save();
  logger.info(`Inventory item created: ${item.id}`);

  return item.toObject();
};

/**
 * Update inventory item
 */
export const updateInventory = async (id: string, data: UpdateInventoryDto) => {
  const item = await Inventory.findOne({ id });

  if (!item) {
    throw new NotFoundError('Inventory item');
  }

  Object.assign(item, data);
  await item.save();
  logger.info(`Inventory item updated: ${id}`);

  return item.toObject();
};

/**
 * Delete inventory item
 */
export const deleteInventory = async (id: string) => {
  const item = await Inventory.findOne({ id });

  if (!item) {
    throw new NotFoundError('Inventory item');
  }

  // Delete related notes and documents
  await Promise.all([
    InventoryNote.deleteMany({ inventory_item_id: id }),
    InventoryDocument.deleteMany({ inventory_item_id: id }),
    Inventory.deleteOne({ id }),
  ]);

  logger.info(`Inventory item deleted: ${id}`);
};

/**
 * Add note to inventory item
 */
export const addInventoryNote = async (
  inventoryItemId: string,
  note: string
) => {
  const item = await Inventory.findOne({ id: inventoryItemId });

  if (!item) {
    throw new NotFoundError('Inventory item');
  }

  const inventoryNote = new InventoryNote({
    inventory_item_id: inventoryItemId,
    note,
  });

  await inventoryNote.save();
  return inventoryNote.toObject();
};

/**
 * Get inventory notes
 */
export const getInventoryNotes = async (inventoryItemId: string) => {
  const notes = await InventoryNote.find({ inventory_item_id: inventoryItemId })
    .sort({ created_at: 1 })
    .lean();

  return notes;
};

/**
 * Add document to inventory item
 */
export const addInventoryDocument = async (
  inventoryItemId: string,
  fileUrl: string,
  fileName: string,
  fileType?: string,
  fileSize?: number
) => {
  const item = await Inventory.findOne({ id: inventoryItemId });

  if (!item) {
    throw new NotFoundError('Inventory item');
  }

  const document = new InventoryDocument({
    inventory_item_id: inventoryItemId,
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType || null,
    file_size: fileSize || null,
  });

  await document.save();
  return document.toObject();
};

/**
 * Get inventory documents
 */
export const getInventoryDocuments = async (inventoryItemId: string) => {
  const documents = await InventoryDocument.find({ inventory_item_id: inventoryItemId })
    .sort({ uploaded_at: 1 })
    .lean();

  return documents;
};

