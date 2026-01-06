import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IOfficerNote extends Document {
  id: string;
  complaint_id: string;
  type: "inward" | "outward";
  note: string;
  officer_id?: string;
  attachments?: string[];
  created_at: Date;
}

const OfficerNoteSchema = new Schema<IOfficerNote>(
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
    type: {
      type: String,
      required: [true, "Note type is required"],
      enum: {
        values: ["inward", "outward"],
        message: "{VALUE} is not a valid note type",
      },
      index: true,
    },
    note: {
      type: String,
      required: [true, "Note is required"],
      minlength: [5, "Note must be at least 5 characters"],
      maxlength: [2000, "Note cannot exceed 2000 characters"],
    },
    officer_id: {
      type: String,
      trim: true,
      index: true,
    },
    attachments: [
      {
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
          message: "Invalid attachment URL",
        },
      },
    ],
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    // Reuse existing complaint notes collection to avoid creating new collections
    collection: "complaint_notes",
  }
);

OfficerNoteSchema.index({ complaint_id: 1, type: 1, created_at: -1 });
OfficerNoteSchema.index({ officer_id: 1, created_at: -1 });

export const OfficerNote: Model<IOfficerNote> = mongoose.model<IOfficerNote>(
  "OfficerNote",
  OfficerNoteSchema
);
