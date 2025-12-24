import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * INVENTORY NOTE MODEL
 * Notes for inventory items
 */

export interface IInventoryNote extends Document {
  id: string;                                    // UUID unique identifier
  inventory_item_id: string;                     // Related inventory item ID
  note: string;                                  // Note content (5-2000 chars)
  created_at: Date;                              // Creation timestamp
}

const InventoryNoteSchema = new Schema<IInventoryNote>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    inventory_item_id: {
      type: String,
      required: [true, 'Inventory item ID is required'],
      index: true,
    },
    note: {
      type: String,
      required: [true, 'Note is required'],
      minlength: [5, 'Note must be at least 5 characters'],
      maxlength: [2000, 'Note cannot exceed 2000 characters'],
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: 'inventory_notes',
  }
);

// Indexes
InventoryNoteSchema.index({ inventory_item_id: 1, created_at: -1 });

export const InventoryNote: Model<IInventoryNote> = mongoose.model<IInventoryNote>('InventoryNote', InventoryNoteSchema);

