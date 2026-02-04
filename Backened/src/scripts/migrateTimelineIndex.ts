/**
 * One-time migration: drop old complaint_timeline_events unique index that caused
 * E11000 when multiple events without idempotency_key were inserted (e.g. officer_unassigned).
 * The new partial unique index is defined in ComplaintTimelineEvent model and will be
 * created on next app start / syncIndexes.
 *
 * Run with: npx ts-node src/scripts/migrateTimelineIndex.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import logger from "../config/logger";

dotenv.config();

const OLD_INDEX_NAME = "complaint_id_1_idempotency_key_1";
const COLLECTION = "complaint_timeline_events";

async function run() {
  await connectDatabase();
  const coll = mongoose.connection.db?.collection(COLLECTION);
  if (!coll) {
    logger.error("Collection not found");
    process.exit(1);
  }
  try {
    const indexes = await coll.indexes();
    const hasOld = indexes.some(
      (idx: { name: string }) => idx.name === OLD_INDEX_NAME
    );
    if (!hasOld) {
      logger.info(`Index ${OLD_INDEX_NAME} not found; nothing to drop.`);
      process.exit(0);
    }
    await coll.dropIndex(OLD_INDEX_NAME);
    logger.info(
      `Dropped index ${OLD_INDEX_NAME}. Restart the app to create the new partial index.`
    );
  } catch (err: unknown) {
    if ((err as { code?: number })?.code === 27) {
      logger.info("Index already does not exist.");
    } else {
      logger.error("Migration failed:", err);
      process.exit(1);
    }
  } finally {
    await mongoose.disconnect();
  }
}

run();
