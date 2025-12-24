/**
 * 20-Step Process to Validate and Map Excel Data
 * 
 * This script implements a comprehensive 20-step validation and mapping process
 * to ensure data integrity and correct mapping between Excel files and database.
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
const DISTRICT_LGD = 134;
const STATE_LGD = 9;

interface ValidationResult {
  step: number;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface MappingResult {
  source: string;
  target: string;
  mapped: number;
  skipped: number;
  errors: number;
}

class ExcelDataValidator {
  private results: ValidationResult[] = [];
  private mappingResults: MappingResult[] = [];
  
  async executeAllSteps(): Promise<void> {
    logger.info("🚀 Starting 20-Step Validation and Mapping Process...\n");
    
    // STEP 1: Verify Excel files exist
    await this.step1_VerifyExcelFiles();
    
    // STEP 2: Read and parse Block_Master.xls
    await this.step2_ReadBlockMaster();
    
    // STEP 3: Read and parse Tehsil_Master.xls
    await this.step3_ReadTehsilMaster();
    
    // STEP 4: Read and parse Thana_Master.xls
    await this.step4_ReadThanaMaster();
    
    // STEP 5: Read and parse BlockWiseGram_Master.xls
    await this.step5_ReadBlockWiseGram();
    
    // STEP 6: Read and parse TehsilWiseGram_Master.xls
    await this.step6_ReadTehsilWiseGram();
    
    // STEP 7: Read and parse Gram_Master.xls
    await this.step7_ReadGramMaster();
    
    // STEP 8: Validate Tehsil names consistency
    await this.step8_ValidateTehsilNames();
    
    // STEP 9: Validate Block names consistency
    await this.step9_ValidateBlockNames();
    
    // STEP 10: Validate Panchayat names consistency
    await this.step10_ValidatePanchayatNames();
    
    // STEP 11: Validate Village/Gram names consistency
    await this.step11_ValidateVillageNames();
    
    // STEP 12: Check database for existing villages
    await this.step12_CheckExistingVillages();
    
    // STEP 13: Check database for existing blocks
    await this.step13_CheckExistingBlocks();
    
    // STEP 14: Check database for existing panchayats
    await this.step14_CheckExistingPanchayats();
    
    // STEP 15: Map BlockWiseGram to Village model
    await this.step15_MapBlockWiseGramToVillage();
    
    // STEP 16: Map TehsilWiseGram to Village model
    await this.step16_MapTehsilWiseGramToVillage();
    
    // STEP 17: Map Thana data to Thana model
    await this.step17_MapThanaData();
    
    // STEP 18: Validate LGD code consistency
    await this.step18_ValidateLgdCodes();
    
    // STEP 19: Check for duplicate entries
    await this.step19_CheckDuplicates();
    
    // STEP 20: Generate final report
    await this.step20_GenerateReport();
  }
  
  private async step1_VerifyExcelFiles(): Promise<void> {
    logger.info("STEP 1: Verifying Excel files exist...");
    const files = [
      'Block_Master.xls',
      'Tehsil_Master.xls',
      'Thana_Master.xls',
      'BlockWiseGram_Master.xls',
      'TehsilWiseGram_Master.xls',
      'Gram_Master.xls',
    ];
    
    const fs = require('fs');
    const missing: string[] = [];
    
    for (const file of files) {
      const filePath = path.join(SAMPLE_DATA_DIR, file);
      if (!fs.existsSync(filePath)) {
        missing.push(file);
      }
    }
    
    if (missing.length === 0) {
      this.addResult(1, 'Verify Excel Files', 'pass', `All ${files.length} files exist`);
    } else {
      this.addResult(1, 'Verify Excel Files', 'fail', `Missing files: ${missing.join(', ')}`);
    }
  }
  
  private async step2_ReadBlockMaster(): Promise<void> {
    logger.info("STEP 2: Reading Block_Master.xls...");
    try {
      const filePath = path.join(SAMPLE_DATA_DIR, 'Block_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      
      const blocks = data.map(row => ({
        hindi: row['Block(Hindi)'] || row['Block (Hindi)'],
        english: row['Block(English)'] || row['Block (English)'],
      })).filter(b => b.hindi || b.english);
      
      this.addResult(2, 'Read Block Master', 'pass', `Found ${blocks.length} blocks`, { blocks });
    } catch (error: any) {
      this.addResult(2, 'Read Block Master', 'fail', error.message);
    }
  }
  
  private async step3_ReadTehsilMaster(): Promise<void> {
    logger.info("STEP 3: Reading Tehsil_Master.xls...");
    try {
      const filePath = path.join(SAMPLE_DATA_DIR, 'Tehsil_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      
      const tehsils = data.map(row => ({
        hindi: row['Tehsil(Hindi)'] || row['Tehsil (Hindi)'],
        english: row['Tehsil(English)'] || row['Tehsil (English)'],
      })).filter(t => t.hindi || t.english);
      
      this.addResult(3, 'Read Tehsil Master', 'pass', `Found ${tehsils.length} tehsils`, { tehsils });
    } catch (error: any) {
      this.addResult(3, 'Read Tehsil Master', 'fail', error.message);
    }
  }
  
  private async step4_ReadThanaMaster(): Promise<void> {
    logger.info("STEP 4: Reading Thana_Master.xls...");
    try {
      const filePath = path.join(SAMPLE_DATA_DIR, 'Thana_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      
      const thanas = data.map(row => ({
        tehsil: row['Tehsil'] || row['Tehsil Name'],
        thana: row['Thana'] || row['Thana Name'],
      })).filter(t => t.tehsil && t.thana);
      
      this.addResult(4, 'Read Thana Master', 'pass', `Found ${thanas.length} thanas`, { thanas });
    } catch (error: any) {
      this.addResult(4, 'Read Thana Master', 'fail', error.message);
    }
  }
  
  private async step5_ReadBlockWiseGram(): Promise<void> {
    logger.info("STEP 5: Reading BlockWiseGram_Master.xls...");
    try {
      const filePath = path.join(SAMPLE_DATA_DIR, 'BlockWiseGram_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      
      const grams = data.map(row => ({
        block: row['Block'] || row['Block Name'],
        panchayat: row['Panchayat'] || row['Panchayat Name'],
        gramHindi: row['Gram(Hindi)'] || row['Gram (Hindi)'],
        gramEnglish: row['Gram(English)'] || row['Gram (English)'],
      })).filter(g => g.gramHindi || g.gramEnglish);
      
      this.addResult(5, 'Read BlockWiseGram', 'pass', `Found ${grams.length} grams`, { sample: grams.slice(0, 5) });
    } catch (error: any) {
      this.addResult(5, 'Read BlockWiseGram', 'fail', error.message);
    }
  }
  
  private async step6_ReadTehsilWiseGram(): Promise<void> {
    logger.info("STEP 6: Reading TehsilWiseGram_Master.xls...");
    try {
      const filePath = path.join(SAMPLE_DATA_DIR, 'TehsilWiseGram_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      
      const grams = data.map(row => ({
        tehsil: row['Tehsil'] || row['Tehsil Name'],
        panchayat: row['Panchayat'] || row['Panchayat Name'],
        gramHindi: row['Gram(Hindi)'] || row['Gram (Hindi)'],
        gramEnglish: row['Gram(English)'] || row['Gram (English)'],
      })).filter(g => g.gramHindi || g.gramEnglish);
      
      this.addResult(6, 'Read TehsilWiseGram', 'pass', `Found ${grams.length} grams`, { sample: grams.slice(0, 5) });
    } catch (error: any) {
      this.addResult(6, 'Read TehsilWiseGram', 'fail', error.message);
    }
  }
  
  private async step7_ReadGramMaster(): Promise<void> {
    logger.info("STEP 7: Reading Gram_Master.xls...");
    try {
      const filePath = path.join(SAMPLE_DATA_DIR, 'Gram_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      
      const grams = data.map(row => ({
        gramHindi: row['Gram(Hindi)'] || row['Gram (Hindi)'],
        gramEnglish: row['Gram(English)'] || row['Gram (English)'],
      })).filter(g => g.gramHindi || g.gramEnglish);
      
      this.addResult(7, 'Read Gram Master', 'pass', `Found ${grams.length} grams`, { sample: grams.slice(0, 5) });
    } catch (error: any) {
      this.addResult(7, 'Read Gram Master', 'fail', error.message);
    }
  }
  
  private async step8_ValidateTehsilNames(): Promise<void> {
    logger.info("STEP 8: Validating Tehsil names consistency...");
    try {
      const dbTehsils = await SubDistrict.find({ districtLgd: DISTRICT_LGD }).select('subdistrictName').lean();
      const dbNames = new Set(dbTehsils.map(t => t.subdistrictName.toLowerCase()));
      
      // Read from Excel
      const filePath = path.join(SAMPLE_DATA_DIR, 'Tehsil_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      const excelNames = new Set(
        data.map(row => {
          const name = row['Tehsil(English)'] || row['Tehsil (English)'];
          return name ? String(name).trim().toLowerCase() : null;
        }).filter((name): name is string => name !== null)
      );
      
      const missingInDb = Array.from(excelNames).filter((name: string) => !dbNames.has(name));
      const missingInExcel = Array.from(dbNames).filter((name: string) => !excelNames.has(name));
      
      if (missingInDb.length === 0 && missingInExcel.length === 0) {
        this.addResult(8, 'Validate Tehsil Names', 'pass', 'All tehsil names match');
      } else {
        this.addResult(8, 'Validate Tehsil Names', 'warning', 
          `Mismatches found`, { missingInDb, missingInExcel });
      }
    } catch (error: any) {
      this.addResult(8, 'Validate Tehsil Names', 'fail', error.message);
    }
  }
  
  private async step9_ValidateBlockNames(): Promise<void> {
    logger.info("STEP 9: Validating Block names consistency...");
    try {
      const dbBlocks = await Village.distinct('blockName', { 
        districtLgd: DISTRICT_LGD, 
        blockName: { $exists: true, $ne: null } 
      });
      const dbBlockSet = new Set(dbBlocks.map(b => b.toLowerCase()));
      
      // Read from Excel
      const filePath = path.join(SAMPLE_DATA_DIR, 'Block_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      const excelBlocks = new Set(
        data.map(row => {
          const name = row['Block(English)'] || row['Block (English)'];
          return name ? String(name).trim().toLowerCase() : null;
        }).filter((name): name is string => name !== null)
      );
      
      const missingInDb = Array.from(excelBlocks).filter((b: string) => !dbBlockSet.has(b));
      
      if (missingInDb.length === 0) {
        this.addResult(9, 'Validate Block Names', 'pass', 'All block names found in database');
      } else {
        this.addResult(9, 'Validate Block Names', 'warning', 
          `${missingInDb.length} blocks not in database`, { missingInDb });
      }
    } catch (error: any) {
      this.addResult(9, 'Validate Block Names', 'fail', error.message);
    }
  }
  
  private async step10_ValidatePanchayatNames(): Promise<void> {
    logger.info("STEP 10: Validating Panchayat names consistency...");
    try {
      const dbPanchayats = await Village.distinct('panchayatName', { 
        districtLgd: DISTRICT_LGD, 
        panchayatName: { $exists: true, $ne: null } 
      });
      const dbPanchayatSet = new Set(dbPanchayats.map(p => p.toLowerCase()));
      
      // Read from BlockWiseGram
      const filePath = path.join(SAMPLE_DATA_DIR, 'BlockWiseGram_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      const excelPanchayats = new Set(
        data.map(row => {
          const name = row['Panchayat'] || row['Panchayat Name'];
          return name ? String(name).trim().toLowerCase() : null;
        }).filter((name): name is string => name !== null)
      );
      
      const missingInDb = Array.from(excelPanchayats).filter((p: string) => !dbPanchayatSet.has(p));
      
      this.addResult(10, 'Validate Panchayat Names', 'pass', 
        `Found ${excelPanchayats.size} panchayats in Excel, ${dbPanchayats.length} in DB`, 
        { missingInDb: missingInDb.slice(0, 10) });
    } catch (error: any) {
      this.addResult(10, 'Validate Panchayat Names', 'fail', error.message);
    }
  }
  
  private async step11_ValidateVillageNames(): Promise<void> {
    logger.info("STEP 11: Validating Village/Gram names consistency...");
    try {
      const dbVillages = await Village.find({ districtLgd: DISTRICT_LGD })
        .select('villageName').lean();
      const dbVillageSet = new Set(dbVillages.map(v => v.villageName.toLowerCase()));
      
      // Read from BlockWiseGram
      const filePath = path.join(SAMPLE_DATA_DIR, 'BlockWiseGram_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      const excelVillages = new Set(
        data.map(row => {
          const name = row['Gram(English)'] || row['Gram (English)'];
          return name ? String(name).trim().toLowerCase() : null;
        }).filter((name): name is string => name !== null)
      );
      
      const missingInDb = Array.from(excelVillages).filter((v: string) => !dbVillageSet.has(v));
      const missingInExcel = Array.from(dbVillageSet).filter((v: string) => !excelVillages.has(v));
      
      this.addResult(11, 'Validate Village Names', 'pass', 
        `Excel: ${excelVillages.size}, DB: ${dbVillages.length}`, 
        { missingInDb: missingInDb.length, missingInExcel: missingInExcel.length });
    } catch (error: any) {
      this.addResult(11, 'Validate Village Names', 'fail', error.message);
    }
  }
  
  private async step12_CheckExistingVillages(): Promise<void> {
    logger.info("STEP 12: Checking existing villages in database...");
    try {
      const count = await Village.countDocuments({ districtLgd: DISTRICT_LGD });
      const withBlock = await Village.countDocuments({ 
        districtLgd: DISTRICT_LGD, 
        blockName: { $exists: true, $ne: null } 
      });
      const withPanchayat = await Village.countDocuments({ 
        districtLgd: DISTRICT_LGD, 
        panchayatName: { $exists: true, $ne: null } 
      });
      
      this.addResult(12, 'Check Existing Villages', 'pass', 
        `Total: ${count}, With Block: ${withBlock}, With Panchayat: ${withPanchayat}`);
    } catch (error: any) {
      this.addResult(12, 'Check Existing Villages', 'fail', error.message);
    }
  }
  
  private async step13_CheckExistingBlocks(): Promise<void> {
    logger.info("STEP 13: Checking existing blocks in database...");
    try {
      const blocks = await Village.distinct('blockName', { 
        districtLgd: DISTRICT_LGD, 
        blockName: { $exists: true, $ne: null } 
      });
      
      this.addResult(13, 'Check Existing Blocks', 'pass', 
        `Found ${blocks.length} unique blocks`, { blocks });
    } catch (error: any) {
      this.addResult(13, 'Check Existing Blocks', 'fail', error.message);
    }
  }
  
  private async step14_CheckExistingPanchayats(): Promise<void> {
    logger.info("STEP 14: Checking existing panchayats in database...");
    try {
      const panchayats = await Village.distinct('panchayatName', { 
        districtLgd: DISTRICT_LGD, 
        panchayatName: { $exists: true, $ne: null } 
      });
      
      this.addResult(14, 'Check Existing Panchayats', 'pass', 
        `Found ${panchayats.length} unique panchayats`, { sample: panchayats.slice(0, 10) });
    } catch (error: any) {
      this.addResult(14, 'Check Existing Panchayats', 'fail', error.message);
    }
  }
  
  private async step15_MapBlockWiseGramToVillage(): Promise<void> {
    logger.info("STEP 15: Mapping BlockWiseGram to Village model...");
    try {
      const filePath = path.join(SAMPLE_DATA_DIR, 'BlockWiseGram_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      
      let mapped = 0;
      let skipped = 0;
      let errors = 0;
      
      for (const row of data) {
        try {
          const villageName = row['Gram(English)'] || row['Gram (English)'];
          const blockName = row['Block'] || row['Block Name'];
          const panchayatName = row['Panchayat'] || row['Panchayat Name'];
          
          if (!villageName) {
            skipped++;
            continue;
          }
          
          // Find village by name
          const village = await Village.findOne({
            districtLgd: DISTRICT_LGD,
            villageName: { $regex: new RegExp(`^${String(villageName)}$`, 'i') },
          });
          
          if (village) {
            const update: any = {};
            if (blockName && !village.blockName) update.blockName = String(blockName).trim();
            if (panchayatName && !village.panchayatName) update.panchayatName = String(panchayatName).trim();
            
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
        }
      }
      
      this.mappingResults.push({
        source: 'BlockWiseGram_Master.xls',
        target: 'Village',
        mapped,
        skipped,
        errors,
      });
      
      this.addResult(15, 'Map BlockWiseGram', 'pass', 
        `Mapped: ${mapped}, Skipped: ${skipped}, Errors: ${errors}`);
    } catch (error: any) {
      this.addResult(15, 'Map BlockWiseGram', 'fail', error.message);
    }
  }
  
  private async step16_MapTehsilWiseGramToVillage(): Promise<void> {
    logger.info("STEP 16: Mapping TehsilWiseGram to Village model...");
    try {
      const filePath = path.join(SAMPLE_DATA_DIR, 'TehsilWiseGram_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      
      let mapped = 0;
      let skipped = 0;
      let errors = 0;
      
      for (const row of data) {
        try {
          const villageName = row['Gram(English)'] || row['Gram (English)'];
          const tehsilName = row['Tehsil'] || row['Tehsil Name'];
          const panchayatName = row['Panchayat'] || row['Panchayat Name'];
          
          if (!villageName) {
            skipped++;
            continue;
          }
          
          // Find village by name and tehsil
          const village = await Village.findOne({
            districtLgd: DISTRICT_LGD,
            villageName: { $regex: new RegExp(`^${String(villageName)}$`, 'i') },
            ...(tehsilName ? { subdistrictName: { $regex: new RegExp(`^${String(tehsilName)}$`, 'i') } } : {}),
          });
          
          if (village) {
            const update: any = {};
            if (panchayatName && !village.panchayatName) update.panchayatName = String(panchayatName).trim();
            
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
        }
      }
      
      this.mappingResults.push({
        source: 'TehsilWiseGram_Master.xls',
        target: 'Village',
        mapped,
        skipped,
        errors,
      });
      
      this.addResult(16, 'Map TehsilWiseGram', 'pass', 
        `Mapped: ${mapped}, Skipped: ${skipped}, Errors: ${errors}`);
    } catch (error: any) {
      this.addResult(16, 'Map TehsilWiseGram', 'fail', error.message);
    }
  }
  
  private async step17_MapThanaData(): Promise<void> {
    logger.info("STEP 17: Mapping Thana data...");
    try {
      const filePath = path.join(SAMPLE_DATA_DIR, 'Thana_Master.xls');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      
      let mapped = 0;
      let skipped = 0;
      let errors = 0;
      
      for (const row of data) {
        try {
          const tehsilName = row['Tehsil'] || row['Tehsil Name'];
          const thanaName = row['Thana'] || row['Thana Name'];
          
          if (!tehsilName || !thanaName) {
            skipped++;
            continue;
          }
          
          // Check if thana exists
          const existing = await Thana.findOne({
            districtLgd: DISTRICT_LGD,
            thanaName: { $regex: new RegExp(`^${String(thanaName)}$`, 'i') },
            tehsilName: { $regex: new RegExp(`^${String(tehsilName)}$`, 'i') },
          });
          
          if (existing) {
            skipped++;
          } else {
            // Find tehsil LGD
            const tehsil = await SubDistrict.findOne({
              districtLgd: DISTRICT_LGD,
              subdistrictName: { $regex: new RegExp(`^${String(tehsilName)}$`, 'i') },
            });
            
            if (tehsil) {
              await Thana.create({
                thanaName: String(thanaName).trim(),
                tehsilName: String(tehsilName).trim(),
                tehsilLgd: tehsil.subdistrictLgd,
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
        }
      }
      
      this.mappingResults.push({
        source: 'Thana_Master.xls',
        target: 'Thana',
        mapped,
        skipped,
        errors,
      });
      
      this.addResult(17, 'Map Thana Data', 'pass', 
        `Mapped: ${mapped}, Skipped: ${skipped}, Errors: ${errors}`);
    } catch (error: any) {
      this.addResult(17, 'Map Thana Data', 'fail', error.message);
    }
  }
  
  private async step18_ValidateLgdCodes(): Promise<void> {
    logger.info("STEP 18: Validating LGD code consistency...");
    try {
      const villages = await Village.find({ districtLgd: DISTRICT_LGD })
        .select('villageName lgdCode subdistrictLgd').lean();
      
      const invalidLgd: any[] = [];
      for (const village of villages) {
        if (village.lgdCode && !village.lgdCode.match(/^\d+$/)) {
          invalidLgd.push({ village: village.villageName, lgdCode: village.lgdCode });
        }
      }
      
      if (invalidLgd.length === 0) {
        this.addResult(18, 'Validate LGD Codes', 'pass', 'All LGD codes are valid');
      } else {
        this.addResult(18, 'Validate LGD Codes', 'warning', 
          `Found ${invalidLgd.length} invalid LGD codes`, { sample: invalidLgd.slice(0, 5) });
      }
    } catch (error: any) {
      this.addResult(18, 'Validate LGD Codes', 'fail', error.message);
    }
  }
  
  private async step19_CheckDuplicates(): Promise<void> {
    logger.info("STEP 19: Checking for duplicate entries...");
    try {
      const duplicates = await Village.aggregate([
        { $match: { districtLgd: DISTRICT_LGD } },
        { $group: { 
          _id: { name: '$villageName', tehsil: '$subdistrictLgd' }, 
          count: { $sum: 1 } 
        }},
        { $match: { count: { $gt: 1 } } },
      ]);
      
      if (duplicates.length === 0) {
        this.addResult(19, 'Check Duplicates', 'pass', 'No duplicate villages found');
      } else {
        this.addResult(19, 'Check Duplicates', 'warning', 
          `Found ${duplicates.length} duplicate groups`, { sample: duplicates.slice(0, 5) });
      }
    } catch (error: any) {
      this.addResult(19, 'Check Duplicates', 'fail', error.message);
    }
  }
  
  private async step20_GenerateReport(): Promise<void> {
    logger.info("STEP 20: Generating final report...");
    
    const report = {
      summary: {
        totalSteps: this.results.length,
        passed: this.results.filter(r => r.status === 'pass').length,
        failed: this.results.filter(r => r.status === 'fail').length,
        warnings: this.results.filter(r => r.status === 'warning').length,
      },
      results: this.results,
      mappingResults: this.mappingResults,
      timestamp: new Date().toISOString(),
    };
    
    const fs = require('fs');
    const reportPath = path.join(__dirname, "../../VALIDATION_REPORT.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    logger.info(`\n📊 Validation Summary:`);
    logger.info(`  Passed: ${report.summary.passed}`);
    logger.info(`  Failed: ${report.summary.failed}`);
    logger.info(`  Warnings: ${report.summary.warnings}`);
    logger.info(`\n✅ Report saved to: ${reportPath}`);
    
    this.addResult(20, 'Generate Report', 'pass', 'Report generated successfully');
  }
  
  private addResult(step: number, name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any): void {
    this.results.push({ step, name, status, message, details });
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    logger.info(`  ${icon} ${name}: ${message}`);
  }
}

async function main() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("✅ Connected to MongoDB\n");
    
    const validator = new ExcelDataValidator();
    await validator.executeAllSteps();
    
    logger.info("\n✅ 20-Step Validation Process Completed!");
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

export { ExcelDataValidator };

