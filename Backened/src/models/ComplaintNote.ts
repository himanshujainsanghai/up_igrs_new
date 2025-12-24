import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * COMPLAINT NOTE MODEL
 * Admin notes for complaints
 */

export interface IComplaintNote extends Document {
  id: string;                                    // UUID unique identifier
  complaint_id: string;                          // Related complaint ID
  note: string;                                  // Note content (5-2000 chars)
  created_by?: string;                           // Creator name
  created_at: Date;                              // Creation timestamp
}

const ComplaintNoteSchema = new Schema<IComplaintNote>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    complaint_id: {
      type: String,
      required: [true, 'Complaint ID is required'],
      index: true,
    },
    note: {
      type: String,
      required: [true, 'Note is required'],
      minlength: [5, 'Note must be at least 5 characters'],
      maxlength: [2000, 'Note cannot exceed 2000 characters'],
    },
    created_by: {
      type: String,
      maxlength: [100, 'Creator name cannot exceed 100 characters'],
      trim: true,
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
    collection: 'complaint_notes',
  }
);

// Indexes
ComplaintNoteSchema.index({ complaint_id: 1, created_at: -1 });

export const ComplaintNote: Model<IComplaintNote> = mongoose.model<IComplaintNote>('ComplaintNote', ComplaintNoteSchema);

