/**
 * Script to import Badaun villages from LGD data
 * 
 * Usage:
 * 1. Download village list from https://lgdirectory.gov.in/
 * 2. Convert CSV to JSON and place data in BADAUN_VILLAGES array below
 * 3. Run: npm run ts-node src/scripts/importBadaunVillages.ts
 */

import Village from "../models/Village";
import logger from "../config/logger";
import connectDatabase from "../config/database";

interface LGDVillage {
  villageName: string;
  lgdCode: string;
  subdistrictName: string;
  subdistrictLgd: number;
}

/**
 * Badaun villages data from LGD
 * 
 * INSTRUCTIONS:
 * 1. Go to https://lgdirectory.gov.in/
 * 2. Select State: Uttar Pradesh (LGD: 9)
 * 3. Select District: Budaun (LGD: 134)
 * 4. Download village directory as CSV
 * 5. Convert CSV to JSON format below
 * 
 * LGD Codes for Badaun Sub-districts:
 * - Bilsi: 780
 * - Bisauli: 779
 * - Budaun: 782
 * - Dataganj: 783
 * - Sahaswan: 781
 */
const BADAUN_VILLAGES: LGDVillage[] = [
  // Example entries - Replace with actual LGD data
  { 
    villageName: "Mogar", 
    lgdCode: "134001", 
    subdistrictName: "Budaun", 
    subdistrictLgd: 782 
  },
  { 
    villageName: "Padauliya", 
    lgdCode: "134002", 
    subdistrictName: "Budaun", 
    subdistrictLgd: 782 
  },
  { 
    villageName: "Dahemi", 
    lgdCode: "134003", 
    subdistrictName: "Budaun", 
    subdistrictLgd: 782 
  },
  { 
    villageName: "Kasimpur", 
    lgdCode: "134004", 
    subdistrictName: "Budaun", 
    subdistrictLgd: 782 
  },
  // Add more villages from LGD CSV here...
  // Example for other sub-districts:
  { 
    villageName: "Bilsi Town", 
    lgdCode: "134101", 
    subdistrictName: "Bilsi", 
    subdistrictLgd: 780 
  },
  { 
    villageName: "Bisauli Town", 
    lgdCode: "134201", 
    subdistrictName: "Bisauli", 
    subdistrictLgd: 779 
  },
  { 
    villageName: "Dataganj Town", 
    lgdCode: "134301", 
    subdistrictName: "Dataganj", 
    subdistrictLgd: 783 
  },
  { 
    villageName: "Sahaswan Town", 
    lgdCode: "134401", 
    subdistrictName: "Sahaswan", 
    subdistrictLgd: 781 
  },
];

/**
 * Import villages into database
 */
async function importVillages() {
  try {
    // Connect to database
    await connectDatabase();

    logger.info(`Starting import of ${BADAUN_VILLAGES.length} villages for Badaun district`);

    let created = 0;
    let existing = 0;

    for (const villageData of BADAUN_VILLAGES) {
      try {
        // Check if village already exists
        const existingVillage = await Village.findOne({ lgdCode: villageData.lgdCode });

        if (existingVillage) {
          existing++;
          logger.info(`- Already exists: ${existingVillage.villageName} (LGD: ${existingVillage.lgdCode})`);
        } else {
          // Create new village
          const village = await Village.create({
            ...villageData,
            districtName: "Budaun",
            districtLgd: 134,
            stateName: "Uttar Pradesh",
            stateLgd: 9,
            isGeocoded: false,
          });
          created++;
          logger.info(`✓ Created village: ${village.villageName} (LGD: ${village.lgdCode})`);
        }
      } catch (error: any) {
        logger.error(`Error importing village ${villageData.villageName}:`, error.message);
      }
    }

    logger.info("\n=== Import Summary ===");
    logger.info(`Total processed: ${BADAUN_VILLAGES.length}`);
    logger.info(`Newly created: ${created}`);
    logger.info(`Already existing: ${existing}`);
    logger.info("======================\n");

    logger.info("Village import completed successfully");
    logger.info("\nNext steps:");
    logger.info("1. Run geocoding to add coordinates: POST /api/v1/villages/geocode");
    logger.info("2. Check statistics: GET /api/v1/villages/badaun/stats");
    logger.info("3. View on map: Open Badaun Heat Map page in frontend");

    process.exit(0);
  } catch (error: any) {
    logger.error("Error importing villages:", error);
    process.exit(1);
  }
}

// Run the import
importVillages();

