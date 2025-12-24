import mongoose from "mongoose";
import Demographics from "../models/Demographics";
import dotenv from "dotenv";
import path from "path";
import * as XLSX from "xlsx";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mpmla";

// Subdistrict code/name to LGD code mapping
// Census codes are 5-digit (00778-00783), we convert to 3-digit (778-783)
const SUBDISTRICT_LGD_MAP: { [key: string]: number } = {
  // By Name (case-insensitive)
  "BILSI": 780,
  "BISAULI": 779,
  "BUDAUN": 782,
  "BADAUN": 782,  // Alternate spelling
  "DATAGANJ": 783,
  "SAHASWAN": 781,
  "GUNNAUR": 778,  // 6th subdistrict
  // By Census Code (5-digit format)
  "00778": 778,
  "00779": 779,
  "00780": 780,
  "00781": 781,
  "00782": 782,
  "00783": 783,
  // By LGD Code (3-digit format)
  "778": 778,
  "779": 779,
  "780": 780,
  "781": 781,
  "782": 782,
  "783": 783,
};

// TRU (Total/Rural/Urban) mapping
function mapTRU(truValue: any): "total" | "urban" | "rural" {
  const truStr = String(truValue).toLowerCase().trim();
  if (truStr === "1" || truStr.includes("total")) return "total";
  if (truStr === "2" || truStr.includes("rural")) return "rural";
  if (truStr === "3" || truStr.includes("urban")) return "urban";
  return "total"; // default
}

// Determine level from row data
function determineLevel(row: any): "state" | "district" | "subdistrict" | "town" | "village" | "ward" {
  const level = String(row.Level || "").toUpperCase().trim();
  const tru = String(row.TRU || "").toLowerCase();
  const name = String(row.Name || "").toUpperCase().trim();
  const townVillWard = String(row["Town/Vill Ward"] || "").toUpperCase().trim();
  
  // Check for exact level values from Excel
  if (level === "STATE") return "state";
  if (level === "DISTRICT") return "district";
  if (level === "SUB-DISTR" || level.includes("SUB")) return "subdistrict";
  
  // For urban areas, check if it's a ward or town
  if (tru === "urban" || tru === "3") {
    // Check if name contains "WARD" keyword
    if (name.includes("WARD NO") || name.includes("WARD-") || name.includes("WARD ")) {
      return "ward";
    }
    if (townVillWard.includes("WARD")) {
      return "ward";
    }
    // Otherwise it's a town
    return "town";
  }
  
  // For rural areas
  if (tru === "rural" || tru === "2") return "village";
  
  // For total - could be village or town summary
  if (tru === "total" || tru === "1") {
    // If name has ward keyword, it's a ward summary
    if (name.includes("WARD")) return "ward";
    // Otherwise assume village
    return "village";
  }
  
  return "village"; // default
}

// Get subdistrict LGD code from name or code
function getSubdistrictLgd(subdistrictValue: string): number | undefined {
  if (!subdistrictValue) return undefined;
  const normalized = String(subdistrictValue).toUpperCase().trim();
  return SUBDISTRICT_LGD_MAP[normalized];
}

// Get subdistrict name from code
function getSubdistrictName(code: string): string | undefined {
  const codeMap: { [key: string]: string } = {
    "00778": "Gunnaur",
    "00779": "Bisauli",
    "00780": "Bilsi",
    "00781": "Sahaswan",
    "00782": "Budaun",
    "00783": "Dataganj",
    "778": "Gunnaur",
    "779": "Bisauli",
    "780": "Bilsi",
    "781": "Sahaswan",
    "782": "Budaun",
    "783": "Dataganj",
  };
  return codeMap[String(code).trim()];
}

// Safe number parse
function parseNumber(value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = parseInt(String(value).replace(/,/g, ""), 10);
  return isNaN(num) ? 0 : num;
}

async function importCensusData() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Read Excel file
    const filePath = path.join(__dirname, "../../sample-data/DDW_PCA0918_2011_MDDS with UI.xlsx");
    console.log("\n📖 Reading Excel file...");
    console.log(`File: ${filePath}`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // First sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);
    console.log(`✅ Found ${rawData.length} rows in Excel file`);

    // Clear existing data
    console.log("\n🗑️  Clearing existing census data for Budaun...");
    await Demographics.deleteMany({ districtLgd: 134 });
    console.log("✅ Cleared existing data");

    // Process each row
    console.log("\n📊 Processing census data...");
    const demographicsToInsert: any[] = [];
    let skipped = 0;
    let processed = 0;

    for (const row of rawData) {
      try {
        // Skip if no population data
        if (!row.TOT_P && !row.No_HH) {
          skipped++;
          continue;
        }

        // Determine level
        const level = determineLevel(row);
        const residence = mapTRU(row.TRU);
        
        // Get subdistrict info from both code and name
        // Excel has "Subdist" column with codes (00778-00783)
        const subdistrictCode = row.Subdist || row.Subdistt || row.subdistrict;
        let subdistrictName: string | undefined;
        let subdistrictLgd: number | undefined;
        
        if (subdistrictCode) {
          const codeStr = String(subdistrictCode).trim();
          subdistrictLgd = getSubdistrictLgd(codeStr);
          
          // For subdistrict-level rows, use Name column as subdistrict name
          if (level === "subdistrict") {
            subdistrictName = row.Name ? String(row.Name).trim() : getSubdistrictName(codeStr);
          } else {
            subdistrictName = getSubdistrictName(codeStr);
          }
        }

        // Build demographics object
        const demographics = {
          // Geographic Hierarchy
          state: "Uttar Pradesh",
          stateLgd: 9,
          district: "Budaun",
          districtLgd: 134,
          subdistrict: subdistrictName,
          subdistrictLgd: subdistrictLgd,
          townVillageWard: row["Town/Vill Ward"] ? String(row["Town/Vill Ward"]).trim() : undefined,
          townVillageCode: row.EB ? String(row.EB).trim() : undefined,
          
          // Level & Classification
          level: level,
          residence: residence,
          areaName: row.Name ? String(row.Name).trim() : (subdistrictName || "Unknown"),
          
          // Census Metadata
          censusYear: 2011,
          ebCode: row.EB ? String(row.EB).trim() : undefined,
          
          // Population Data
          totalHouseholds: parseNumber(row.No_HH),
          totalPopulation: parseNumber(row.TOT_P),
          malePopulation: parseNumber(row.TOT_M),
          femalePopulation: parseNumber(row.TOT_F),
          
          // Child Population
          childPopulation: parseNumber(row.P_06),
          childMale: parseNumber(row.M_06),
          childFemale: parseNumber(row.F_06),
          
          // Scheduled Caste
          scPopulation: parseNumber(row.P_SC),
          scMale: parseNumber(row.M_SC),
          scFemale: parseNumber(row.F_SC),
          
          // Scheduled Tribe
          stPopulation: parseNumber(row.P_ST || 0),
          stMale: parseNumber(row.M_ST || 0),
          stFemale: parseNumber(row.F_ST || 0),
          
          // Metadata
          dataSource: "Census 2011 PCA - DDW Budaun",
          lastUpdated: new Date(),
        };

        demographicsToInsert.push(demographics);
        processed++;

        // Log progress every 100 rows
        if (processed % 100 === 0) {
          console.log(`  ✓ Processed ${processed} rows...`);
        }

      } catch (error) {
        console.error(`  ❌ Error processing row:`, error);
        skipped++;
      }
    }

    // Insert all demographics
    console.log(`\n💾 Inserting ${demographicsToInsert.length} demographics records...`);
    await Demographics.insertMany(demographicsToInsert);
    console.log("✅ Successfully inserted all demographics");

    // Print summary
    console.log("\n📊 Import Summary:");
    console.log("═".repeat(60));
    console.log(`  Total rows in Excel   : ${rawData.length}`);
    console.log(`  Processed             : ${processed}`);
    console.log(`  Skipped (no data)     : ${skipped}`);
    console.log(`  Inserted              : ${demographicsToInsert.length}`);
    console.log("═".repeat(60));

    // Count by level
    console.log("\n📊 Summary by Level:");
    console.log("═".repeat(60));
    const levels = ["state", "district", "subdistrict", "town", "village", "ward"];
    for (const level of levels) {
      const count = await Demographics.countDocuments({ level });
      if (count > 0) {
        console.log(`  ${level.charAt(0).toUpperCase() + level.slice(1).padEnd(15)} : ${count}`);
      }
    }
    console.log("═".repeat(60));

    // Count by subdistrict
    console.log("\n📊 Summary by Subdistrict:");
    console.log("═".repeat(60));
    const subdistricts = ["Bilsi", "Bisauli", "Budaun", "Dataganj", "Sahaswan"];
    for (const sub of subdistricts) {
      const count = await Demographics.countDocuments({ 
        subdistrict: new RegExp(sub, 'i'),
        level: { $in: ["village", "town", "ward"] }
      });
      console.log(`  ${sub.padEnd(20)} : ${count} villages/towns/wards`);
    }
    console.log("═".repeat(60));

    // Sample district-level data
    const districtData = await Demographics.findOne({ 
      level: "district", 
      residence: "total" 
    });
    
    if (districtData) {
      console.log("\n📊 District-Level Data (Total):");
      console.log("═".repeat(60));
      console.log(`  District              : ${districtData.district}`);
      console.log(`  Total Population      : ${districtData.totalPopulation.toLocaleString()}`);
      console.log(`  Male Population       : ${districtData.malePopulation.toLocaleString()}`);
      console.log(`  Female Population     : ${districtData.femalePopulation.toLocaleString()}`);
      console.log(`  Total Households      : ${districtData.totalHouseholds.toLocaleString()}`);
      console.log(`  Child Population (0-6): ${districtData.childPopulation.toLocaleString()}`);
      console.log(`  SC Population         : ${districtData.scPopulation.toLocaleString()}`);
      console.log(`  ST Population         : ${districtData.stPopulation.toLocaleString()}`);
      const sexRatio = ((districtData.femalePopulation / districtData.malePopulation) * 1000).toFixed(0);
      console.log(`  Sex Ratio             : ${sexRatio} (females per 1000 males)`);
      const childRatio = ((districtData.childPopulation / districtData.totalPopulation) * 100).toFixed(2);
      console.log(`  Child Ratio           : ${childRatio}%`);
      console.log("═".repeat(60));
    }

    console.log(`\n🎉 Census data import completed successfully!`);

  } catch (error) {
    console.error("❌ Error importing census data:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the import function
importCensusData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

