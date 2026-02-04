import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

/**
 * COMPLAINT DOCUMENT SUMMARY MODEL
 * One record per summarization; multiple summaries per complaint when admin resummarizes.
 * Input context (title, description, doc URLs) is not stored — it lives on Complaint and is immutable.
 */

export interface IComplaintDocumentSummary extends Document {
  id: string;
  complaint_id: string;
  summary: string;
  use_complaint_context: boolean;
  document_count: number; // How many attachments were summarized (from complaint.images.length)
  user_prompt?: string; // Optional instruction from admin (e.g. "Focus on dates and amounts")
  created_at: Date;
}

const ComplaintDocumentSummarySchema = new Schema<IComplaintDocumentSummary>(
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
    summary: {
      type: String,
      required: [true, "Summary is required"],
      maxlength: [50000, "Summary cannot exceed 50000 characters"],
    },
    use_complaint_context: {
      type: Boolean,
      required: true,
      default: true,
    },
    document_count: {
      type: Number,
      required: true,
      min: [1, "At least one document was summarized"],
    },
    user_prompt: {
      type: String,
      maxlength: [2000, "User prompt cannot exceed 2000 characters"],
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
    collection: "complaint_document_summaries",
  }
);

ComplaintDocumentSummarySchema.index({ complaint_id: 1, created_at: -1 });

export const ComplaintDocumentSummary: Model<IComplaintDocumentSummary> =
  mongoose.model<IComplaintDocumentSummary>(
    "ComplaintDocumentSummary",
    ComplaintDocumentSummarySchema
  );
