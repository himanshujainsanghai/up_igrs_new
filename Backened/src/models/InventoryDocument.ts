import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * INVENTORY DOCUMENT MODEL
 * Documents for inventory items
 */

export interface IInventoryDocument extends Document {
  id: string;                                    // UUID unique identifier
  inventory_item_id: string;                     // Related inventory item ID
  file_name: string;                             // Original filename (max 255 chars)
  file_url: string;                              // S3 file URL
  file_type: string | null;                      // File type/MIME type
  file_size: number | null;                      // File size in bytes
  uploaded_at: Date;                             // Upload timestamp
}

const InventoryDocumentSchema = new Schema<IInventoryDocument>(
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
    file_name: {
      type: String,
      required: [true, 'File name is required'],
      maxlength: [255, 'File name cannot exceed 255 characters'],
      trim: true,
    },
    file_url: {
      type: String,
      required: [true, 'File URL is required'],
      validate: {
        validator: (v: string) => {
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Invalid file URL',
      },
    },
    file_type: {
      type: String,
      trim: true,
    },
    file_size: {
      type: Number,
      min: [0, 'File size cannot be negative'],
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: 'inventory_documents',
  }
);

// Indexes
InventoryDocumentSchema.index({ inventory_item_id: 1, uploaded_at: -1 });

export const InventoryDocument: Model<IInventoryDocument> = mongoose.model<IInventoryDocument>('InventoryDocument', InventoryDocumentSchema);

