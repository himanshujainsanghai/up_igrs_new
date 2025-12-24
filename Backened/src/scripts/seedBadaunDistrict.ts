/**
 * Seed Badaun District Information
 * 
 * Adds district-level demographic and geographic data
 */

import District from "../models/District";
import logger from "../config/logger";
import connectDatabase from "../config/database";

/**
 * Badaun district information
 * Source: Census of India
 */
const BADAUN_DISTRICT_DATA = {
  districtName: "Budaun",
  districtLgd: 134,
  stateName: "Uttar Pradesh",
  stateLgd: 9,
  area: 4234.21, // Sq. Km.
  population: 3129000, // 31,29,000
  malePopulation: 1671000, // 16,71,000
  femalePopulation: 1458000, // 14,58,000
  language: "Hindi",
  totalVillages: 1698, // Official count (we have 1715 in database)
  headquarters: "Budaun",
};

async function seedBadaunDistrict() {
  try {
    await connectDatabase();

    logger.info("Starting to seed Badaun district information");

    // Check if already exists
    const existing = await District.findOne({ districtLgd: 134 });

    if (existing) {
      // Update existing
      await District.findOneAndUpdate(
        { districtLgd: 134 },
        BADAUN_DISTRICT_DATA,
        { new: true }
      );
      logger.info("✓ Updated Badaun district information");
    } else {
      // Create new
      await District.create(BADAUN_DISTRICT_DATA);
      logger.info("✓ Created Badaun district information");
    }

    logger.info("\n=== District Data ===");
    logger.info(`Name: ${BADAUN_DISTRICT_DATA.districtName}`);
    logger.info(`LGD Code: ${BADAUN_DISTRICT_DATA.districtLgd}`);
    logger.info(`Area: ${BADAUN_DISTRICT_DATA.area} Sq. Km.`);
    logger.info(`Population: ${BADAUN_DISTRICT_DATA.population.toLocaleString()}`);
    logger.info(`Male: ${BADAUN_DISTRICT_DATA.malePopulation.toLocaleString()}`);
    logger.info(`Female: ${BADAUN_DISTRICT_DATA.femalePopulation.toLocaleString()}`);
    logger.info(`Language: ${BADAUN_DISTRICT_DATA.language}`);
    logger.info(`Villages: ${BADAUN_DISTRICT_DATA.totalVillages}`);
    logger.info("=====================\n");

    logger.info("District data seeded successfully!");
    process.exit(0);
  } catch (error: any) {
    logger.error("Error seeding district data:", error);
    process.exit(1);
  }
}

seedBadaunDistrict();

