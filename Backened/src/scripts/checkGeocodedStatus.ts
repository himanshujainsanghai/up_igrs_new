import mongoose from "mongoose";
import Demographics from "../models/Demographics";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mpmla";

async function checkGeocodedStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected\n");
    
    // Check geocoded towns
    console.log("📍 TOWNS with Coordinates:");
    console.log("═".repeat(70));
    
    const townsWithCoords = await Demographics.find({
      level: "town",
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    }).select('areaName latitude longitude totalPopulation subdistrict');
    
    console.log(`Found ${townsWithCoords.length} towns with coordinates:\n`);
    townsWithCoords.forEach((t, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${t.areaName}`);
      console.log(`    Coords: ${t.latitude}, ${t.longitude}`);
      console.log(`    Pop: ${t.totalPopulation?.toLocaleString()} | ${t.subdistrict}`);
    });
    
    if (townsWithCoords.length === 0) {
      console.log("  ❌ NO TOWNS GEOCODED YET!");
      console.log("  → Need to run geocoding first");
      console.log("  → Use: POST /api/v1/demographics/geocode-towns");
    }
    
    // Check geocoded wards
    console.log("\n\n📍 WARDS with Coordinates:");
    console.log("═".repeat(70));
    
    const wardsWithCoords = await Demographics.find({
      level: "ward",
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    }).select('areaName latitude longitude').limit(10);
    
    console.log(`Found ${wardsWithCoords.length} wards with coordinates (showing first 10):\n`);
    wardsWithCoords.forEach((w, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${w.areaName}`);
      console.log(`    Coords: ${w.latitude}, ${w.longitude}`);
    });
    
    if (wardsWithCoords.length === 0) {
      console.log("  ❌ NO WARDS GEOCODED YET!");
    }
    
    // Check villages
    console.log("\n\n📍 VILLAGES with Coordinates:");
    console.log("═".repeat(70));
    
    const villagesWithCoords = await Demographics.find({
      level: "village",
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    }).limit(10);
    
    console.log(`Found villages with coordinates (showing first 10):\n`);
    villagesWithCoords.forEach((v, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${v.areaName}`);
      console.log(`    Coords: ${v.latitude}, ${v.longitude}`);
    });
    
    // Summary
    const townTotal = await Demographics.countDocuments({ level: "town" });
    const townGeocoded = await Demographics.countDocuments({ 
      level: "town",
      latitude: { $exists: true, $ne: null }
    });
    
    const wardTotal = await Demographics.countDocuments({ level: "ward" });
    const wardGeocoded = await Demographics.countDocuments({ 
      level: "ward",
      latitude: { $exists: true, $ne: null }
    });
    
    const villageTotal = await Demographics.countDocuments({ level: "village" });
    const villageGeocoded = await Demographics.countDocuments({ 
      level: "village",
      latitude: { $exists: true, $ne: null }
    });
    
    console.log("\n\n📊 GEOCODING SUMMARY:");
    console.log("═".repeat(70));
    console.log(`Towns:    ${townGeocoded}/${townTotal} geocoded (${((townGeocoded/townTotal)*100).toFixed(1)}%)`);
    console.log(`Wards:    ${wardGeocoded}/${wardTotal} geocoded (${((wardGeocoded/wardTotal)*100).toFixed(1)}%)`);
    console.log(`Villages: ${villageGeocoded}/${villageTotal} geocoded (${((villageGeocoded/villageTotal)*100).toFixed(1)}%)`);
    
    if (townGeocoded === 0) {
      console.log("\n⚠️  ISSUE: No towns have coordinates!");
      console.log("   → Markers won't show on map");
      console.log("   → Need to geocode towns first");
      console.log("   → Frontend will filter out towns without coordinates");
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkGeocodedStatus();

