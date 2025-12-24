import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * MEETING MODEL
 * Meeting requests with officials
 */

export interface IMeeting extends Document {
  id: string;                                    // UUID unique identifier
  requester_name: string;                        // Requester name (2-100 chars)
  requester_email: string;                       // Email address
  requester_phone?: string;                      // Phone number
  requester_area?: string;                       // Area/location (max 200 chars)
  meeting_subject: string;                       // Meeting subject (5-200 chars)
  purpose: string;                               // Meeting purpose (20-2000 chars)
  meeting_type: 'general_inquiry' | 'complaint_followup' | 'suggestion' | 'other';
  preferred_date?: Date;                         // Preferred date
  preferred_time?: string;                       // Preferred time (HH:MM format)
  actual_meeting_date?: Date;                    // Actual meeting date
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  assigned_staff?: string;                       // Assigned staff member
  meeting_location?: string;                     // Meeting location
  meeting_notes?: string;                        // Meeting notes (max 2000 chars)
  admin_notes?: string;                          // Admin internal notes (max 2000 chars)
  attachment_urls?: string[];                    // Attachment URLs (S3)
  attachment_names?: string[];                   // Attachment filenames
  created_at: Date;                              // Creation timestamp
  updated_at: Date;                              // Last update timestamp
}

const MeetingSchema = new Schema<IMeeting>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
      index: true,
    },
    requester_name: {
      type: String,
      required: [true, 'Requester name is required'],
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
      trim: true,
    },
    requester_email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    requester_phone: {
      type: String,
      match: [/^\+?[\d\s-]{10,15}$/, 'Please provide a valid phone number'],
      trim: true,
    },
    requester_area: {
      type: String,
      maxlength: [200, 'Area cannot exceed 200 characters'],
      trim: true,
    },
    meeting_subject: {
      type: String,
      required: [true, 'Meeting subject is required'],
      minlength: [5, 'Subject must be at least 5 characters'],
      maxlength: [200, 'Subject cannot exceed 200 characters'],
      trim: true,
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      minlength: [20, 'Purpose must be at least 20 characters'],
      maxlength: [2000, 'Purpose cannot exceed 2000 characters'],
    },
    meeting_type: {
      type: String,
      required: [true, 'Meeting type is required'],
      enum: {
        values: ['general_inquiry', 'complaint_followup', 'suggestion', 'other'],
        message: '{VALUE} is not a valid meeting type',
      },
    },
    preferred_date: Date,
    preferred_time: {
      type: String,
      match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, 'Invalid time format (HH:MM:SS)'],
    },
    actual_meeting_date: Date,
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    assigned_staff: {
      type: String,
      maxlength: [100, 'Staff name cannot exceed 100 characters'],
      trim: true,
    },
    meeting_location: {
      type: String,
      maxlength: [200, 'Location cannot exceed 200 characters'],
      trim: true,
    },
    meeting_notes: {
      type: String,
      maxlength: [2000, 'Meeting notes cannot exceed 2000 characters'],
    },
    admin_notes: {
      type: String,
      maxlength: [2000, 'Admin notes cannot exceed 2000 characters'],
    },
    attachment_urls: [{
      type: String,
      validate: {
        validator: (v: string) => {
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Invalid attachment URL',
      },
    }],
    attachment_names: [String],
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
    collection: 'meetings',
  }
);

// Indexes
MeetingSchema.index({ status: 1 });
MeetingSchema.index({ preferred_date: 1 });
MeetingSchema.index({ requester_email: 1 });
MeetingSchema.index({ created_at: -1 });

// Auto-update updated_at
MeetingSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const Meeting: Model<IMeeting> = mongoose.model<IMeeting>('Meeting', MeetingSchema);

