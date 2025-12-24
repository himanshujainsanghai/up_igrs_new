import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * COMPLAINT DOCUMENT MODEL
 * Attached documents for complaints
 */

export interface IComplaintDocument extends Document {
  id: string;                                    // UUID unique identifier
  complaint_id: string;                          // Related complaint ID
  file_url: string;                              // S3 file URL
  file_name: string;                             // Original filename (max 255 chars)
  file_type: 'inward' | 'outward';               // Document type
  uploaded_by?: string;                          // Uploader name
  created_at: Date;                              // Upload timestamp
}

const ComplaintDocumentSchema = new Schema<IComplaintDocument>(
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
    file_name: {
      type: String,
      required: [true, 'File name is required'],
      maxlength: [255, 'File name cannot exceed 255 characters'],
      trim: true,
    },
    file_type: {
      type: String,
      required: [true, 'File type is required'],
      enum: {
        values: ['inward', 'outward'],
        message: '{VALUE} is not a valid file type',
      },
    },
    uploaded_by: {
      type: String,
      maxlength: [100, 'Uploader name cannot exceed 100 characters'],
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
    collection: 'complaint_documents',
  }
);

// Indexes
ComplaintDocumentSchema.index({ complaint_id: 1, created_at: -1 });

export const ComplaintDocument: Model<IComplaintDocument> = mongoose.model<IComplaintDocument>('ComplaintDocument', ComplaintDocumentSchema);

