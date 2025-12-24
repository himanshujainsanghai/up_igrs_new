/**
 * Inventory Service
 * Maps to backend /api/v1/inventory routes
 */

import apiClient from '@/lib/api';
import { ApiResponse, PaginatedResponse, Inventory, InventoryNote, InventoryDocument } from '@/types';

export const inventoryService = {
  /**
   * Get all inventory items (public)
   * GET /api/v1/inventory
   */
  async getAllInventory(page = 1, limit = 20): Promise<PaginatedResponse<Inventory>> {
    const response = await apiClient.get<ApiResponse<Inventory[]>>(`/inventory?page=${page}&limit=${limit}`);
    // Transform backend response to match frontend format
    const items = (response.data || []).map((item: any) => ({
      ...item,
      _id: item._id || item.id,
      fundSource: item.fundSource || item.fund_source,
      purchaseDate: item.purchaseDate || item.purchase_date,
      category: item.category || item.type,
    }));
    return {
      success: response.success,
      data: items,
      meta: response.meta ? {
        page: response.meta.page || page,
        limit: response.meta.limit || limit,
        total: response.meta.total || 0,
        totalPages: response.meta.totalPages || 1,
      } : {
        page,
        limit,
        total: 0,
        totalPages: 1,
      },
    } as PaginatedResponse<Inventory>;
  },

  /**
   * Get inventory item by ID (public)
   * GET /api/v1/inventory/:id
   */
  async getInventoryById(id: string): Promise<Inventory> {
    const response = await apiClient.get<ApiResponse<any>>(`/inventory/${id}`);
    const item = response.data;
    // Transform backend response to match frontend format
    return {
      ...item,
      _id: item._id || item.id,
      fundSource: item.fundSource || item.fund_source,
      purchaseDate: item.purchaseDate || item.purchase_date,
      category: item.category || item.type,
      description: item.description || '',
      unit: item.unit || '',
      status: item.status === 'in_stock' ? 'available' : item.status,
    } as Inventory;
  },

  /**
   * Create inventory item (admin only)
   * POST /api/v1/inventory
   */
  async createInventory(item: Partial<Inventory>): Promise<Inventory> {
    // Transform frontend format to backend format
    const payload: any = {
      name: item.name,
      type: item.type || item.category,
      location: item.location,
      quantity: item.quantity,
      amount: item.amount,
      fund_source: item.fundSource || item.fund_source,
      purchase_date: item.purchaseDate,
      status: item.status === 'available' ? 'in_stock' : item.status,
    };
    const response = await apiClient.post<ApiResponse<any>>('/inventory', payload);
    const createdItem = response.data;
    return {
      ...createdItem,
      _id: createdItem._id || createdItem.id,
      fundSource: createdItem.fundSource || createdItem.fund_source,
      purchaseDate: createdItem.purchaseDate || createdItem.purchase_date,
      category: createdItem.category || createdItem.type,
    } as Inventory;
  },

  /**
   * Update inventory item (admin only)
   * PUT /api/v1/inventory/:id
   */
  async updateInventory(id: string, updates: Partial<Inventory>): Promise<Inventory> {
    // Transform frontend format to backend format
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.type || updates.category) payload.type = updates.type || updates.category;
    if (updates.location) payload.location = updates.location;
    if (updates.quantity !== undefined) payload.quantity = updates.quantity;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.fundSource || updates.fund_source) payload.fund_source = updates.fundSource || updates.fund_source;
    if (updates.purchaseDate) payload.purchase_date = updates.purchaseDate;
    if (updates.status) payload.status = updates.status === 'available' ? 'in_stock' : updates.status;
    
    const response = await apiClient.put<ApiResponse<any>>(`/inventory/${id}`, payload);
    const updatedItem = response.data;
    return {
      ...updatedItem,
      _id: updatedItem._id || updatedItem.id,
      fundSource: updatedItem.fundSource || updatedItem.fund_source,
      purchaseDate: updatedItem.purchaseDate || updatedItem.purchase_date,
      category: updatedItem.category || updatedItem.type,
    } as Inventory;
  },

  /**
   * Delete inventory item (admin only)
   * DELETE /api/v1/inventory/:id
   */
  async deleteInventory(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/inventory/${id}`);
  },

  /**
   * Get inventory notes (public)
   * GET /api/v1/inventory/:id/notes
   */
  async getNotes(id: string): Promise<InventoryNote[]> {
    const response = await apiClient.get<ApiResponse<InventoryNote[]>>(`/inventory/${id}/notes`);
    return response.data;
  },

  /**
   * Add inventory note (admin only)
   * POST /api/v1/inventory/:id/notes
   */
  async addNote(id: string, note: string): Promise<InventoryNote> {
    const response = await apiClient.post<ApiResponse<any>>(`/inventory/${id}/notes`, {
      note,
    });
    const noteData = response.data;
    // Transform backend response to frontend format
    return {
      _id: noteData._id || noteData.id,
      inventoryId: noteData.inventory_item_id || noteData.inventoryId || id,
      content: noteData.note || noteData.content,
      createdBy: noteData.created_by || noteData.createdBy || '',
      createdAt: noteData.created_at || noteData.createdAt,
    } as InventoryNote;
  },

  /**
   * Get inventory documents (public)
   * GET /api/v1/inventory/:id/documents
   */
  async getDocuments(id: string): Promise<InventoryDocument[]> {
    const response = await apiClient.get<ApiResponse<InventoryDocument[]>>(`/inventory/${id}/documents`);
    return response.data;
  },

  /**
   * Add inventory document (admin only)
   * POST /api/v1/inventory/:id/documents
   */
  async addDocument(id: string, document: { fileName: string; fileUrl: string; fileType: string; fileSize: number }): Promise<InventoryDocument> {
    const response = await apiClient.post<ApiResponse<InventoryDocument>>(`/inventory/${id}/documents`, document);
    return response.data;
  },
};

