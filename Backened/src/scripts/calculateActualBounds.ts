import fs from "fs";
import path from "path";

/**
 * Calculate actual bounds from Badaun GeoJSON file
 */
function calculateActualBounds() {
  try {
    const filePath = path.join(__dirname, "../assets/districts/badaun/badaun.ervc.geojson");
    const geoData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    
    console.log("📍 Calculating Actual Budaun District Bounds from GeoJSON...\n");
    
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    
    geoData.features.forEach((feature: any) => {
      if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates[0].forEach((coord: number[]) => {
          const [lng, lat] = coord;
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        });
      }
    });
    
    console.log("Calculated Bounds from GeoJSON:");
    console.log("═".repeat(60));
    console.log(`North (max lat): ${maxLat.toFixed(6)}°`);
    console.log(`South (min lat): ${minLat.toFixed(6)}°`);
    console.log(`East (max lng):  ${maxLng.toFixed(6)}°`);
    console.log(`West (min lng):  ${minLng.toFixed(6)}°`);
    
    console.log("\nRecommended Bounds (with small buffer):");
    console.log("═".repeat(60));
    const buffer = 0.05; // ~5km buffer
    console.log(`North: ${(maxLat + buffer).toFixed(2)}°`);
    console.log(`South: ${(minLat - buffer).toFixed(2)}°`);
    console.log(`East:  ${(maxLng + buffer).toFixed(2)}°`);
    console.log(`West:  ${(minLng - buffer).toFixed(2)}°`);
    
    console.log("\nCurrent Bounds in Code:");
    console.log("═".repeat(60));
    console.log("North: 28.55°");
    console.log("South: 27.75°");
    console.log("East:  79.45°");
    console.log("West:  78.35°");
    
    console.log("\nUpdate boundary-validation.ts with actual bounds!");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

calculateActualBounds();




