/**
 * One-time seed: ensure all notifiable event types exist in notification_settings
 * with enabled: true. Idempotent (upsert).
 * Run from Backened: npx ts-node src/scripts/seedNotificationSettings.ts
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import NotificationSettings from "../models/NotificationSettings";
import { NOTIFIABLE_EVENT_TYPES } from "../modules/notifications";
import { connectDatabase } from "../config/database";
import logger from "../config/logger";

dotenv.config();

async function seed(): Promise<void> {
  await connectDatabase();
  try {
    for (const event_type of NOTIFIABLE_EVENT_TYPES) {
      await NotificationSettings.findOneAndUpdate(
        { event_type },
        { $set: { enabled: true, updated_at: new Date() } },
        { upsert: true }
      );
    }
    logger.info(
      `Seeded ${NOTIFIABLE_EVENT_TYPES.length} notification settings`
    );
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((err) => {
  logger.error("Seed failed", err);
  process.exit(1);
});
