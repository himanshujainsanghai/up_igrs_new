import mongoose from "mongoose";
import Demographics from "../models/Demographics";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mpmla";

/**
 * Verify Subdistrict Mapping & Handle Missing Data
 * 
 * Checks if all 5 Badaun subdistricts are properly mapped in Demographics
 * Provides recommendations for handling missing data
 */

const BADAUN_SUBDISTRICTS = [
  { name: "Bilsi", lgd: 780, nameVariations: ["BILSI", "Bilsi", "bilsi", "00780", "780"] },
  { name: "Bisauli", lgd: 779, nameVariations: ["BISAULI", "Bisauli", "bisauli", "00779", "779"] },
  { name: "Budaun", lgd: 782, nameVariations: ["BUDAUN", "Budaun", "budaun", "BADAUN", "Badaun", "00782", "782"] },
  { name: "Dataganj", lgd: 783, nameVariations: ["DATAGANJ", "Dataganj", "dataganj", "00783", "783"] },
  { name: "Sahaswan", lgd: 781, nameVariations: ["SAHASWAN", "Sahaswan", "sahaswan", "00781", "781"] },
  { name: "Gunnaur", lgd: 778, nameVariations: ["GUNNAUR", "Gunnaur", "gunnaur", "00778", "778"] }
];

async function checkSubdistrictInDemographics(sub: typeof BADAUN_SUBDISTRICTS[0]) {
  // Try to find by LGD code first (most reliable)
  let demo = await Demographics.findOne({
    level: "subdistrict",
    subdistrictLgd: sub.lgd,
    residence: "total"
  });
  
  if (demo) {
    return { found: true, method: "LGD code", data: demo };
  }
  
  // Try to find by name variations
  for (const nameVar of sub.nameVariations) {
    demo = await Demographics.findOne({
      level: "subdistrict",
      subdistrict: new RegExp(`^${nameVar}$`, 'i'),
      residence: "total"
    });
    
    if (demo) {
      return { found: true, method: `Name: ${nameVar}`, data: demo, needsLgdUpdate: true };
    }
  }
  
  // Check if exists without LGD
  demo = await Demographics.findOne({
    level: "subdistrict",
    subdistrict: new RegExp(sub.name, 'i')
  });
  
  if (demo) {
    return { found: true, method: "Name (fuzzy)", data: demo, needsLgdUpdate: true };
  }
  
  return { found: false, method: null, data: null };
}

async function verifyAndFixSubdistricts() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    
    console.log("\n🔍 Verifying All 5 Badaun Subdistricts...");
    console.log("═".repeat(70));
    
    let foundCount = 0;
    let missingSubdistricts: string[] = [];
    let needsLgdUpdate: string[] = [];
    
    for (const sub of BADAUN_SUBDISTRICTS) {
      console.log(`\n📍 Checking ${sub.name} (LGD: ${sub.lgd})...`);
      
      const result = await checkSubdistrictInDemographics(sub);
      
      if (result.found && result.data) {
        foundCount++;
        console.log(`  ✅ FOUND via ${result.method}`);
        
        // Check if LGD needs updating
        if (result.needsLgdUpdate && !result.data.subdistrictLgd) {
          needsLgdUpdate.push(sub.name);
          console.log(`  ⚠️  LGD code missing - will update`);
          
          // Update LGD code
          await Demographics.updateMany(
            { 
              level: "subdistrict",
              subdistrict: new RegExp(`^${sub.name}$`, 'i')
            },
            {
              $set: { subdistrictLgd: sub.lgd }
            }
          );
          
          console.log(`  ✅ Updated LGD code to ${sub.lgd}`);
        }
        
        // Show stats
        const pop = result.data.totalPopulation || 0;
        const hh = result.data.totalHouseholds || 0;
        console.log(`  Population: ${pop.toLocaleString()}`);
        console.log(`  Households: ${hh.toLocaleString()}`);
        
        // Count villages
        const villageCount = await Demographics.countDocuments({
          $or: [
            { subdistrictLgd: sub.lgd, level: "village" },
            { subdistrict: new RegExp(`^${sub.name}$`, 'i'), level: "village" }
          ]
        });
        console.log(`  Villages: ${villageCount}`);
        
      } else {
        missingSubdistricts.push(sub.name);
        console.log(`  ❌ NOT FOUND`);
        console.log(`  ⚠️  No demographics data for ${sub.name}`);
      }
    }
    
    // SUMMARY
    console.log("\n" + "═".repeat(70));
    console.log("📊 VERIFICATION SUMMARY");
    console.log("═".repeat(70));
    console.log(`  Total Subdistricts    : 6 (Bilsi, Bisauli, Budaun, Dataganj, Sahaswan, Gunnaur)`);
    console.log(`  Found in Database     : ${foundCount}`);
    console.log(`  Missing               : ${missingSubdistricts.length}`);
    console.log(`  Updated LGD Codes     : ${needsLgdUpdate.length}`);
    
    if (missingSubdistricts.length > 0) {
      console.log("\n❌ MISSING SUBDISTRICTS:");
      missingSubdistricts.forEach(name => {
        console.log(`  - ${name}`);
      });
      console.log("\n🔧 HOW TO FIX:");
      console.log("  1. Check if census data was imported: npm run import-census");
      console.log("  2. Check Excel file has data for missing subdistricts");
      console.log("  3. Verify subdistrict name spelling in Excel matches:");
      missingSubdistricts.forEach(name => {
        const sub = BADAUN_SUBDISTRICTS.find(s => s.name === name);
        if (sub && sub.nameVariations) {
          console.log(`     - "${name}" or ${sub.nameVariations.join(' or ')}`);
        }
      });
    } else {
      console.log("\n✅ ALL 5 SUBDISTRICTS FOUND AND MAPPED!");
    }
    
    if (needsLgdUpdate.length > 0) {
      console.log("\n✅ FIXED LGD CODES FOR:");
      needsLgdUpdate.forEach(name => console.log(`  - ${name}`));
    }
    
    // Check data consistency across all subdistricts
    console.log("\n📊 DATA CONSISTENCY CHECK:");
    console.log("═".repeat(70));
    
    const totalSubdistrictPop = await Demographics.aggregate([
      { $match: { level: "subdistrict", residence: "total" } },
      { $group: { _id: null, total: { $sum: "$totalPopulation" } } }
    ]);
    
    const districtPop = await Demographics.findOne({
      level: "district",
      residence: "total"
    });
    
    if (totalSubdistrictPop.length > 0 && districtPop) {
      const subdistrictSum = totalSubdistrictPop[0].total;
      const districtTotal = districtPop.totalPopulation || 0;
      const difference = Math.abs(subdistrictSum - districtTotal);
      const percentDiff = ((difference / districtTotal) * 100).toFixed(2);
      
      console.log(`  District Total Population      : ${districtTotal.toLocaleString()}`);
      console.log(`  Sum of Subdistrict Populations : ${subdistrictSum.toLocaleString()}`);
      console.log(`  Difference                     : ${difference.toLocaleString()} (${percentDiff}%)`);
      
      if (parseFloat(percentDiff) < 1) {
        console.log(`  ✅ Data is consistent (< 1% difference)`);
      } else {
        console.log(`  ⚠️  Warning: ${percentDiff}% difference detected`);
      }
    }
    
    console.log("\n🎉 Verification completed!");
    
  } catch (error) {
    console.error("❌ Error during verification:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run verification
verifyAndFixSubdistricts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

