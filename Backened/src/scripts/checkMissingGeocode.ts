import mongoose from "mongoose";
import Demographics from "../models/Demographics";
import Village from "../models/Village";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mpmla";

/**
 * Check what data is missing coordinates and needs geocoding
 */
async function checkMissingGeocode() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");
    
    // ============================================
    // CHECK VILLAGES
    // ============================================
    console.log("📍 VILLAGES - Geocoding Status");
    console.log("═".repeat(70));
    
    const villagesTotal = await Demographics.countDocuments({ level: "village" });
    const villagesWithCoords = await Demographics.countDocuments({
      level: "village",
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    });
    const villagesNeedGeocode = villagesTotal - villagesWithCoords;
    
    console.log(`Total Villages in Demographics: ${villagesTotal}`);
    console.log(`With Coordinates: ${villagesWithCoords} (${((villagesWithCoords/villagesTotal)*100).toFixed(1)}%)`);
    console.log(`Need Geocoding: ${villagesNeedGeocode} (${((villagesNeedGeocode/villagesTotal)*100).toFixed(1)}%)`);
    
    // Sample villages that need geocoding
    if (villagesNeedGeocode > 0) {
      console.log("\n📋 Sample villages needing geocoding (first 10):");
      const samples = await Demographics.find({
        level: "village",
        $or: [
          { latitude: { $exists: false } },
          { latitude: null }
        ]
      }).limit(10).select('areaName subdistrict subdistrictLgd totalPopulation townVillageCode');
      
      samples.forEach((v, i) => {
        console.log(`${(i+1).toString().padStart(2)}. ${v.areaName?.padEnd(30)} - ${v.subdistrict} (Pop: ${v.totalPopulation?.toLocaleString()})`);
        console.log(`    EB Code: ${v.townVillageCode || 'N/A'}`);
        console.log(`    Geocode query: "${v.areaName}, ${v.subdistrict}, Budaun, Uttar Pradesh, India"`);
      });
    }
    
    // Check Village model
    console.log("\n📊 Village Model Check:");
    const villageModelTotal = await Village.countDocuments({});
    const villageModelGeocoded = await Village.countDocuments({ isGeocoded: true });
    console.log(`Total in Village Model: ${villageModelTotal}`);
    console.log(`Geocoded: ${villageModelGeocoded}`);
    console.log(`Need Geocoding: ${villageModelTotal - villageModelGeocoded}`);
    
    // ============================================
    // CHECK TOWNS
    // ============================================
    console.log("\n\n📍 TOWNS - Geocoding Status");
    console.log("═".repeat(70));
    
    const townsTotal = await Demographics.countDocuments({ level: "town" });
    const townsWithCoords = await Demographics.countDocuments({
      level: "town",
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    });
    const townsNeedGeocode = townsTotal - townsWithCoords;
    
    console.log(`Total Towns: ${townsTotal}`);
    console.log(`With Coordinates: ${townsWithCoords} (${((townsWithCoords/townsTotal)*100).toFixed(1)}%)`);
    console.log(`Need Geocoding: ${townsNeedGeocode} (${((townsNeedGeocode/townsTotal)*100).toFixed(1)}%)`);
    
    if (townsNeedGeocode > 0) {
      console.log("\n📋 Towns needing geocoding:");
      const townSamples = await Demographics.find({
        level: "town",
        $or: [
          { latitude: { $exists: false } },
          { latitude: null }
        ]
      }).select('areaName subdistrict subdistrictLgd totalPopulation');
      
      townSamples.forEach((t, i) => {
        console.log(`${(i+1).toString().padStart(2)}. ${t.areaName?.padEnd(30)} - ${t.subdistrict} (Pop: ${t.totalPopulation?.toLocaleString()})`);
        console.log(`    Geocode query: "${t.areaName}, ${t.subdistrict}, Budaun, Uttar Pradesh, India"`);
      });
    }
    
    // ============================================
    // CHECK WARDS
    // ============================================
    console.log("\n\n📍 WARDS - Geocoding Status");
    console.log("═".repeat(70));
    
    const wardsTotal = await Demographics.countDocuments({ level: "ward" });
    const wardsWithCoords = await Demographics.countDocuments({
      level: "ward",
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    });
    const wardsNeedGeocode = wardsTotal - wardsWithCoords;
    
    console.log(`Total Wards: ${wardsTotal}`);
    console.log(`With Coordinates: ${wardsWithCoords} (${((wardsWithCoords/wardsTotal)*100).toFixed(1)}%)`);
    console.log(`Need Geocoding: ${wardsNeedGeocode} (${((wardsNeedGeocode/wardsTotal)*100).toFixed(1)}%)`);
    
    if (wardsNeedGeocode > 0 && wardsNeedGeocode <= 10) {
      console.log("\n📋 Wards needing geocoding (first 10):");
      const wardSamples = await Demographics.find({
        level: "ward",
        $or: [
          { latitude: { $exists: false } },
          { latitude: null }
        ]
      }).limit(10).select('areaName subdistrict totalPopulation');
      
      wardSamples.forEach((w, i) => {
        console.log(`${(i+1).toString().padStart(2)}. ${w.areaName?.padEnd(40)} - ${w.subdistrict}`);
        console.log(`    Geocode query: "${w.areaName}, Budaun, Uttar Pradesh, India"`);
      });
    } else if (wardsNeedGeocode > 10) {
      console.log(`\n⚠️  Too many to list (${wardsNeedGeocode} wards need geocoding)`);
    }
    
    // ============================================
    // DATA QUALITY CHECK
    // ============================================
    console.log("\n\n🔍 DATA QUALITY CHECK");
    console.log("═".repeat(70));
    
    // Check for records with missing critical data
    const missingNames = await Demographics.countDocuments({
      level: { $in: ["village", "town", "ward"] },
      $or: [
        { areaName: { $exists: false } },
        { areaName: null },
        { areaName: "" }
      ]
    });
    
    const missingSubdistrict = await Demographics.countDocuments({
      level: { $in: ["village", "town", "ward"] },
      $or: [
        { subdistrict: { $exists: false } },
        { subdistrict: null },
        { subdistrict: "" }
      ]
    });
    
    console.log(`Records with missing area name: ${missingNames}`);
    console.log(`Records with missing subdistrict: ${missingSubdistrict}`);
    
    if (missingNames > 0 || missingSubdistrict > 0) {
      console.log("\n⚠️  WARNING: Some records have missing data!");
      console.log("   → These cannot be geocoded without names/hierarchy");
    } else {
      console.log("\n✅ All records have required data for geocoding!");
    }
    
    // ============================================
    // SUMMARY & RECOMMENDATIONS
    // ============================================
    console.log("\n\n📊 GEOCODING SUMMARY");
    console.log("═".repeat(70));
    
    const totalNeedGeocode = villagesNeedGeocode + townsNeedGeocode + wardsNeedGeocode;
    const totalWithCoords = villagesWithCoords + townsWithCoords + wardsWithCoords;
    const grandTotal = villagesTotal + townsTotal + wardsTotal;
    
    console.log(`\nTotal Geographic Entities: ${grandTotal}`);
    console.log(`  ├─ Villages: ${villagesTotal}`);
    console.log(`  ├─ Towns: ${townsTotal}`);
    console.log(`  └─ Wards: ${wardsTotal}`);
    
    console.log(`\nWith Coordinates: ${totalWithCoords} (${((totalWithCoords/grandTotal)*100).toFixed(1)}%)`);
    console.log(`  ├─ Villages: ${villagesWithCoords}/${villagesTotal}`);
    console.log(`  ├─ Towns: ${townsWithCoords}/${townsTotal}`);
    console.log(`  └─ Wards: ${wardsWithCoords}/${wardsTotal}`);
    
    console.log(`\nNeed Geocoding: ${totalNeedGeocode} (${((totalNeedGeocode/grandTotal)*100).toFixed(1)}%)`);
    console.log(`  ├─ Villages: ${villagesNeedGeocode}`);
    console.log(`  ├─ Towns: ${townsNeedGeocode}`);
    console.log(`  └─ Wards: ${wardsNeedGeocode}`);
    
    // ============================================
    // API CALL ESTIMATES
    // ============================================
    console.log("\n\n⏱️  GEOCODING TIME ESTIMATES (Nominatim - FREE)");
    console.log("═".repeat(70));
    
    const villageTime = Math.ceil(villagesNeedGeocode * 1.1); // seconds
    const townTime = Math.ceil(townsNeedGeocode * 1.1);
    const wardTime = Math.ceil(wardsNeedGeocode * 1.1);
    const totalTime = villageTime + townTime + wardTime;
    
    console.log(`Villages (${villagesNeedGeocode}): ~${(villageTime/60).toFixed(0)} minutes`);
    console.log(`Towns (${townsNeedGeocode}): ~${(townTime/60).toFixed(0)} minutes (~${townTime} seconds)`);
    console.log(`Wards (${wardsNeedGeocode}): ~${(wardTime/60).toFixed(0)} minutes`);
    console.log(`\nTOTAL TIME: ~${(totalTime/60).toFixed(0)} minutes (${(totalTime/3600).toFixed(1)} hours)`);
    console.log(`Rate: 1 request per 1.1 seconds (Nominatim limit)`);
    
    // ============================================
    // RECOMMENDATIONS
    // ============================================
    console.log("\n\n💡 RECOMMENDATIONS");
    console.log("═".repeat(70));
    
    console.log("\n1. PRIORITIZE TOWNS (Quick Win):");
    console.log(`   → Only ${townsNeedGeocode} towns need geocoding`);
    console.log(`   → Takes ~${(townTime/60).toFixed(0)} minutes`);
    console.log(`   → Run: POST /api/v1/demographics/geocode-towns`);
    
    console.log("\n2. BATCH GEOCODE VILLAGES:");
    console.log(`   → ${villagesNeedGeocode} villages need geocoding`);
    console.log(`   → Do in batches of 100-500`);
    console.log(`   → Run multiple times: Geocode 10 button`);
    
    console.log("\n3. SKIP WARDS (Optional):");
    console.log(`   → ${wardsNeedGeocode} wards (many!)`);
    console.log(`   → Takes ~${(wardTime/60).toFixed(0)} minutes`);
    console.log(`   → Ward-level coordinates less critical for heat map`);
    console.log(`   → Can use parent town coordinates instead`);
    
    console.log("\n4. DATA NEEDED FOR GEOCODING:");
    console.log("   ✅ Area name (have for all)");
    console.log("   ✅ Subdistrict name (have for all)");
    console.log("   ✅ District name (Budaun)");
    console.log("   ✅ State name (Uttar Pradesh)");
    console.log("   ✅ Geocoding API (Nominatim FREE)");
    console.log("   ❌ Coordinates (need to get from API)");
    
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkMissingGeocode();

