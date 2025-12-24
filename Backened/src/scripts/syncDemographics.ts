import mongoose from "mongoose";
import Demographics from "../models/Demographics";
import District from "../models/District";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mpmla";

/**
 * Sync Demographics Data with District and Village Models
 * 
 * This script:
 * 1. Updates District model with census data
 * 2. Links villages to their demographics records
 * 3. Verifies data consistency
 */

// Normalize name for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function syncDistrictData() {
  console.log("\n📊 Syncing District Data...");
  console.log("═".repeat(60));
  
  try {
    // Get district demographics (total)
    const districtDemo = await Demographics.findOne({
      level: "district",
      districtLgd: 134,
      residence: "total"
    });
    
    if (!districtDemo) {
      console.log("  ⚠️  No district demographics found. Import census data first.");
      return;
    }
    
    // Get district record
    const district = await District.findOne({ districtLgd: 134 });
    
    const villageCount = await Demographics.countDocuments({
      level: "village",
      districtLgd: 134
    });
    
    if (!district) {
      console.log("  ⚠️  District record not found. Creating...");
      
      // Create district record
      await District.create({
        districtName: "Budaun",
        districtLgd: 134,
        stateName: "Uttar Pradesh",
        stateLgd: 9,
        area: 5168, // km² (approximate)
        population: districtDemo.totalPopulation || 0,
        malePopulation: districtDemo.malePopulation || 0,
        femalePopulation: districtDemo.femalePopulation || 0,
        language: "Hindi",
        totalVillages: villageCount,
        headquarters: "Budaun"
      });
      
      console.log("  ✅ District record created");
    } else {
      // Update existing district
      await District.updateOne(
        { districtLgd: 134 },
        {
          $set: {
            population: districtDemo.totalPopulation || 0,
            malePopulation: districtDemo.malePopulation || 0,
            femalePopulation: districtDemo.femalePopulation || 0,
            totalVillages: villageCount
          }
        }
      );
      
      console.log("  ✅ District data updated");
    }
    
    // Print stats
    console.log("\n  District Statistics:");
    console.log("  ─".repeat(60));
    console.log(`    Total Population      : ${(districtDemo.totalPopulation || 0).toLocaleString()}`);
    console.log(`    Male Population       : ${(districtDemo.malePopulation || 0).toLocaleString()}`);
    console.log(`    Female Population     : ${(districtDemo.femalePopulation || 0).toLocaleString()}`);
    console.log(`    Total Households      : ${(districtDemo.totalHouseholds || 0).toLocaleString()}`);
    console.log(`    Total Villages        : ${villageCount}`);
    
    const malePopulation = districtDemo.malePopulation || 1;
    const femalePopulation = districtDemo.femalePopulation || 0;
    const totalPopulation = districtDemo.totalPopulation || 0;
    
    const sexRatio = ((femalePopulation / malePopulation) * 1000).toFixed(0);
    console.log(`    Sex Ratio             : ${sexRatio} (females per 1000 males)`);
    
  } catch (error) {
    console.error("  ❌ Error syncing district data:", error);
    throw error;
  }
}

async function analyzeSubdistrictData() {
  console.log("\n📊 Subdistrict Analysis...");
  console.log("═".repeat(60));
  
  const subdistricts = [
    { name: "Bilsi", lgd: 780 },
    { name: "Bisauli", lgd: 779 },
    { name: "Budaun", lgd: 782 },
    { name: "Dataganj", lgd: 783 },
    { name: "Sahaswan", lgd: 781 }
  ];
  
  let foundCount = 0;
  let missingSubdistricts: string[] = [];
  
  for (const sub of subdistricts) {
    const demo = await Demographics.findOne({
      level: "subdistrict",
      subdistrictLgd: sub.lgd,
      residence: "total"
    });
    
    if (demo) {
      foundCount++;
      
      const villageCount = await Demographics.countDocuments({
        level: "village",
        subdistrictLgd: sub.lgd
      });
      
      const townCount = await Demographics.countDocuments({
        level: "town",
        subdistrictLgd: sub.lgd
      });
      
      console.log(`\n  ✅ ${sub.name} (LGD: ${sub.lgd})`);
      console.log("  ─".repeat(60));
      console.log(`    Population        : ${(demo.totalPopulation || 0).toLocaleString()}`);
      console.log(`    Households        : ${(demo.totalHouseholds || 0).toLocaleString()}`);
      console.log(`    Villages          : ${villageCount}`);
      console.log(`    Towns             : ${townCount}`);
      
      const malePopulation = demo.malePopulation || 1;
      const femalePopulation = demo.femalePopulation || 0;
      const totalPopulation = demo.totalPopulation || 1;
      
      const sexRatio = ((femalePopulation / malePopulation) * 1000).toFixed(0);
      console.log(`    Sex Ratio         : ${sexRatio}`);
      
      const scPercent = (((demo.scPopulation || 0) / totalPopulation) * 100).toFixed(2);
      console.log(`    SC Population     : ${scPercent}%`);
    } else {
      missingSubdistricts.push(sub.name);
      console.log(`\n  ❌ ${sub.name} (LGD: ${sub.lgd}) - NO DATA FOUND`);
    }
  }
  
  // Summary
  console.log("\n" + "═".repeat(60));
  console.log(`  Subdistrict Data Summary: ${foundCount}/5 found`);
  if (missingSubdistricts.length > 0) {
    console.log(`  ⚠️  Missing data for: ${missingSubdistricts.join(", ")}`);
    console.log(`  → Action: Check if census data was imported correctly`);
    console.log(`  → Run: npm run import-census`);
  } else {
    console.log(`  ✅ All 5 subdistricts have demographics data!`);
  }
  console.log("═".repeat(60));
}

async function analyzeVillageData() {
  console.log("\n📊 Village Data Analysis...");
  console.log("═".repeat(60));
  
  const totalVillages = await Demographics.countDocuments({ level: "village" });
  const totalTowns = await Demographics.countDocuments({ level: "town" });
  const totalWards = await Demographics.countDocuments({ level: "ward" });
  
  console.log(`  Total Villages        : ${totalVillages}`);
  console.log(`  Total Towns           : ${totalTowns}`);
  console.log(`  Total Wards           : ${totalWards}`);
  
  // Top 10 most populous villages
  console.log("\n  Top 10 Most Populous Villages:");
  console.log("  ─".repeat(60));
  
  const topVillages = await Demographics.find({ level: "village" })
    .sort({ totalPopulation: -1 })
    .limit(10)
    .select('townVillageWard subdistrict totalPopulation totalHouseholds');
  
  topVillages.forEach((village, index) => {
    const name = village.townVillageWard || "Unknown";
    const pop = (village.totalPopulation || 0).toLocaleString();
    const sub = village.subdistrict || "Unknown";
    console.log(`    ${(index + 1).toString().padStart(2)}. ${name.padEnd(30)} - Pop: ${pop.padStart(8)} (${sub})`);
  });
  
  // Rural vs Urban population
  console.log("\n  Urban vs Rural Distribution:");
  console.log("  ─".repeat(60));
  
  const ruralPop = await Demographics.aggregate([
    { $match: { level: "village", residence: "rural" } },
    { $group: { _id: null, total: { $sum: "$totalPopulation" } } }
  ]);
  
  const urbanPop = await Demographics.aggregate([
    { $match: { level: { $in: ["town", "ward"] }, residence: "urban" } },
    { $group: { _id: null, total: { $sum: "$totalPopulation" } } }
  ]);
  
  if (ruralPop.length > 0 && urbanPop.length > 0) {
    const rural = ruralPop[0].total;
    const urban = urbanPop[0].total;
    const total = rural + urban;
    
    console.log(`    Rural Population  : ${rural.toLocaleString()} (${((rural/total)*100).toFixed(2)}%)`);
    console.log(`    Urban Population  : ${urban.toLocaleString()} (${((urban/total)*100).toFixed(2)}%)`);
  }
}

async function verifyDataIntegrity() {
  console.log("\n✅ Verifying Data Integrity...");
  console.log("═".repeat(60));
  
  let errors = 0;
  let warnings = 0;
  
  // Check 1: Male + Female = Total
  const invalidGender = await Demographics.find({
    $expr: {
      $gt: [
        {
          $abs: {
            $subtract: [
              "$totalPopulation",
              { $add: ["$malePopulation", "$femalePopulation"] }
            ]
          }
        },
        1  // Allow 1 person rounding error
      ]
    }
  }).limit(5);
  
  if (invalidGender.length > 0) {
    errors++;
    console.log(`  ❌ Found ${invalidGender.length} records where Male+Female ≠ Total`);
    invalidGender.forEach(doc => {
      console.log(`     ${doc.areaName}: Total=${doc.totalPopulation}, Male=${doc.malePopulation}, Female=${doc.femalePopulation}`);
    });
  } else {
    console.log("  ✅ All records have valid gender distribution");
  }
  
  // Check 2: Child population <= Total
  const invalidChild = await Demographics.find({
    $expr: { $gt: ["$childPopulation", "$totalPopulation"] }
  }).limit(5);
  
  if (invalidChild.length > 0) {
    errors++;
    console.log(`  ❌ Found ${invalidChild.length} records where Child > Total`);
  } else {
    console.log("  ✅ All child population values are valid");
  }
  
  // Check 3: SC + ST <= Total
  const invalidCaste = await Demographics.find({
    $expr: {
      $gt: [
        { $add: ["$scPopulation", "$stPopulation"] },
        "$totalPopulation"
      ]
    }
  }).limit(5);
  
  if (invalidCaste.length > 0) {
    warnings++;
    console.log(`  ⚠️  Found ${invalidCaste.length} records where SC+ST > Total`);
  } else {
    console.log("  ✅ All SC/ST population values are valid");
  }
  
  // Check 4: All subdistricts have data
  const subdistricts = [780, 779, 782, 783, 781];
  for (const lgd of subdistricts) {
    const count = await Demographics.countDocuments({ subdistrictLgd: lgd });
    if (count === 0) {
      warnings++;
      console.log(`  ⚠️  No data found for subdistrict LGD ${lgd}`);
    }
  }
  
  // Summary
  console.log("\n  Summary:");
  console.log("  ─".repeat(60));
  if (errors === 0 && warnings === 0) {
    console.log("  ✅ All integrity checks passed!");
  } else {
    console.log(`    Errors   : ${errors}`);
    console.log(`    Warnings : ${warnings}`);
  }
}

async function syncDemographics() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    
    // Step 1: Sync district data
    await syncDistrictData();
    
    // Step 2: Analyze subdistricts
    await analyzeSubdistrictData();
    
    // Step 3: Analyze villages
    await analyzeVillageData();
    
    // Step 4: Verify integrity
    await verifyDataIntegrity();
    
    console.log("\n🎉 Demographics sync completed successfully!");
    
  } catch (error) {
    console.error("❌ Error syncing demographics:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the sync function
syncDemographics()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


