import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * AI RESOLUTION STEP MODEL
 * AI-generated resolution steps for complaints
 */

export interface IAIResolutionStep extends Document {
  id: string;                                    // UUID unique identifier
  complaint_id: string;                          // Related complaint ID (references Complaint.id)
  step_number: number;                           // Step sequence number (unique per complaint)
  title: string;                                 // Step title (5-200 chars)
  description: string;                           // Step description (20-2000 chars)
  estimated_cost?: number;                       // Estimated cost in INR
  estimated_days?: number;                       // Estimated days
  department?: string;                           // Responsible department
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  actual_cost?: number;                          // Actual cost in INR
  actual_days?: number;                          // Actual days taken
  completion_notes?: string;                     // Completion notes (max 2000 chars)
  requirements?: string[];                       // Required resources
  action_type?: 'email' | 'proposal' | 'phone_call' | 'notice' | 'fieldwork' | 'meeting';
  action_details?: {                             // Action details object
    recipient?: string;
    contact_number?: string;
    email_template?: string;
    proposal_type?: string;
    notice_type?: string;
    urgency_level?: 'low' | 'medium' | 'high' | 'urgent';
  };
  created_at: Date;                              // Creation timestamp
  updated_at: Date;                              // Last update timestamp
}

const AIResolutionStepSchema = new Schema<IAIResolutionStep>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
      index: true,
    },
    complaint_id: {
      type: String,
      required: [true, 'Complaint ID is required'],
    },
    step_number: {
      type: Number,
      required: [true, 'Step number is required'],
      min: [1, 'Step number must be at least 1'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    estimated_cost: {
      type: Number,
      min: [0, 'Cost cannot be negative'],
    },
    estimated_days: {
      type: Number,
      min: [1, 'Days must be at least 1'],
    },
    department: {
      type: String,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'in_progress', 'completed', 'skipped'],
      default: 'pending',
    },
    actual_cost: {
      type: Number,
      min: [0, 'Cost cannot be negative'],
    },
    actual_days: {
      type: Number,
      min: [1, 'Days must be at least 1'],
    },
    completion_notes: {
      type: String,
      maxlength: [2000, 'Completion notes cannot exceed 2000 characters'],
    },
    requirements: [String],
    action_type: {
      type: String,
      enum: {
        values: ['email', 'proposal', 'phone_call', 'notice', 'fieldwork', 'meeting'],
        message: '{VALUE} is not a valid action type',
      },
    },
    action_details: {
      type: Schema.Types.Mixed,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
    collection: 'ai_resolution_steps',
  }
);

// Unique constraint: one step number per complaint
AIResolutionStepSchema.index({ complaint_id: 1, step_number: 1 }, { unique: true });

// Indexes
AIResolutionStepSchema.index({ complaint_id: 1 });
AIResolutionStepSchema.index({ status: 1 });

// Auto-update updated_at
AIResolutionStepSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const AIResolutionStep: Model<IAIResolutionStep> = mongoose.model<IAIResolutionStep>('AIResolutionStep', AIResolutionStepSchema);

