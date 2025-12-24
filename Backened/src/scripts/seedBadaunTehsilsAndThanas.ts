/**
 * Seed Badaun Tehsils and Thanas
 * Adds all Tehsils and Thanas from the official list
 */

import mongoose from "mongoose";
import { env } from "../config/env";
import logger from "../config/logger";
import SubDistrict from "../models/SubDistrict";
import Thana from "../models/Thana";

// Badaun District Information
const DISTRICT_NAME = "Budaun";
const DISTRICT_LGD = 134;
const STATE_NAME = "Uttar Pradesh";
const STATE_LGD = 9;

// Tehsil LGD codes mapping
const TEHSIL_LGD_MAP: Record<string, number> = {
  "Gunnaur": 778,
  "Dataganj": 783,
  "Badaun": 782,
  "Budaun": 782, // Alternate spelling
  "Bilsi": 780,
  "Bisauli": 779,
  "Sahaswan": 781,
  "Sahswan": 781, // Alternate spelling
};

// Tehsils and their Thanas data from the image
const TEHSILS_AND_THANAS = [
  // Gunnaur Tehsil
  { tehsil: "Gunnaur", thana: "Gunnaur" },
  { tehsil: "Gunnaur", thana: "Dhanari" },
  { tehsil: "Gunnaur", thana: "Rajpura" },
  
  // Dataganj Tehsil
  { tehsil: "Dataganj", thana: "Dataganj" },
  { tehsil: "Dataganj", thana: "Musajhag" },
  { tehsil: "Dataganj", thana: "Alapur" },
  { tehsil: "Dataganj", thana: "Usawan" },
  { tehsil: "Dataganj", thana: "Usaihat" },
  { tehsil: "Dataganj", thana: "Hazratpur" },
  { tehsil: "Dataganj", thana: "Binawar" },
  
  // Badaun Tehsil
  { tehsil: "Badaun", thana: "Civil Lines" },
  { tehsil: "Badaun", thana: "Kotwali" },
  { tehsil: "Badaun", thana: "Kaderchawk" },
  { tehsil: "Badaun", thana: "Binawar" },
  { tehsil: "Badaun", thana: "Kunwargaon" },
  { tehsil: "Badaun", thana: "Ujhani" },
  { tehsil: "Badaun", thana: "Musajhag" },
  { tehsil: "Badaun", thana: "Wazirganj" },
  { tehsil: "Badaun", thana: "Alapur" },
  
  // Bilsi Tehsil
  { tehsil: "Bilsi", thana: "Bilsi" },
  { tehsil: "Bilsi", thana: "Udheti" },
  { tehsil: "Bilsi", thana: "Islamnagar" },
  { tehsil: "Bilsi", thana: "Mujariya" },
  
  // Bisauli Tehsil
  { tehsil: "Bisauli", thana: "Bisauli" },
  { tehsil: "Bisauli", thana: "Faizganj Behta" },
  { tehsil: "Bisauli", thana: "Wazirganj" },
  { tehsil: "Bisauli", thana: "Islamnagar" },
  { tehsil: "Bisauli", thana: "Kunwargaon" },
  
  // Sahaswan Tehsil
  { tehsil: "Sahaswan", thana: "Sahaswan" },
  { tehsil: "Sahaswan", thana: "Zarifnagar" },
  { tehsil: "Sahaswan", thana: "Mujariya" },
];

async function seedTehsils() {
  logger.info("🌱 Seeding Badaun Tehsils...");
  
  const tehsils = [
    { name: "Gunnaur", lgd: 778 },
    { name: "Dataganj", lgd: 783 },
    { name: "Badaun", lgd: 782 },
    { name: "Bilsi", lgd: 780 },
    { name: "Bisauli", lgd: 779 },
    { name: "Sahaswan", lgd: 781 },
  ];

  for (const tehsil of tehsils) {
    try {
      const existing = await SubDistrict.findOne({
        subdistrictLgd: tehsil.lgd,
        districtLgd: DISTRICT_LGD,
      });

      if (existing) {
        // Update if exists
        await SubDistrict.updateOne(
          { subdistrictLgd: tehsil.lgd, districtLgd: DISTRICT_LGD },
          {
            subdistrictName: tehsil.name,
            districtName: DISTRICT_NAME,
            stateName: STATE_NAME,
            stateLgd: STATE_LGD,
          }
        );
        logger.info(`  ✓ Updated Tehsil: ${tehsil.name} (LGD: ${tehsil.lgd})`);
      } else {
        // Create if doesn't exist
        await SubDistrict.create({
          subdistrictName: tehsil.name,
          subdistrictLgd: tehsil.lgd,
          districtName: DISTRICT_NAME,
          districtLgd: DISTRICT_LGD,
          stateName: STATE_NAME,
          stateLgd: STATE_LGD,
          isGeocoded: false,
        });
        logger.info(`  ✓ Created Tehsil: ${tehsil.name} (LGD: ${tehsil.lgd})`);
      }
    } catch (error: any) {
      logger.error(`  ✗ Error processing Tehsil ${tehsil.name}: ${error.message}`);
    }
  }
}

async function seedThanas() {
  logger.info("🌱 Seeding Badaun Thanas (Police Stations)...");
  
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of TEHSILS_AND_THANAS) {
    try {
      const tehsilLgd = TEHSIL_LGD_MAP[item.tehsil];
      
      if (!tehsilLgd) {
        logger.warn(`  ⚠️  Unknown Tehsil: ${item.tehsil}, skipping Thana: ${item.thana}`);
        skipped++;
        continue;
      }

      // Check if Thana already exists
      const existing = await Thana.findOne({
        thanaName: item.thana,
        tehsilName: item.tehsil,
        districtLgd: DISTRICT_LGD,
      });

      if (existing) {
        // Update if exists
        await Thana.updateOne(
          { _id: existing._id },
          {
            tehsilLgd: tehsilLgd,
            districtName: DISTRICT_NAME,
            districtLgd: DISTRICT_LGD,
            stateName: STATE_NAME,
            stateLgd: STATE_LGD,
          }
        );
        updated++;
        logger.info(`  ✓ Updated Thana: ${item.thana} (Tehsil: ${item.tehsil})`);
      } else {
        // Create if doesn't exist
        await Thana.create({
          thanaName: item.thana,
          tehsilName: item.tehsil,
          tehsilLgd: tehsilLgd,
          districtName: DISTRICT_NAME,
          districtLgd: DISTRICT_LGD,
          stateName: STATE_NAME,
          stateLgd: STATE_LGD,
          isGeocoded: false,
        });
        created++;
        logger.info(`  ✓ Created Thana: ${item.thana} (Tehsil: ${item.tehsil})`);
      }
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error
        logger.warn(`  ⚠️  Duplicate Thana: ${item.thana} (Tehsil: ${item.tehsil}), skipping`);
        skipped++;
      } else {
        logger.error(`  ✗ Error processing Thana ${item.thana}: ${error.message}`);
        skipped++;
      }
    }
  }

  logger.info(`\n📊 Summary:`);
  logger.info(`  Created: ${created} Thanas`);
  logger.info(`  Updated: ${updated} Thanas`);
  logger.info(`  Skipped: ${skipped} Thanas`);
  logger.info(`  Total: ${TEHSILS_AND_THANAS.length} Thanas`);
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI);
    logger.info("✅ Connected to MongoDB");

    // Seed Tehsils
    await seedTehsils();
    
    // Seed Thanas
    await seedThanas();

    logger.info("\n✅ Seeding completed successfully!");
  } catch (error: any) {
    logger.error(`❌ Error seeding data: ${error.message}`);
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

export { seedTehsils, seedThanas };

