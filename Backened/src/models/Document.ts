import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * DOCUMENT MODEL
 * General document repository
 */

export interface IDocument extends MongooseDocument {
  id: string;                                    // UUID unique identifier
  file_name: string;                             // File name (max 255 chars)
  file_type: string;                             // MIME type
  file_size: number;                             // File size in bytes
  file_url: string;                              // S3 URL
  s3_key?: string;                               // S3 key
  uploaded_by?: string;                          // Uploader name/ID
  uploaded_at: Date;                             // Upload timestamp
  description?: string;                           // Document description (max 1000 chars)
  tags?: string[];                               // Tags for categorization
  is_public: boolean;                            // Public visibility flag
  created_at: Date;                              // Creation timestamp
  updated_at: Date;                              // Last update timestamp
}

const DocumentSchema = new Schema<IDocument>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
      index: true,
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
      trim: true,
    },
    file_size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative'],
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
    s3_key: {
      type: String,
      trim: true,
    },
    uploaded_by: {
      type: String,
      maxlength: [100, 'Uploader name cannot exceed 100 characters'],
      trim: true,
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    tags: [String],
    is_public: {
      type: Boolean,
      default: false,
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
    },
  },
  {
    timestamps: false,
    collection: 'documents',
  }
);

// Indexes
DocumentSchema.index({ uploaded_at: -1 });
DocumentSchema.index({ is_public: 1 });
DocumentSchema.index({ tags: 1 });
DocumentSchema.index({ file_type: 1 });

// Auto-update updated_at
DocumentSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const Document: Model<IDocument> = mongoose.model<IDocument>('Document', DocumentSchema);

