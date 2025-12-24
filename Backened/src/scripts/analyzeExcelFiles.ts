/**
 * Analyze Excel Files and Database Mapping
 * 
 * This script analyzes all Excel files in sample-data folder and:
 * 1. Reads structure of each Excel file
 * 2. Compares with database models
 * 3. Creates mapping strategy
 * 4. Validates data consistency
 */

import * as XLSX from "xlsx";
import path from "path";
import mongoose from "mongoose";
import { env } from "../config/env";
import logger from "../config/logger";
import Village from "../models/Village";
import Demographics from "../models/Demographics";
import SubDistrict from "../models/SubDistrict";
import Thana from "../models/Thana";

const SAMPLE_DATA_DIR = path.join(__dirname, "../../sample-data");

interface ExcelFileAnalysis {
  fileName: string;
  sheetNames: string[];
  columns: string[];
  rowCount: number;
  sampleRows: any[];
  structure: {
    hasTehsil: boolean;
    hasBlock: boolean;
    hasPanchayat: boolean;
    hasVillage: boolean;
    hasThana: boolean;
    hasGram: boolean;
  };
}

interface DatabaseStats {
  villages: number;
  demographics: number;
  subdistricts: number;
  thanas: number;
  villagesWithBlock: number;
  villagesWithPanchayat: number;
}

interface MappingStrategy {
  sourceFile: string;
  targetModel: string;
  mappingRules: {
    sourceColumn: string;
    targetField: string;
    transformation?: string;
  }[];
}

async function analyzeExcelFile(filePath: string): Promise<ExcelFileAnalysis> {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    // Get columns from first row
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    
    // Analyze structure
    const columnNames = columns.map(c => c.toLowerCase());
    const structure = {
      hasTehsil: columnNames.some(c => c.includes('tehsil') || c.includes('subdistrict')),
      hasBlock: columnNames.some(c => c.includes('block')),
      hasPanchayat: columnNames.some(c => c.includes('panchayat')),
      hasVillage: columnNames.some(c => c.includes('village') || c.includes('gram')),
      hasThana: columnNames.some(c => c.includes('thana') || c.includes('police')),
      hasGram: columnNames.some(c => c.includes('gram')),
    };
    
    return {
      fileName: path.basename(filePath),
      sheetNames: workbook.SheetNames,
      columns,
      rowCount: data.length,
      sampleRows: data.slice(0, 5),
      structure,
    };
  } catch (error: any) {
    logger.error(`Error analyzing ${filePath}: ${error.message}`);
    throw error;
  }
}

async function getDatabaseStats(): Promise<DatabaseStats> {
  const villages = await Village.countDocuments({ districtLgd: 134 });
  const demographics = await Demographics.countDocuments({ districtLgd: 134 });
  const subdistricts = await SubDistrict.countDocuments({ districtLgd: 134 });
  const thanas = await Thana.countDocuments({ districtLgd: 134 });
  const villagesWithBlock = await Village.countDocuments({ 
    districtLgd: 134, 
    blockName: { $exists: true, $ne: null } 
  });
  const villagesWithPanchayat = await Village.countDocuments({ 
    districtLgd: 134, 
    panchayatName: { $exists: true, $ne: null } 
  });
  
  return {
    villages,
    demographics,
    subdistricts,
    thanas,
    villagesWithBlock,
    villagesWithPanchayat,
  };
}

function createMappingStrategies(analyses: ExcelFileAnalysis[]): MappingStrategy[] {
  const strategies: MappingStrategy[] = [];
  
  for (const analysis of analyses) {
    const fileName = analysis.fileName.toLowerCase();
    
    // Block_Master.xls mapping
    if (fileName.includes('block_master')) {
      strategies.push({
        sourceFile: analysis.fileName,
        targetModel: 'Block',
        mappingRules: [
          { sourceColumn: 'Block(Hindi)', targetField: 'blockNameHindi' },
          { sourceColumn: 'Block(English)', targetField: 'blockName' },
        ],
      });
    }
    
    // BlockWiseGram_Master.xls mapping
    if (fileName.includes('blockwisegram')) {
      strategies.push({
        sourceFile: analysis.fileName,
        targetModel: 'Village',
        mappingRules: [
          { sourceColumn: 'Block', targetField: 'blockName' },
          { sourceColumn: 'Panchayat', targetField: 'panchayatName' },
          { sourceColumn: 'Gram(Hindi)', targetField: 'villageNameHindi' },
          { sourceColumn: 'Gram(English)', targetField: 'villageName' },
        ],
      });
    }
    
    // TehsilWiseGram_Master.xls mapping
    if (fileName.includes('tehsilwisegram')) {
      strategies.push({
        sourceFile: analysis.fileName,
        targetModel: 'Village',
        mappingRules: [
          { sourceColumn: 'Tehsil', targetField: 'subdistrictName' },
          { sourceColumn: 'Panchayat', targetField: 'panchayatName' },
          { sourceColumn: 'Gram(Hindi)', targetField: 'villageNameHindi' },
          { sourceColumn: 'Gram(English)', targetField: 'villageName' },
        ],
      });
    }
    
    // Gram_Master.xls mapping
    if (fileName.includes('gram_master') && !fileName.includes('block') && !fileName.includes('tehsil')) {
      strategies.push({
        sourceFile: analysis.fileName,
        targetModel: 'Village',
        mappingRules: [
          { sourceColumn: 'Gram(Hindi)', targetField: 'villageNameHindi' },
          { sourceColumn: 'Gram(English)', targetField: 'villageName' },
        ],
      });
    }
    
    // Thana_Master.xls mapping
    if (fileName.includes('thana_master')) {
      strategies.push({
        sourceFile: analysis.fileName,
        targetModel: 'Thana',
        mappingRules: [
          { sourceColumn: 'Tehsil', targetField: 'tehsilName' },
          { sourceColumn: 'Thana', targetField: 'thanaName' },
        ],
      });
    }
  }
  
  return strategies;
}

async function main() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("✅ Connected to MongoDB");
    
    // Step 1: Analyze all Excel files
    logger.info("\n📊 STEP 1: Analyzing Excel Files...");
    const excelFiles = [
      'Block_Master.xls',
      'BlockWiseGram_Master.xls',
      'TehsilWiseGram_Master.xls',
      'Gram_Master.xls',
      'Thana_Master.xls',
    ];
    
    const analyses: ExcelFileAnalysis[] = [];
    for (const file of excelFiles) {
      const filePath = path.join(SAMPLE_DATA_DIR, file);
      try {
        const analysis = await analyzeExcelFile(filePath);
        analyses.push(analysis);
        logger.info(`\n📄 ${file}:`);
        logger.info(`  Rows: ${analysis.rowCount}`);
        logger.info(`  Columns: ${analysis.columns.join(', ')}`);
        logger.info(`  Structure:`, analysis.structure);
      } catch (error: any) {
        logger.warn(`  ⚠️  Could not analyze ${file}: ${error.message}`);
      }
    }
    
    // Step 2: Get database statistics
    logger.info("\n📊 STEP 2: Database Statistics...");
    const dbStats = await getDatabaseStats();
    logger.info(`  Villages: ${dbStats.villages}`);
    logger.info(`  Demographics: ${dbStats.demographics}`);
    logger.info(`  Subdistricts: ${dbStats.subdistricts}`);
    logger.info(`  Thanas: ${dbStats.thanas}`);
    logger.info(`  Villages with Block: ${dbStats.villagesWithBlock}`);
    logger.info(`  Villages with Panchayat: ${dbStats.villagesWithPanchayat}`);
    
    // Step 3: Create mapping strategies
    logger.info("\n📊 STEP 3: Creating Mapping Strategies...");
    const strategies = createMappingStrategies(analyses);
    for (const strategy of strategies) {
      logger.info(`\n  ${strategy.sourceFile} → ${strategy.targetModel}:`);
      for (const rule of strategy.mappingRules) {
        logger.info(`    ${rule.sourceColumn} → ${rule.targetField}`);
      }
    }
    
    // Step 4: Generate detailed report
    logger.info("\n📊 STEP 4: Generating Detailed Report...");
    const report = {
      excelFiles: analyses,
      databaseStats: dbStats,
      mappingStrategies: strategies,
      recommendations: [],
    };
    
    // Save report
    const reportPath = path.join(__dirname, "../../EXCEL_ANALYSIS_REPORT.json");
    const fs = require('fs');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.info(`  ✅ Report saved to: ${reportPath}`);
    
    logger.info("\n✅ Analysis completed!");
    
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

export { analyzeExcelFile, getDatabaseStats, createMappingStrategies };

