/**
 * NOTIFICATION SETTINGS MODEL
 * Admin-controlled: which event types trigger notifications (on/off).
 * Only admin can read/update. Applied globally (admins get all events when on;
 * officers get only officer-relevant events when on).
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotificationSettings extends Document {
  event_type: string; // ComplaintTimelineEventType value
  enabled: boolean;
  updated_at: Date;
}

const NotificationSettingsSchema = new Schema<INotificationSettings>(
  {
    event_type: {
      type: String,
      required: [true, "Event type is required"],
      unique: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
    collection: "notification_settings",
    strict: true,
  }
);

NotificationSettingsSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

const NotificationSettings: Model<INotificationSettings> =
  mongoose.models.NotificationSettings ||
  mongoose.model<INotificationSettings>(
    "NotificationSettings",
    NotificationSettingsSchema
  );

export default NotificationSettings;
