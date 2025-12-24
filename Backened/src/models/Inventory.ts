import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * INVENTORY MODEL
 * Inventory items management
 */

export interface IInventory extends Document {
  id: string;                                    // UUID unique identifier
  name: string;                                  // Item name (2-200 chars)
  type: string;                                  // Item type/category (max 100 chars)
  location: string;                              // Storage location (max 200 chars)
  quantity: number;                              // Current quantity (positive integer)
  amount: number;                                // Purchase amount in INR (positive number)
  fund_source: 'personal' | 'mlalad' | 'government'; // Fund source
  purchase_date: Date;                           // Purchase date
  status: 'in_stock' | 'distributed' | 'in_use'; // Current status
  created_at: Date;                              // Creation timestamp
  updated_at: Date;                              // Last update timestamp
}

const InventorySchema = new Schema<IInventory>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [200, 'Name cannot exceed 200 characters'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      maxlength: [100, 'Type cannot exceed 100 characters'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      maxlength: [200, 'Location cannot exceed 200 characters'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    fund_source: {
      type: String,
      required: [true, 'Fund source is required'],
      enum: {
        values: ['personal', 'mlalad', 'government'],
        message: '{VALUE} is not a valid fund source',
      },
    },
    purchase_date: {
      type: Date,
      required: [true, 'Purchase date is required'],
    },
    status: {
      type: String,
      required: true,
      enum: ['in_stock', 'distributed', 'in_use'],
      default: 'in_stock',
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: 'inventory',
  }
);

// Indexes
InventorySchema.index({ status: 1 });
InventorySchema.index({ type: 1 });
InventorySchema.index({ created_at: -1 });

// Auto-update updated_at
InventorySchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const Inventory: Model<IInventory> = mongoose.model<IInventory>('Inventory', InventorySchema);

