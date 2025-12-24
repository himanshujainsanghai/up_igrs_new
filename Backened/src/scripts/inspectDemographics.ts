import mongoose from "mongoose";
import Demographics from "../models/Demographics";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mpmla";

async function inspect() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected\n");
    
    // Check sample village records
    console.log("📊 Sample Village Records:");
    console.log("═".repeat(70));
    const villages = await Demographics.find({ level: "village" }).limit(5);
    
    villages.forEach((v, i) => {
      console.log(`\n${i + 1}. Level: ${v.level}`);
      console.log(`   Area Name: ${v.areaName}`);
      console.log(`   Subdistrict: ${v.subdistrict}`);
      console.log(`   Subdistrict LGD: ${v.subdistrictLgd}`);
      console.log(`   Town/Village: ${v.townVillageWard}`);
      console.log(`   Population: ${v.totalPopulation}`);
      console.log(`   Residence: ${v.residence}`);
    });
    
    // Check what levels exist
    console.log("\n\n📊 Levels in Database:");
    console.log("═".repeat(70));
    const levels = await Demographics.aggregate([
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    levels.forEach(l => {
      console.log(`  ${l._id?.padEnd(15)}: ${l.count} records`);
    });
    
    // Check subdistrict field values
    console.log("\n\n📊 Subdistrict Field Values (unique):");
    console.log("═".repeat(70));
    const subdistrictsInDB = await Demographics.aggregate([
      { $match: { subdistrict: { $exists: true, $ne: null } } },
      { $group: { _id: "$subdistrict", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    subdistrictsInDB.forEach(s => {
      console.log(`  "${s._id}": ${s.count} records`);
    });
    
   // Check if subdistrict LGD exists
    console.log("\n\n📊 Subdistrict LGD Values:");
    console.log("═".repeat(70));
    const lgds = await Demographics.aggregate([
      { $match: { subdistrictLgd: { $exists: true, $ne: null } } },
      { $group: { _id: "$subdistrictLgd", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    if (lgds.length === 0) {
      console.log("  ⚠️  NO subdistrictLgd values found!");
      console.log("  → The Excel 'Subdistt' column needs to be mapped to LGD codes");
    } else {
      lgds.forEach(l => {
        console.log(`  LGD ${l._id}: ${l.count} records`);
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

inspect();

