/**
 * Refined HTML Excel Parser
 * Properly parses HTML-based Excel files using cheerio
 */

import * as XLSX from "xlsx";
import * as cheerio from "cheerio";
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

interface ParsedRow {
  [key: string]: string;
}

function extractHtmlFromExcel(filePath: string): string {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Method 1: Read as array and concatenate first row (most reliable)
    const arrayData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (arrayData.length > 0 && Array.isArray(arrayData[0])) {
      const firstRow = arrayData[0] as any[];
      // Concatenate all cells in first row
      const htmlString = firstRow
        .filter(cell => cell !== null && cell !== undefined && cell !== '')
        .map(cell => String(cell))
        .join('');
      
      if (htmlString.includes('<TR') || htmlString.includes('<tr') || htmlString.includes('<Table')) {
        return htmlString;
      }
    }
    
    // Method 2: Try reading individual cells from first row
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1');
    let htmlString = '';
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = sheet[cellRef];
      if (cell && cell.v) {
        htmlString += String(cell.v);
      }
    }
    
    if (htmlString.includes('<TR') || htmlString.includes('<tr') || htmlString.includes('<Table')) {
      return htmlString;
    }
    
    return '';
  } catch (error: any) {
    logger.error(`Error reading Excel file ${filePath}: ${error.message}`);
    return '';
  }
}

function parseHtmlTable(htmlString: string): ParsedRow[] {
  try {
    // Load HTML into cheerio
    const $ = cheerio.load(htmlString);
    const rows: string[][] = [];
    
    // Find all table rows (case-insensitive)
    $('TR, tr').each((index, element) => {
      const cells: string[] = [];
      
      // Extract text from each cell (case-insensitive)
      $(element).find('Td, TD, td, Th, TH, th').each((i, cell) => {
        let text = $(cell).text().trim();
        // Clean up text - remove extra whitespace
        text = text.replace(/\s+/g, ' ').trim();
        // Remove HTML tags that might have leaked through
        text = text.replace(/<[^>]*>/g, '').trim();
        // Remove non-printable characters but keep Hindi/Unicode
        text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        // Remove common HTML artifacts
        text = text.replace(/Td>/g, '').replace(/td>/g, '').trim();
        cells.push(text);
      });
      
      if (cells.length > 0) {
        rows.push(cells);
      }
    });
    
    if (rows.length < 3) {
      logger.warn(`  Only found ${rows.length} rows, need at least 3 (header + 2 data rows)`);
      return [];
    }
    
    // Skip first 2 rows (they're usually header/metadata rows)
    // Find the actual header row (usually row 2 or 3)
    let headerRowIndex = 2;
    if (rows.length > 2) {
      // Check if row 2 looks like a header (has common header words)
      const row2Text = rows[1].join(' ').toLowerCase();
      if (row2Text.includes('sno') || row2Text.includes('block') || row2Text.includes('tehsil') || 
          row2Text.includes('gram') || row2Text.includes('panchayat') || row2Text.includes('thana')) {
        headerRowIndex = 1;
      } else if (rows.length > 2) {
        const row3Text = rows[2].join(' ').toLowerCase();
        if (row3Text.includes('sno') || row3Text.includes('block') || row3Text.includes('tehsil') || 
            row3Text.includes('gram') || row3Text.includes('panchayat') || row3Text.includes('thana')) {
          headerRowIndex = 2;
        }
      }
    }
    
    const headers = rows[headerRowIndex].map((h: string) => h.toLowerCase().trim());
    const data: ParsedRow[] = [];
    
    // Process data rows (skip header rows)
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;
      
      const rowData: ParsedRow = {};
      headers.forEach((header: string, idx: number) => {
        if (row[idx] && String(row[idx]).trim()) {
          rowData[header] = String(row[idx]).trim();
        }
      });
      
      // Only add if row has meaningful data (at least one non-empty field)
      if (Object.keys(rowData).length > 0 && Object.values(rowData).some((v: string) => v)) {
        data.push(rowData);
      }
    }
    
    return data;
  } catch (error: any) {
    logger.error(`Error parsing HTML table: ${error.message}`);
    return [];
  }
}

function normalizeVillageName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .toLowerCase();
}

async function findVillageByName(villageName: string, tehsilName?: string): Promise<any> {
  const normalizedName = normalizeVillageName(villageName);
  
  const query: any = {
    districtLgd: DISTRICT_LGD,
    $or: [
      { villageName: { $regex: new RegExp(`^${villageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { villageName: { $regex: new RegExp(normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
    ],
  };
  
  if (tehsilName) {
    const tehsilLgd = TEHSIL_LGD_MAP[tehsilName.trim()];
    if (tehsilLgd) {
      query.subdistrictLgd = tehsilLgd;
    }
  }
  
  return await Village.findOne(query);
}

async function mapBlockWiseGramData() {
  logger.info("\n📊 Mapping BlockWiseGram_Master.xls...");
  
  const filePath = path.join(SAMPLE_DATA_DIR, 'BlockWiseGram_Master.xls');
  const htmlString = extractHtmlFromExcel(filePath);
  
  if (!htmlString) {
    logger.warn("  ⚠️  No HTML content found in file");
    logger.info("  🔍 Attempting alternative parsing method...");
    
    // Try alternative: read as raw HTML file
    try {
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        // Try reading the file directly - sometimes XLSX can read HTML as text
        const workbook = XLSX.readFile(filePath, { type: 'binary', raw: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1000');
        
        let fullHtml = '';
        for (let row = range.s.r; row <= Math.min(range.e.r, 50); row++) {
          for (let col = range.s.c; col <= Math.min(range.e.c, 50); col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = sheet[cellRef];
            if (cell && cell.v) {
              fullHtml += String(cell.v);
            }
          }
        }
        
        if (fullHtml.includes('<TR') || fullHtml.includes('<tr')) {
          const data = parseHtmlTable(fullHtml);
          logger.info(`  Found ${data.length} rows using alternative method`);
          if (data.length > 0) {
            return await processBlockWiseGramData(data);
          }
        }
      }
    } catch (err: any) {
      logger.warn(`  Alternative method failed: ${err.message}`);
    }
    
    return { mapped: 0, skipped: 0, errors: 0, total: 0 };
  }
  
  const data = parseHtmlTable(htmlString);
  logger.info(`  Found ${data.length} rows`);
  
  if (data.length === 0) {
    logger.warn("  ⚠️  No data rows found");
    return { mapped: 0, skipped: 0, errors: 0, total: 0 };
  }
  
  return await processBlockWiseGramData(data);
}

async function processBlockWiseGramData(data: ParsedRow[]) {
  // Log first few rows for debugging
  logger.info(`  Sample headers: ${Object.keys(data[0] || {}).join(', ')}`);
  if (data.length > 0) {
    logger.info(`  Sample row: ${JSON.stringify(data[0]).substring(0, 200)}`);
  }
  
  let mapped = 0;
  let skipped = 0;
  let errors = 0;
  let created = 0;
  
  for (const row of data) {
    try {
      // Try different possible column names
      const blockName = row['block'] || row['block name'] || row['block(english)'] || row['block (english)'];
      const panchayatName = row['panchayat (english)'] || row['panchayat'] || row['panchayat(english)'] || row['panchayat name'] || row['panchayat(english)'];
      // BlockWiseGram might not have gram column - it's organized by panchayat
      const gramEnglish = row['gram (english)'] || row['gram(english)'] || row['gram'] || row['gram name'] || row['gram (english)'];
      
      // Clean block name if it has HTML artifacts
      const cleanBlockName = blockName ? String(blockName).replace(/<[^>]*>/g, '').replace(/Td>/g, '').trim() : null;
      
      // For BlockWiseGram, if no gram name, we update all villages in that panchayat
      if (!gramEnglish || gramEnglish.toLowerCase() === 'gram (english)' || gramEnglish.toLowerCase() === 'gram') {
        // Update all villages in this panchayat with block name
        if (cleanBlockName && panchayatName) {
          try {
            const result = await Village.updateMany(
              {
                districtLgd: DISTRICT_LGD,
                panchayatName: { $regex: new RegExp(`^${String(panchayatName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                $or: [
                  { blockName: { $exists: false } },
                  { blockName: null },
                  { blockName: '' },
                ],
              },
              { $set: { blockName: cleanBlockName } }
            );
            if (result.modifiedCount > 0) {
              mapped += result.modifiedCount;
            } else {
              skipped++;
            }
          } catch (err: any) {
            errors++;
            if (errors <= 5) {
              logger.warn(`  Error updating panchayat: ${err.message}`);
            }
          }
        } else {
          skipped++;
        }
        continue;
      }
      
      // Find village by name
      const village = await findVillageByName(gramEnglish);
      
      if (village) {
        const update: any = {};
        let hasUpdate = false;
        
        if (cleanBlockName && cleanBlockName.trim() && !village.blockName) {
          update.blockName = cleanBlockName;
          hasUpdate = true;
        }
        if (panchayatName && panchayatName.trim() && !village.panchayatName) {
          update.panchayatName = String(panchayatName).trim();
          hasUpdate = true;
        }
        
        if (hasUpdate) {
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
      if (errors <= 5) {
        logger.warn(`  Error processing row: ${error.message}`);
      }
    }
  }
  
  logger.info(`  ✅ Mapped: ${mapped}, Skipped: ${skipped}, Errors: ${errors}, Total: ${data.length}`);
  return { mapped, skipped, errors, total: data.length };
}

async function mapTehsilWiseGramData() {
  logger.info("\n📊 Mapping TehsilWiseGram_Master.xls...");
  
  const filePath = path.join(SAMPLE_DATA_DIR, 'TehsilWiseGram_Master.xls');
  const htmlString = extractHtmlFromExcel(filePath);
  
  if (!htmlString) {
    logger.warn("  ⚠️  No HTML content found in file");
    return { mapped: 0, skipped: 0, errors: 0, total: 0 };
  }
  
  const data = parseHtmlTable(htmlString);
  logger.info(`  Found ${data.length} rows`);
  
  if (data.length === 0) {
    logger.warn("  ⚠️  No data rows found");
    return { mapped: 0, skipped: 0, errors: 0, total: 0 };
  }
  
  let mapped = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of data) {
    try {
      const tehsilName = row['tehsil'] || row['tehsil name'];
      const gramEnglish = row['gram (english)'] || row['gram(english)'] || row['gram'] || row['gram name'];
      
      if (!gramEnglish || gramEnglish.toLowerCase() === 'gram (english)' || gramEnglish.toLowerCase() === 'gram') {
        skipped++;
        continue;
      }
      
      // Find village by name and tehsil
      const village = await findVillageByName(gramEnglish, tehsilName);
      
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
      if (errors <= 5) {
        logger.warn(`  Error processing row: ${error.message}`);
      }
    }
  }
  
  logger.info(`  ✅ Mapped: ${mapped}, Skipped: ${skipped}, Errors: ${errors}, Total: ${data.length}`);
  return { mapped, skipped, errors, total: data.length };
}

async function mapGramMasterData() {
  logger.info("\n📊 Mapping Gram_Master.xls...");
  
  const filePath = path.join(SAMPLE_DATA_DIR, 'Gram_Master.xls');
  const htmlString = extractHtmlFromExcel(filePath);
  
  if (!htmlString) {
    logger.warn("  ⚠️  No HTML content found in file");
    return { mapped: 0, skipped: 0, errors: 0, total: 0 };
  }
  
  const data = parseHtmlTable(htmlString);
  logger.info(`  Found ${data.length} rows`);
  
  if (data.length === 0) {
    logger.warn("  ⚠️  No data rows found");
    return { mapped: 0, skipped: 0, errors: 0, total: 0 };
  }
  
  let mapped = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of data) {
    try {
      const tehsilName = row['tehsil'] || row['tehsil '] || row['tehsil name'];
      const blockName = row['block'] || row['block '] || row['block name'];
      const panchayatName = row['gram panchayat'] || row['panchayat'] || row['panchayat name'];
      const gramEnglish = row['gram (english)'] || row['gram(english)'] || row['gram'] || row['gram name'];
      
      if (!gramEnglish || gramEnglish.toLowerCase() === 'gram (english)' || gramEnglish.toLowerCase() === 'gram') {
        skipped++;
        continue;
      }
      
      // Find village by name
      const village = await findVillageByName(gramEnglish, tehsilName);
      
      if (village) {
        const update: any = {};
        let hasUpdate = false;
        
        if (blockName && blockName.trim() && !village.blockName) {
          update.blockName = String(blockName).trim();
          hasUpdate = true;
        }
        if (panchayatName && panchayatName.trim() && !village.panchayatName) {
          update.panchayatName = String(panchayatName).trim();
          hasUpdate = true;
        }
        if (tehsilName) {
          const tehsilLgd = TEHSIL_LGD_MAP[String(tehsilName).trim()];
          if (tehsilLgd && village.subdistrictLgd !== tehsilLgd) {
            const tehsil = await SubDistrict.findOne({ subdistrictLgd: tehsilLgd });
            if (tehsil) {
              update.subdistrictName = tehsil.subdistrictName;
              update.subdistrictLgd = tehsilLgd;
              hasUpdate = true;
            }
          }
        }
        
        if (hasUpdate) {
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
      if (errors <= 5) {
        logger.warn(`  Error processing row: ${error.message}`);
      }
    }
  }
  
  logger.info(`  ✅ Mapped: ${mapped}, Skipped: ${skipped}, Errors: ${errors}, Total: ${data.length}`);
  return { mapped, skipped, errors, total: data.length };
}

async function mapThanaData() {
  logger.info("\n📊 Mapping Thana_Master.xls...");
  
  const filePath = path.join(SAMPLE_DATA_DIR, 'Thana_Master.xls');
  const htmlString = extractHtmlFromExcel(filePath);
  
  if (!htmlString) {
    logger.warn("  ⚠️  No HTML content found in file");
    return { mapped: 0, skipped: 0, errors: 0, total: 0 };
  }
  
  const data = parseHtmlTable(htmlString);
  logger.info(`  Found ${data.length} rows`);
  
  if (data.length === 0) {
    logger.warn("  ⚠️  No data rows found");
    return { mapped: 0, skipped: 0, errors: 0, total: 0 };
  }
  
  let mapped = 0;
  let skipped = 0;
  let errors = 0;
  let created = 0;
  
  for (const row of data) {
    try {
      const tehsilName = row['tehsil'] || row['tehsil name'];
      const thanaName = row['thana'] || row['thana name'];
      
      if (!tehsilName || !thanaName || 
          tehsilName.toLowerCase() === 'tehsil' || 
          thanaName.toLowerCase() === 'thana') {
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
          created++;
          mapped++;
        } else {
          skipped++;
        }
      }
    } catch (error: any) {
      errors++;
      if (errors <= 5) {
        logger.warn(`  Error processing row: ${error.message}`);
      }
    }
  }
  
  logger.info(`  ✅ Created: ${created}, Mapped: ${mapped}, Skipped: ${skipped}, Errors: ${errors}, Total: ${data.length}`);
  return { mapped, skipped, errors, total: data.length, created };
}

async function main() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("✅ Connected to MongoDB\n");
    
    logger.info("🚀 Starting Refined HTML Excel File Mapping Process...\n");
    
    const results = {
      blockWiseGram: await mapBlockWiseGramData(),
      tehsilWiseGram: await mapTehsilWiseGramData(),
      gramMaster: await mapGramMasterData(),
      thana: await mapThanaData(),
    };
    
    logger.info("\n📊 Final Summary:");
    logger.info(`  BlockWiseGram: ${results.blockWiseGram.mapped} mapped, ${results.blockWiseGram.skipped} skipped, ${results.blockWiseGram.errors} errors (Total: ${results.blockWiseGram.total})`);
    logger.info(`  TehsilWiseGram: ${results.tehsilWiseGram.mapped} mapped, ${results.tehsilWiseGram.skipped} skipped, ${results.tehsilWiseGram.errors} errors (Total: ${results.tehsilWiseGram.total})`);
    logger.info(`  GramMaster: ${results.gramMaster.mapped} mapped, ${results.gramMaster.skipped} skipped, ${results.gramMaster.errors} errors (Total: ${results.gramMaster.total})`);
    logger.info(`  Thana: ${results.thana.created || 0} created, ${results.thana.mapped} mapped, ${results.thana.skipped} skipped, ${results.thana.errors} errors (Total: ${results.thana.total})`);
    
    // Get final database stats
    logger.info("\n📊 Final Database Statistics:");
    const villagesWithBlock = await Village.countDocuments({ 
      districtLgd: DISTRICT_LGD, 
      blockName: { $exists: true, $ne: null } 
    });
    const villagesWithPanchayat = await Village.countDocuments({ 
      districtLgd: DISTRICT_LGD, 
      panchayatName: { $exists: true, $ne: null } 
    });
    const totalVillages = await Village.countDocuments({ districtLgd: DISTRICT_LGD });
    const totalThanas = await Thana.countDocuments({ districtLgd: DISTRICT_LGD });
    
    logger.info(`  Total Villages: ${totalVillages}`);
    logger.info(`  Villages with Block: ${villagesWithBlock} (${((villagesWithBlock/totalVillages)*100).toFixed(1)}%)`);
    logger.info(`  Villages with Panchayat: ${villagesWithPanchayat} (${((villagesWithPanchayat/totalVillages)*100).toFixed(1)}%)`);
    logger.info(`  Total Thanas: ${totalThanas}`);
    
    logger.info("\n✅ Mapping completed successfully!");
  } catch (error: any) {
    logger.error(`❌ Error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main();
}

export { extractHtmlFromExcel, parseHtmlTable, findVillageByName };

