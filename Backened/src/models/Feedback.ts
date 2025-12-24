import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * FEEDBACK MODEL
 * User feedback (suggestion, praise, issue)
 */

export interface IFeedback extends Document {
  id: string;                                    // UUID unique identifier
  type: 'suggestion' | 'praise' | 'issue';      // Feedback type
  content: string;                               // Feedback content (min 10 chars, max 5000)
  is_anonymous: boolean;                         // Anonymous flag
  user_name?: string;                            // User name (if not anonymous)
  user_email?: string;                           // User email (if not anonymous)
  user_phone?: string;                           // User phone (if not anonymous)
  media_urls?: string[];                         // Array of media URLs (images/videos)
  status: 'pending' | 'reviewed' | 'addressed'; // Feedback status
  admin_response?: string;                       // Admin response (max 2000 chars)
  reviewed_at?: Date;                            // Review timestamp
  reviewed_by?: string;                          // Admin email who reviewed
  created_at: Date;                              // Creation timestamp
  updated_at: Date;                              // Last update timestamp
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['suggestion', 'praise', 'issue'],
      required: [true, 'Feedback type is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Feedback content is required'],
      minlength: [10, 'Feedback must be at least 10 characters'],
      maxlength: [5000, 'Feedback cannot exceed 5000 characters'],
      trim: true,
    },
    is_anonymous: {
      type: Boolean,
      default: false,
    },
    user_name: {
      type: String,
      maxlength: [100, 'Name cannot exceed 100 characters'],
      trim: true,
    },
    user_email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      index: true,
    },
    user_phone: {
      type: String,
      match: [/^\+?[\d\s-]{10,15}$/, 'Please provide a valid phone number'],
      trim: true,
    },
    media_urls: [{
      type: String,
      maxlength: [500, 'URL cannot exceed 500 characters'],
    }],
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'addressed'],
      default: 'pending',
      index: true,
    },
    admin_response: {
      type: String,
      maxlength: [2000, 'Admin response cannot exceed 2000 characters'],
    },
    reviewed_at: Date,
    reviewed_by: {
      type: String,
      maxlength: [100, 'Reviewed by cannot exceed 100 characters'],
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
    collection: 'feedback',
  }
);

// Performance indexes
FeedbackSchema.index({ type: 1, status: 1 });
FeedbackSchema.index({ created_at: -1 });
FeedbackSchema.index({ is_anonymous: 1 });

// Auto-update updated_at on save
FeedbackSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const Feedback: Model<IFeedback> = mongoose.model<IFeedback>('Feedback', FeedbackSchema);

