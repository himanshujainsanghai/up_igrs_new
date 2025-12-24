/**
 * Geocode Ambiapur Block Villages
 * Geocodes all villages from Ambiapur block so they appear on the map
 */

import mongoose from "mongoose";
import { env } from "../config/env";
import logger from "../config/logger";
import Village from "../models/Village";
import { geocodeVillageNominatim } from "../services/nominatim-geocoding.service";

// Badaun District Information
const DISTRICT_NAME = "Budaun";
const DISTRICT_LGD = 134;
const STATE_NAME = "Uttar Pradesh";

async function geocodeVillages() {
  logger.info("🌍 Geocoding Ambiapur Block Villages...");
  
  // Find all villages in Ambiapur block that are not geocoded
  // Also check by village names if blockName is not set
  const ambiapurVillageNames = [
    "Bagarpur Sagarpur", "Bhatri Govardhanpur", "Harganpur", "Kherha", "Khulet",
    "Kurdarni", "Rudeina Ghangholi", "Akauli", "Bichaula", "Angaul", "Ambiapur",
    "Ulikhya", "Oya", "KHERA PURVI", "Khairi", "Khausara", "Garhauli", "Gudhni",
    "Jarsaini", "Jinaura", "Dhadoomar", "Karanpur", "Dudhani", "Dabihari",
    "Din Nagar Sheikhpur", "Dhanauli", "Sadarpur", "Surajpur", "Nagla Dallu",
    "Fateh Nagla", "Nagla Tarau", "Nagarjhoona"
  ];
  
  const villages = await Village.find({
    districtLgd: DISTRICT_LGD,
    $or: [
      { blockName: "Ambiapur" },
      { villageName: { $in: ambiapurVillageNames } },
    ],
    $and: [
      {
        $or: [
          { isGeocoded: false },
          { latitude: { $exists: false } },
          { longitude: { $exists: false } },
        ],
      },
    ],
  });

  logger.info(`Found ${villages.length} villages to geocode`);

  let geocoded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < villages.length; i++) {
    const village = villages[i];
    
    try {
      // Skip if already geocoded
      if (village.isGeocoded && village.latitude && village.longitude) {
        logger.info(`  ⏭️  Skipping ${village.villageName} (already geocoded)`);
        skipped++;
        continue;
      }

      logger.info(`  🔍 Geocoding ${i + 1}/${villages.length}: ${village.villageName}...`);

      // Geocode using Nominatim (free)
      const result = await geocodeVillageNominatim(
        village.villageName,
        village.subdistrictName,
        village.districtName,
        STATE_NAME
      );

      if (result) {
        // Update village with coordinates
        await Village.updateOne(
          { _id: village._id },
          {
            latitude: result.latitude,
            longitude: result.longitude,
            isGeocoded: true,
          }
        );
        geocoded++;
        logger.info(`  ✓ Geocoded: ${village.villageName} → (${result.latitude}, ${result.longitude})`);
      } else {
        failed++;
        logger.warn(`  ✗ Failed to geocode: ${village.villageName}`);
      }

      // Rate limiting: Nominatim requires 1 request per second
      if (i < villages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1100)); // Wait 1.1 seconds
      }
    } catch (error: any) {
      failed++;
      logger.error(`  ✗ Error geocoding ${village.villageName}: ${error.message}`);
    }
  }

  logger.info(`\n📊 Geocoding Summary:`);
  logger.info(`  Geocoded: ${geocoded} villages`);
  logger.info(`  Failed: ${failed} villages`);
  logger.info(`  Skipped: ${skipped} villages`);
  logger.info(`  Total: ${villages.length} villages`);
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI);
    logger.info("✅ Connected to MongoDB");

    // Geocode villages
    await geocodeVillages();

    logger.info("\n✅ Geocoding completed!");
  } catch (error: any) {
    logger.error(`❌ Error geocoding villages: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info("✅ Disconnected from MongoDB");
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { geocodeVillages };

