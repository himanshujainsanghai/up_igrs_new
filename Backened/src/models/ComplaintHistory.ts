/**
 * Complaint History Model
 * Tracks historical complaint counts for districts, subdistricts, and villages
 * Allows comparison between current and previous periods
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IComplaintHistory extends Document {
  // IDENTIFICATION
  entityType: "district" | "subdistrict" | "village"; // Type of entity
  entityCode: string; // District code, subdistrict LGD, or village LGD
  entityName: string; // Entity name for display

  // TIMESTAMP
  snapshotDate: Date; // Date when snapshot was taken
  period: "daily" | "weekly" | "monthly"; // Period type

  // COMPLAINT COUNTS
  totalComplaints: number; // Total complaints at snapshot time
  byStatus: {
    pending?: number;
    in_progress?: number;
    resolved?: number;
    rejected?: number;
  };
  byCategory: {
    roads?: number;
    water?: number;
    electricity?: number;
    documents?: number;
    health?: number;
    education?: number;
    other?: number;
  };

  // METADATA
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintHistorySchema = new Schema<IComplaintHistory>(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["district", "subdistrict", "village"],
      index: true,
    },
    entityCode: {
      type: String,
      required: true,
      index: true,
    },
    entityName: {
      type: String,
      required: true,
    },
    snapshotDate: {
      type: Date,
      required: true,
      index: true,
    },
    period: {
      type: String,
      required: true,
      enum: ["daily", "weekly", "monthly"],
      index: true,
    },
    totalComplaints: {
      type: Number,
      required: true,
      default: 0,
    },
    byStatus: {
      pending: { type: Number, default: 0 },
      in_progress: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
    },
    byCategory: {
      roads: { type: Number, default: 0 },
      water: { type: Number, default: 0 },
      electricity: { type: Number, default: 0 },
      documents: { type: Number, default: 0 },
      health: { type: Number, default: 0 },
      education: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
ComplaintHistorySchema.index({ entityType: 1, entityCode: 1, snapshotDate: -1 });
ComplaintHistorySchema.index({ entityType: 1, entityCode: 1, period: 1, snapshotDate: -1 });

const ComplaintHistory =
  mongoose.models.ComplaintHistory ||
  mongoose.model<IComplaintHistory>("ComplaintHistory", ComplaintHistorySchema);

export default ComplaintHistory;

