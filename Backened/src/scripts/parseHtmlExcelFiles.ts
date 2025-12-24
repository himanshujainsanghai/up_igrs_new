/**
 * Parse HTML-based Excel Files
 * These files are HTML exports, not true Excel files
 * We need to parse the HTML to extract the table data
 */

import * as XLSX from "xlsx";
import path from "path";
import mongoose from "mongoose";
import { env } from "../config/env";
import logger from "../config/logger";
import Village from "../models/Village";
import SubDistrict from "../models/SubDistrict";
import Thana from "../models/Thana";

const SAMPLE_DATA_DIR = path.join(__dirname, "../../sample-data");
const DISTRICT_LGD = 134;
const STATE_LGD = 9;

// Tehsil name to LGD mapping
const TEHSIL_LGD_MAP: Record<string, number> = {
  "Gunnaur": 778,
  "Dataganj": 783,
  "Badaun": 782,
  "Budaun": 782,
  "Bilsi": 780,
  "Bisauli": 779,
  "Sahaswan": 781,
  "Shahswan": 781,
};

function parseHtmlTable(htmlString: string): any[] {
  // Extract table rows from HTML
  const rowRegex = /<TR[^>]*>(.*?)<\/TR>/gis;
  const rows: any[] = [];
  let match;
  
  while ((match = rowRegex.exec(htmlString)) !== null) {
    const rowHtml = match[1];
    const cellRegex = /<Td[^>]*>(.*?)<\/Td>/gis;
    const cells: string[] = [];
    let cellMatch;
    
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      let cellContent = cellMatch[1];
      // Remove HTML tags and decode entities
      cellContent = cellContent
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      cells.push(cellContent);
    }
    
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  
  return rows;
}

function extractDataFromHtmlExcel(filePath: string): any[] {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Get the first cell which contains HTML
    const firstCell = sheet['A1'];
    if (!firstCell || !firstCell.v) {
      return [];
    }
    
    const htmlString = String(firstCell.v);
    const rows = parseHtmlTable(htmlString);
    
    if (rows.length < 2) {
      return [];
    }
    
    // First row is header
    const headers = rows[0].map((h: string) => h.toLowerCase().trim());
    const data: any[] = [];
    
    // Process data rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;
      
      const rowData: any = {};
      headers.forEach((header: string, idx: number) => {
        if (row[idx]) {
          rowData[header] = row[idx].trim();
        }
      });
      
      // Only add if row has meaningful data
      if (Object.keys(rowData).length > 0) {
        data.push(rowData);
      }
    }
    
    return data;
  } catch (error: any) {
    logger.error(`Error parsing ${filePath}: ${error.message}`);
    return [];
  }
}

async function mapBlockWiseGramData() {
  logger.info("\n📊 Mapping BlockWiseGram_Master.xls...");
  
  const filePath = path.join(SAMPLE_DATA_DIR, 'BlockWiseGram_Master.xls');
  const data = extractDataFromHtmlExcel(filePath);
  
  logger.info(`  Found ${data.length} rows`);
  
  let mapped = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of data) {
    try {
      const blockName = row['block'] || row['block name'];
      const panchayatName = row['panchayat (english)'] || row['panchayat'];
      const gramEnglish = row['gram (english)'] || row['gram(english)'];
      
      if (!gramEnglish) {
        skipped++;
        continue;
      }
      
      // Find village by name
      const village = await Village.findOne({
        districtLgd: DISTRICT_LGD,
        villageName: { $regex: new RegExp(`^${gramEnglish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      
      if (village) {
        const update: any = {};
        if (blockName && !village.blockName) {
          update.blockName = String(blockName).trim();
        }
        if (panchayatName && !village.panchayatName) {
          update.panchayatName = String(panchayatName).trim();
        }
        
        if (Object.keys(update).length > 0) {
          await Village.updateOne({ _id: village._id }, update);
          mapped++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    } catch (error: any) {
      errors++;
      logger.warn(`  Error processing row: ${error.message}`);
    }
  }
  
  logger.info(`  ✅ Mapped: ${mapped}, Skipped: ${skipped}, Errors: ${errors}`);
  return { mapped, skipped, errors };
}

async function mapTehsilWiseGramData() {
  logger.info("\n📊 Mapping TehsilWiseGram_Master.xls...");
  
  const filePath = path.join(SAMPLE_DATA_DIR, 'TehsilWiseGram_Master.xls');
  const data = extractDataFromHtmlExcel(filePath);
  
  logger.info(`  Found ${data.length} rows`);
  
  let mapped = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of data) {
    try {
      const tehsilName = row['tehsil'] || row['tehsil name'];
      const gramEnglish = row['gram (english)'] || row['gram(english)'];
      
      if (!gramEnglish) {
        skipped++;
        continue;
      }
      
      // Find village by name and tehsil
      const village = await Village.findOne({
        districtLgd: DISTRICT_LGD,
        villageName: { $regex: new RegExp(`^${gramEnglish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        ...(tehsilName ? { subdistrictName: { $regex: new RegExp(`^${String(tehsilName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } } : {}),
      });
      
      if (village) {
        // Update tehsil if it doesn't match
        if (tehsilName) {
          const tehsilLgd = TEHSIL_LGD_MAP[String(tehsilName).trim()];
          if (tehsilLgd && village.subdistrictLgd !== tehsilLgd) {
            const tehsil = await SubDistrict.findOne({ subdistrictLgd: tehsilLgd });
            if (tehsil) {
              await Village.updateOne(
                { _id: village._id },
                { subdistrictName: tehsil.subdistrictName, subdistrictLgd: tehsilLgd }
              );
              mapped++;
            } else {
              skipped++;
            }
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    } catch (error: any) {
      errors++;
      logger.warn(`  Error processing row: ${error.message}`);
    }
  }
  
  logger.info(`  ✅ Mapped: ${mapped}, Skipped: ${skipped}, Errors: ${errors}`);
  return { mapped, skipped, errors };
}

async function mapGramMasterData() {
  logger.info("\n📊 Mapping Gram_Master.xls...");
  
  const filePath = path.join(SAMPLE_DATA_DIR, 'Gram_Master.xls');
  const data = extractDataFromHtmlExcel(filePath);
  
  logger.info(`  Found ${data.length} rows`);
  
  let mapped = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of data) {
    try {
      const tehsilName = row['tehsil'] || row['tehsil '];
      const blockName = row['block'] || row['block '];
      const panchayatName = row['gram panchayat'];
      const gramEnglish = row['gram (english)'] || row['gram(english)'];
      
      if (!gramEnglish) {
        skipped++;
        continue;
      }
      
      // Find village by name
      const village = await Village.findOne({
        districtLgd: DISTRICT_LGD,
        villageName: { $regex: new RegExp(`^${gramEnglish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      
      if (village) {
        const update: any = {};
        if (blockName && !village.blockName) {
          update.blockName = String(blockName).trim();
        }
        if (panchayatName && !village.panchayatName) {
          update.panchayatName = String(panchayatName).trim();
        }
        if (tehsilName) {
          const tehsilLgd = TEHSIL_LGD_MAP[String(tehsilName).trim()];
          if (tehsilLgd && village.subdistrictLgd !== tehsilLgd) {
            const tehsil = await SubDistrict.findOne({ subdistrictLgd: tehsilLgd });
            if (tehsil) {
              update.subdistrictName = tehsil.subdistrictName;
              update.subdistrictLgd = tehsilLgd;
            }
          }
        }
        
        if (Object.keys(update).length > 0) {
          await Village.updateOne({ _id: village._id }, update);
          mapped++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    } catch (error: any) {
      errors++;
      logger.warn(`  Error processing row: ${error.message}`);
    }
  }
  
  logger.info(`  ✅ Mapped: ${mapped}, Skipped: ${skipped}, Errors: ${errors}`);
  return { mapped, skipped, errors };
}

async function mapThanaData() {
  logger.info("\n📊 Mapping Thana_Master.xls...");
  
  const filePath = path.join(SAMPLE_DATA_DIR, 'Thana_Master.xls');
  const data = extractDataFromHtmlExcel(filePath);
  
  logger.info(`  Found ${data.length} rows`);
  
  let mapped = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of data) {
    try {
      const tehsilName = row['tehsil'] || row['tehsil name'];
      const thanaName = row['thana'] || row['thana name'];
      
      if (!tehsilName || !thanaName) {
        skipped++;
        continue;
      }
      
      // Check if thana exists
      const existing = await Thana.findOne({
        districtLgd: DISTRICT_LGD,
        thanaName: { $regex: new RegExp(`^${String(thanaName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        tehsilName: { $regex: new RegExp(`^${String(tehsilName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      
      if (existing) {
        skipped++;
      } else {
        // Find tehsil LGD
        const tehsilLgd = TEHSIL_LGD_MAP[String(tehsilName).trim()];
        if (tehsilLgd) {
          await Thana.create({
            thanaName: String(thanaName).trim(),
            tehsilName: String(tehsilName).trim(),
            tehsilLgd: tehsilLgd,
            districtName: 'Budaun',
            districtLgd: DISTRICT_LGD,
            stateName: 'Uttar Pradesh',
            stateLgd: STATE_LGD,
            isGeocoded: false,
          });
          mapped++;
        } else {
          skipped++;
        }
      }
    } catch (error: any) {
      errors++;
      logger.warn(`  Error processing row: ${error.message}`);
    }
  }
  
  logger.info(`  ✅ Mapped: ${mapped}, Skipped: ${skipped}, Errors: ${errors}`);
  return { mapped, skipped, errors };
}

async function main() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("✅ Connected to MongoDB\n");
    
    logger.info("🚀 Starting HTML Excel File Mapping Process...\n");
    
    const results = {
      blockWiseGram: await mapBlockWiseGramData(),
      tehsilWiseGram: await mapTehsilWiseGramData(),
      gramMaster: await mapGramMasterData(),
      thana: await mapThanaData(),
    };
    
    logger.info("\n📊 Final Summary:");
    logger.info(`  BlockWiseGram: ${results.blockWiseGram.mapped} mapped, ${results.blockWiseGram.skipped} skipped`);
    logger.info(`  TehsilWiseGram: ${results.tehsilWiseGram.mapped} mapped, ${results.tehsilWiseGram.skipped} skipped`);
    logger.info(`  GramMaster: ${results.gramMaster.mapped} mapped, ${results.gramMaster.skipped} skipped`);
    logger.info(`  Thana: ${results.thana.mapped} mapped, ${results.thana.skipped} skipped`);
    
    logger.info("\n✅ Mapping completed!");
  } catch (error: any) {
    logger.error(`❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main();
}

export { extractDataFromHtmlExcel, parseHtmlTable };

