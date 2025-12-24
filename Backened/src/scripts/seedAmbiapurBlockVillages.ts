/**
 * Seed Ambiapur Block Villages
 * Adds all villages from Ambiapur block with Panchayat information
 */

import mongoose from "mongoose";
import { env } from "../config/env";
import logger from "../config/logger";
import Village from "../models/Village";
import Demographics from "../models/Demographics";

// Badaun District Information
const DISTRICT_NAME = "Budaun";
const DISTRICT_LGD = 134;
const STATE_NAME = "Uttar Pradesh";
const STATE_LGD = 9;

// Need to determine which Tehsil Ambiapur block belongs to
// Based on common patterns, Ambiapur is likely in Badaun or Bilsi tehsil
// We'll check existing data or use Badaun as default
const DEFAULT_TEHSIL = "Badaun";
const DEFAULT_TEHSIL_LGD = 782;

// Villages from Ambiapur Block (from the image)
const AMBIAPUR_VILLAGES = [
  { panchayat: "", villageHindi: "भागरपुर सागरपुर", villageEnglish: "Bagarpur Sagarpur" },
  { panchayat: "", villageHindi: "भतरी गोर्वधनपुर", villageEnglish: "Bhatri Govardhanpur" },
  { panchayat: "", villageHindi: "हरगनपुर", villageEnglish: "Harganpur" },
  { panchayat: "", villageHindi: "खेरा", villageEnglish: "Kherha" },
  { panchayat: "", villageHindi: "खुलैट", villageEnglish: "Khulet" },
  { panchayat: "", villageHindi: "कुदारनी", villageEnglish: "Kurdarni" },
  { panchayat: "", villageHindi: "रुदैना धनधोटी", villageEnglish: "Rudeina Ghangholi" },
  { panchayat: "अकौली", villageHindi: "अकौली", villageEnglish: "Akauli" },
  { panchayat: "अकौली", villageHindi: "विचौला", villageEnglish: "Bichaula" },
  { panchayat: "अगौल", villageHindi: "अगौल", villageEnglish: "Angaul" },
  { panchayat: "अम्वियापुर", villageHindi: "अम्वियापुर", villageEnglish: "Ambiapur" },
  { panchayat: "उलैया", villageHindi: "उलईया", villageEnglish: "Ulikhya" },
  { panchayat: "ओया", villageHindi: "औया", villageEnglish: "Oya" },
  { panchayat: "खेडापूर्वी", villageHindi: "खेडा पूर्वी", villageEnglish: "KHERA PURVI" },
  { panchayat: "खैरी", villageHindi: "खेरी", villageEnglish: "Khairi" },
  { panchayat: "खौसरा", villageHindi: "खौसेरा", villageEnglish: "Khausara" },
  { panchayat: "गढौली", villageHindi: "गठौली", villageEnglish: "Garhauli" },
  { panchayat: "गुदनी", villageHindi: "गुदनी", villageEnglish: "Gudhni" },
  { panchayat: "जरसैनी", villageHindi: "जरसैनी", villageEnglish: "Jarsaini" },
  { panchayat: "जिनौरा", villageHindi: "जिनौरा", villageEnglish: "Jinaura" },
  { panchayat: "डडमर", villageHindi: "डडूमर", villageEnglish: "Dhadoomar" },
  { panchayat: "डडमर", villageHindi: "करनपुर", villageEnglish: "Karanpur" },
  { panchayat: "दुधौनी", villageHindi: "धुदनी", villageEnglish: "Dudhani" },
  { panchayat: "दवहारी", villageHindi: "दविहारी", villageEnglish: "Dabihari" },
  { panchayat: "दीननगर शेखपुर", villageHindi: "दीननगर शेखपुर", villageEnglish: "Din Nagar Sheikhpur" },
  { panchayat: "धनौली", villageHindi: "धनौली", villageEnglish: "Dhanauli" },
  { panchayat: "धनौली", villageHindi: "सदरापुर", villageEnglish: "Sadarpur" },
  { panchayat: "धनौली", villageHindi: "सूरजपुर", villageEnglish: "Surajpur" },
  { panchayat: "नगला डल्लू", villageHindi: "नगला डल्लू", villageEnglish: "Nagla Dallu" },
  { panchayat: "नगला तरउ", villageHindi: "फतेहनगला", villageEnglish: "Fateh Nagla" },
  { panchayat: "नगला तरउ", villageHindi: "नगला तरऊ", villageEnglish: "Nagla Tarau" },
  { panchayat: "नागरझूना", villageHindi: "नागरझूना", villageEnglish: "Nagarjhoona" },
];

async function findTehsilForAmbiapur() {
  // Try to find Ambiapur in existing demographics data
  const ambiapurData = await Demographics.findOne({
    areaName: { $regex: /Ambiapur|अम्वियापुर/i },
    districtLgd: DISTRICT_LGD,
    level: "village",
  });

  if (ambiapurData && ambiapurData.subdistrictLgd) {
    return {
      name: ambiapurData.subdistrict || DEFAULT_TEHSIL,
      lgd: ambiapurData.subdistrictLgd || DEFAULT_TEHSIL_LGD,
    };
  }

  // Default to Badaun tehsil
  return {
    name: DEFAULT_TEHSIL,
    lgd: DEFAULT_TEHSIL_LGD,
  };
}

async function seedVillages() {
  logger.info("🌱 Seeding Ambiapur Block Villages...");
  
  const tehsil = await findTehsilForAmbiapur();
  logger.info(`📍 Using Tehsil: ${tehsil.name} (LGD: ${tehsil.lgd})`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of AMBIAPUR_VILLAGES) {
    try {
      const villageName = item.villageEnglish;
      
      // Check if village exists in Village model
      const existingVillage = await Village.findOne({
        villageName: { $regex: new RegExp(`^${villageName}$`, "i") },
        districtLgd: DISTRICT_LGD,
        subdistrictLgd: tehsil.lgd,
      });

      // Generate a temporary LGD code if not found
      // Format: districtLgd + subdistrictLgd + sequential number
      const lgdCode = existingVillage?.lgdCode || 
        `${DISTRICT_LGD}${tehsil.lgd}${String(AMBIAPUR_VILLAGES.indexOf(item) + 1).padStart(4, '0')}`;

      if (existingVillage) {
        // Update existing village
        await Village.updateOne(
          { _id: existingVillage._id },
          {
            villageName: villageName,
            subdistrictName: tehsil.name,
            subdistrictLgd: tehsil.lgd,
            districtName: DISTRICT_NAME,
            districtLgd: DISTRICT_LGD,
            stateName: STATE_NAME,
            stateLgd: STATE_LGD,
            blockName: "Ambiapur",
            panchayatName: item.panchayat || undefined,
          }
        );
        updated++;
        logger.info(`  ✓ Updated Village: ${villageName}`);
      } else {
        // Create new village
        await Village.create({
          villageName: villageName,
          lgdCode: lgdCode,
          subdistrictName: tehsil.name,
          subdistrictLgd: tehsil.lgd,
          districtName: DISTRICT_NAME,
          districtLgd: DISTRICT_LGD,
          stateName: STATE_NAME,
          stateLgd: STATE_LGD,
          blockName: "Ambiapur",
          panchayatName: item.panchayat || undefined,
          isGeocoded: false,
        });
        created++;
        logger.info(`  ✓ Created Village: ${villageName}`);
      }

      // Also check/update in Demographics
      const existingDemographics = await Demographics.findOne({
        areaName: { $regex: new RegExp(`^${villageName}$`, "i") },
        districtLgd: DISTRICT_LGD,
        level: "village",
      });

      if (!existingDemographics) {
        // Create basic demographics entry (without population data)
        await Demographics.create({
          state: STATE_NAME,
          stateLgd: STATE_LGD,
          district: DISTRICT_NAME,
          districtLgd: DISTRICT_LGD,
          subdistrict: tehsil.name,
          subdistrictLgd: tehsil.lgd,
          townVillageWard: villageName,
          townVillageCode: lgdCode,
          level: "village",
          residence: "rural",
          areaName: villageName,
          censusYear: 2011,
          totalHouseholds: 0,
          totalPopulation: 0,
          malePopulation: 0,
          femalePopulation: 0,
          childPopulation: 0,
          childMale: 0,
          childFemale: 0,
          scPopulation: 0,
          scMale: 0,
          scFemale: 0,
          stPopulation: 0,
          stMale: 0,
          stFemale: 0,
          isGeocoded: false,
        });
      }
    } catch (error: any) {
      if (error.code === 11000) {
        logger.warn(`  ⚠️  Duplicate village: ${item.villageEnglish}, skipping`);
        skipped++;
      } else {
        logger.error(`  ✗ Error processing village ${item.villageEnglish}: ${error.message}`);
        skipped++;
      }
    }
  }

  logger.info(`\n📊 Summary:`);
  logger.info(`  Created: ${created} Villages`);
  logger.info(`  Updated: ${updated} Villages`);
  logger.info(`  Skipped: ${skipped} Villages`);
  logger.info(`  Total: ${AMBIAPUR_VILLAGES.length} Villages`);
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI);
    logger.info("✅ Connected to MongoDB");

    // Seed Villages
    await seedVillages();

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

export { seedVillages };

