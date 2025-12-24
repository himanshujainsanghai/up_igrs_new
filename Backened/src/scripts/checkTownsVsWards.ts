import mongoose from "mongoose";
import Demographics from "../models/Demographics";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mpmla";

async function checkTownsVsWards() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected\n");
    
    // Check levels in database
    console.log("📊 Checking Town vs Ward Distribution:");
    console.log("═".repeat(70));
    
    const levels = await Demographics.aggregate([
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log("\nAll Levels:");
    levels.forEach(l => {
      console.log(`  ${l._id?.padEnd(15)}: ${l.count} records`);
    });
    
    // Check residence types
    console.log("\n\nResidence Types:");
    console.log("═".repeat(70));
    const residences = await Demographics.aggregate([
      { $group: { _id: "$residence", count: { $sum: 1 } } }
    ]);
    residences.forEach(r => {
      console.log(`  ${r._id?.padEnd(15)}: ${r.count} records`);
    });
    
    // Check urban records that might be towns or wards
    console.log("\n\nUrban Records Breakdown:");
    console.log("═".repeat(70));
    
    const urbanByLevel = await Demographics.aggregate([
      { $match: { residence: "urban" } },
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log("Urban records by level:");
    urbanByLevel.forEach(u => {
      console.log(`  ${u._id?.padEnd(15)}: ${u.count} records`);
    });
    
    // Sample town records
    console.log("\n\nSample TOWN Records:");
    console.log("═".repeat(70));
    const townSamples = await Demographics.find({ 
      level: "town",
      residence: "urban"
    }).limit(5).select('areaName townVillageWard subdistrict totalPopulation');
    
    townSamples.forEach((t, i) => {
      console.log(`${i + 1}. ${t.areaName}`);
      console.log(`   Village/Ward: ${t.townVillageWard || 'N/A'}`);
      console.log(`   Subdistrict: ${t.subdistrict}`);
      console.log(`   Population: ${t.totalPopulation?.toLocaleString()}`);
      console.log();
    });
    
    // Sample ward records (if any)
    console.log("\nSample WARD Records:");
    console.log("═".repeat(70));
    const wardSamples = await Demographics.find({ 
      level: "ward"
    }).limit(5).select('areaName townVillageWard subdistrict totalPopulation');
    
    if (wardSamples.length === 0) {
      console.log("  ⚠️  NO WARD records found!");
      console.log("  → All urban areas classified as 'town'");
      console.log("  → May need to reclassify based on 'Ward' keyword");
    } else {
      wardSamples.forEach((w, i) => {
        console.log(`${i + 1}. ${w.areaName}`);
        console.log(`   Village/Ward: ${w.townVillageWard || 'N/A'}`);
        console.log(`   Population: ${w.totalPopulation?.toLocaleString()}`);
        console.log();
      });
    }
    
    // Check if any town names contain "Ward"
    console.log("\n\nChecking for 'Ward' keyword in TOWN records:");
    console.log("═".repeat(70));
    const possibleWards = await Demographics.find({
      level: "town",
      $or: [
        { areaName: /ward/i },
        { townVillageWard: /ward/i }
      ]
    }).limit(10).select('areaName townVillageWard totalPopulation');
    
    if (possibleWards.length > 0) {
      console.log(`  ⚠️  Found ${possibleWards.length} records classified as 'town' but containing 'Ward':`);
      possibleWards.forEach((w, i) => {
        console.log(`  ${i + 1}. ${w.areaName} (${w.townVillageWard})`);
      });
      console.log("\n  → These should probably be classified as 'ward', not 'town'");
    } else {
      console.log("  ✅ No towns containing 'Ward' keyword");
    }
    
    // Summary
    console.log("\n\n📊 SUMMARY:");
    console.log("═".repeat(70));
    const townCount = await Demographics.countDocuments({ level: "town" });
    const wardCount = await Demographics.countDocuments({ level: "ward" });
    const urbanCount = await Demographics.countDocuments({ residence: "urban" });
    
    console.log(`  Total TOWN records        : ${townCount}`);
    console.log(`  Total WARD records        : ${wardCount}`);
    console.log(`  Total URBAN records       : ${urbanCount}`);
    console.log(`  Expected (town + ward)    : ${urbanCount}`);
    
    if (townCount + wardCount === urbanCount) {
      console.log("  ✅ Classification is correct!");
    } else {
      console.log("  ⚠️  Classification may need adjustment");
      console.log(`  Difference: ${urbanCount - (townCount + wardCount)} records`);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTownsVsWards();

