/**
 * NOTIFICATION MODEL
 * In-app notifications per user. Complaint-isolated: every notification is scoped to
 * one complaint_id and one event_type, so listing/grouping by complaint is trivial.
 * One row per (user_id, timeline_event) for delivery and read state.
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface INotification extends Document {
  id: string;
  user_id: string; // User.id (UUID) - recipient
  event_type: string; // ComplaintTimelineEventType value
  complaint_id: string; // Complaint isolation: always set; enables filter/group by complaint
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  read_at?: Date;
  timeline_event_id?: string; // Link to ComplaintTimelineEvent.id (idempotency/debug)
  created_at: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
      index: true,
    },
    user_id: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    event_type: {
      type: String,
      required: [true, "Event type is required"],
      index: true,
    },
    complaint_id: {
      type: String,
      required: [true, "Complaint ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
    },
    body: {
      type: String,
      default: "",
      maxlength: [2000, "Body cannot exceed 2000 characters"],
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    read_at: {
      type: Date,
      default: null,
    },
    timeline_event_id: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
    collection: "notifications",
    strict: true,
  }
);

// List by user, newest first; complaint-isolated queries
NotificationSchema.index({ user_id: 1, created_at: -1 });
NotificationSchema.index({ user_id: 1, read_at: 1 });
NotificationSchema.index({ user_id: 1, complaint_id: 1, created_at: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
