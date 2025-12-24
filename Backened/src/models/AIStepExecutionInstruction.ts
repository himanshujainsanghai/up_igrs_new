import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * AI STEP EXECUTION INSTRUCTION MODEL
 * Detailed execution instructions for AI resolution steps
 */

export interface IAIStepExecutionInstruction extends Document {
  id: string;                                    // UUID unique identifier
  complaint_id: string;                          // Related complaint ID
  step_id: string;                              // Related step ID (references AIResolutionStep.id)
  instructions: string;                          // Detailed instructions (max 10000 chars)
  created_at: Date;                             // Creation timestamp
  updated_at: Date;                             // Last update timestamp
}

const AIStepExecutionInstructionSchema = new Schema<IAIStepExecutionInstruction>(
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
      index: true,
    },
    step_id: {
      type: String,
      required: [true, 'Step ID is required'],
      index: true,
    },
    instructions: {
      type: String,
      required: [true, 'Instructions are required'],
      maxlength: [10000, 'Instructions cannot exceed 10000 characters'],
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
    collection: 'ai_step_execution_instructions',
  }
);

// Indexes
AIStepExecutionInstructionSchema.index({ complaint_id: 1, step_id: 1 }, { unique: true });
AIStepExecutionInstructionSchema.index({ complaint_id: 1 });
AIStepExecutionInstructionSchema.index({ step_id: 1 });

// Auto-update updated_at
AIStepExecutionInstructionSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const AIStepExecutionInstruction: Model<IAIStepExecutionInstruction> = 
  mongoose.model<IAIStepExecutionInstruction>('AIStepExecutionInstruction', AIStepExecutionInstructionSchema);

