import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IComplaintExtensionRequest extends Document {
  id: string;
  complaint_id: string;
  requested_by: string;
  requested_by_role: "officer" | "admin";
  days_requested: number;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  decided_by?: string;
  decided_by_role?: "admin";
  decided_at?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const ComplaintExtensionRequestSchema = new Schema<IComplaintExtensionRequest>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    complaint_id: {
      type: String,
      required: [true, "Complaint ID is required"],
      index: true,
    },
    requested_by: {
      type: String,
      required: [true, "Requester is required"],
      index: true,
    },
    requested_by_role: {
      type: String,
      enum: ["officer", "admin"],
      required: true,
      index: true,
    },
    days_requested: {
      type: Number,
      required: true,
      min: [1, "Extension days must be at least 1"],
      max: [365, "Extension days cannot exceed 365"],
    },
    reason: {
      type: String,
      maxlength: [2000, "Reason cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    decided_by: {
      type: String,
    },
    decided_by_role: {
      type: String,
      enum: ["admin"],
    },
    decided_at: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: [1000, "Decision notes cannot exceed 1000 characters"],
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
    timestamps: true,
    collection: "complaint_extension_requests",
  }
);

ComplaintExtensionRequestSchema.index({
  complaint_id: 1,
  status: 1,
  created_at: -1,
});
ComplaintExtensionRequestSchema.index({
  requested_by: 1,
  status: 1,
  created_at: -1,
});

export const ComplaintExtensionRequest: Model<IComplaintExtensionRequest> =
  mongoose.model<IComplaintExtensionRequest>(
    "ComplaintExtensionRequest",
    ComplaintExtensionRequestSchema
  );
