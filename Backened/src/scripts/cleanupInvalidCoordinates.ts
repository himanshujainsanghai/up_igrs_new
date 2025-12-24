import mongoose from "mongoose";
import Demographics from "../models/Demographics";
import { validateBudaunLocation } from "../utils/boundary-validation";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mpmla";

/**
 * Clean up coordinates that are outside Budaun district bounds
 */
async function cleanupInvalidCoordinates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");
    
    console.log("🧹 Cleaning Up Invalid Coordinates...");
    console.log("═".repeat(70));
    
    // Find all geocoded items
    const geocoded = await Demographics.find({
      level: { $in: ["village", "town", "ward"] },
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    });
    
    console.log(`\nFound ${geocoded.length} items with coordinates`);
    console.log("Validating each location...\n");
    
    let invalidCount = 0;
    const invalidItems: any[] = [];
    
    for (const item of geocoded) {
      const validation = validateBudaunLocation(
        item.latitude!,
        item.longitude!,
        item.areaName || "Unknown"
      );
      
      if (!validation.valid) {
        invalidCount++;
        invalidItems.push({
          name: item.areaName,
          type: item.level,
          lat: item.latitude,
          lng: item.longitude,
          reason: validation.reason
        });
        
        // Remove invalid coordinates
        await Demographics.updateOne(
          { _id: item._id },
          {
            $unset: {
              latitude: "",
              longitude: ""
            },
            $set: {
              isGeocoded: false
            }
          }
        );
      }
    }
    
    console.log("📊 Cleanup Results:");
    console.log("═".repeat(70));
    console.log(`Total checked: ${geocoded.length}`);
    console.log(`Invalid (outside bounds): ${invalidCount}`);
    console.log(`Valid (kept): ${geocoded.length - invalidCount}`);
    
    if (invalidItems.length > 0) {
      console.log("\n❌ Removed invalid coordinates from:");
      invalidItems.forEach((item, i) => {
        console.log(`${(i+1).toString().padStart(2)}. ${item.name} (${item.type})`);
        console.log(`    Coords: ${item.lat}, ${item.lng}`);
        console.log(`    Reason: ${item.reason}`);
      });
      
      console.log("\n💡 These items need to be re-geocoded with better queries");
    } else {
      console.log("\n✅ All coordinates are within Budaun district bounds!");
    }
    
    // Show bounds for reference
    console.log("\n📍 Budaun District Bounds:");
    console.log("═".repeat(70));
    console.log("  North: 28.6°");
    console.log("  South: 27.7°");
    console.log("  East:  79.5°");
    console.log("  West:  78.3°");
    
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

cleanupInvalidCoordinates();

