import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IOfficerAttachment extends Document {
  id: string;
  complaint_id: string;
  note_id?: string;
  attachment_type: "inward" | "outward";
  file_url: string;
  file_name: string;
  file_type?: string;
  uploaded_by?: string;
  created_at: Date;
}

const OfficerAttachmentSchema = new Schema<IOfficerAttachment>(
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
    note_id: {
      type: String,
      index: true,
    },
    attachment_type: {
      type: String,
      required: [true, "Attachment type is required"],
      enum: {
        values: ["inward", "outward"],
        message: "{VALUE} is not a valid attachment type",
      },
      index: true,
    },
    file_url: {
      type: String,
      required: [true, "File URL is required"],
      validate: {
        validator: (v: string) => {
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: "Invalid file URL",
      },
    },
    file_name: {
      type: String,
      required: [true, "File name is required"],
      maxlength: [255, "File name cannot exceed 255 characters"],
      trim: true,
    },
    file_type: {
      type: String,
      trim: true,
    },
    uploaded_by: {
      type: String,
      maxlength: [100, "Uploader name cannot exceed 100 characters"],
      trim: true,
      index: true,
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
    // Reuse existing complaint documents collection to avoid creating new collections
    collection: "complaint_documents",
  }
);

OfficerAttachmentSchema.index({ complaint_id: 1, created_at: -1 });
OfficerAttachmentSchema.index({ complaint_id: 1, note_id: 1, created_at: -1 });

export const OfficerAttachment: Model<IOfficerAttachment> =
  mongoose.model<IOfficerAttachment>("OfficerAttachment", OfficerAttachmentSchema);

