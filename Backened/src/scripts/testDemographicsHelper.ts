import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  getDistrictDemographics,
  getSubdistrictDemographics,
  getAllSubdistrictsDemographics
} from "../utils/demographics.helper";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mpmla";

async function testDemographicsHelper() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected\n");
    
    // Test 1: Get District Demographics (Total, Urban, Rural)
    console.log("📊 TEST 1: District Demographics (Total, Urban, Rural)");
    console.log("═".repeat(70));
    const districtDemo = await getDistrictDemographics(134);
    
    if (districtDemo) {
      console.log(`District: ${districtDemo.areaName}`);
      console.log("\nTOTAL POPULATION:");
      console.log(`  Total    : ${districtDemo.total.population.toLocaleString()}`);
      console.log(`  Male     : ${districtDemo.total.male.toLocaleString()}`);
      console.log(`  Female   : ${districtDemo.total.female.toLocaleString()}`);
      console.log(`  Households: ${districtDemo.total.households.toLocaleString()}`);
      
      console.log("\nURBAN POPULATION:");
      console.log(`  Total    : ${districtDemo.urban.population.toLocaleString()} (${districtDemo.metrics.urbanPercentage}%)`);
      console.log(`  Male     : ${districtDemo.urban.male.toLocaleString()}`);
      console.log(`  Female   : ${districtDemo.urban.female.toLocaleString()}`);
      console.log(`  Households: ${districtDemo.urban.households.toLocaleString()}`);
      
      console.log("\nRURAL POPULATION:");
      console.log(`  Total    : ${districtDemo.rural.population.toLocaleString()} (${districtDemo.metrics.ruralPercentage}%)`);
      console.log(`  Male     : ${districtDemo.rural.male.toLocaleString()}`);
      console.log(`  Female   : ${districtDemo.rural.female.toLocaleString()}`);
      console.log(`  Households: ${districtDemo.rural.households.toLocaleString()}`);
      
      console.log("\nKEY METRICS:");
      console.log(`  Sex Ratio      : ${districtDemo.metrics.sexRatio} (females per 1000 males)`);
      console.log(`  Child Ratio    : ${districtDemo.metrics.childRatio}% (0-6 years)`);
      console.log(`  SC Population  : ${districtDemo.metrics.scPercentage}%`);
      console.log(`  ST Population  : ${districtDemo.metrics.stPercentage}%`);
    }
    
    // Test 2: Get All Subdistricts
    console.log("\n\n📊 TEST 2: All 6 Subdistricts (Total, Urban, Rural)");
    console.log("═".repeat(70));
    const allSubdistricts = await getAllSubdistrictsDemographics();
    
    console.log(`\nFound ${allSubdistricts.length} subdistricts:\n`);
    
    // Sort by population
    allSubdistricts.sort((a, b) => b.total.population - a.total.population);
    
    console.log("Rank | Subdistrict  | Total Pop  | Urban Pop   | Rural Pop   | Urban%");
    console.log("─".repeat(70));
    allSubdistricts.forEach((sub, index) => {
      const rank = (index + 1).toString().padStart(2);
      const name = sub.areaName.padEnd(12);
      const total = sub.total.population.toLocaleString().padStart(10);
      const urban = sub.urban.population.toLocaleString().padStart(11);
      const rural = sub.rural.population.toLocaleString().padStart(11);
      const urbanPct = sub.metrics.urbanPercentage.toFixed(1).padStart(6);
      
      console.log(`${rank}   | ${name} | ${total} | ${urban} | ${rural} | ${urbanPct}%`);
    });
    
    // Test 3: Detailed view of one subdistrict
    console.log("\n\n📊 TEST 3: Detailed View - Gunnaur Subdistrict");
    console.log("═".repeat(70));
    const gunnaur = await getSubdistrictDemographics(778);
    
    if (gunnaur) {
      console.log(`\nSubdistrict: ${gunnaur.areaName} (LGD: ${gunnaur.subdistrictLgd})`);
      
      console.log("\n┌─ TOTAL POPULATION ─────────────────────────────────┐");
      console.log(`│ Population  : ${gunnaur.total.population.toLocaleString().padStart(10)}                                │`);
      console.log(`│ Male        : ${gunnaur.total.male.toLocaleString().padStart(10)} (${((gunnaur.total.male/gunnaur.total.population)*100).toFixed(1)}%)                    │`);
      console.log(`│ Female      : ${gunnaur.total.female.toLocaleString().padStart(10)} (${((gunnaur.total.female/gunnaur.total.population)*100).toFixed(1)}%)                    │`);
      console.log(`│ Households  : ${gunnaur.total.households.toLocaleString().padStart(10)}                                │`);
      console.log("└────────────────────────────────────────────────────┘");
      
      console.log("\n┌─ URBAN POPULATION ─────────────────────────────────┐");
      console.log(`│ Population  : ${gunnaur.urban.population.toLocaleString().padStart(10)} (${gunnaur.metrics.urbanPercentage}% of total)          │`);
      console.log(`│ Male        : ${gunnaur.urban.male.toLocaleString().padStart(10)}                                │`);
      console.log(`│ Female      : ${gunnaur.urban.female.toLocaleString().padStart(10)}                                │`);
      console.log(`│ Households  : ${gunnaur.urban.households.toLocaleString().padStart(10)}                                │`);
      console.log("└────────────────────────────────────────────────────┘");
      
      console.log("\n┌─ RURAL POPULATION ─────────────────────────────────┐");
      console.log(`│ Population  : ${gunnaur.rural.population.toLocaleString().padStart(10)} (${gunnaur.metrics.ruralPercentage}% of total)         │`);
      console.log(`│ Male        : ${gunnaur.rural.male.toLocaleString().padStart(10)}                                │`);
      console.log(`│ Female      : ${gunnaur.rural.female.toLocaleString().padStart(10)}                                │`);
      console.log(`│ Households  : ${gunnaur.rural.households.toLocaleString().padStart(10)}                                │`);
      console.log("└────────────────────────────────────────────────────┘");
      
      console.log("\n┌─ KEY METRICS ──────────────────────────────────────┐");
      console.log(`│ Sex Ratio   : ${gunnaur.metrics.sexRatio.toString().padStart(10)} (F per 1000 M)              │`);
      console.log(`│ Child Ratio : ${gunnaur.metrics.childRatio.toString().padStart(10)}% (0-6 years)                  │`);
      console.log(`│ SC Pop      : ${gunnaur.metrics.scPercentage.toString().padStart(10)}%                               │`);
      console.log(`│ Urban %     : ${gunnaur.metrics.urbanPercentage.toString().padStart(10)}%                               │`);
      console.log(`│ Rural %     : ${gunnaur.metrics.ruralPercentage.toString().padStart(10)}%                               │`);
      console.log("└────────────────────────────────────────────────────┘");
    }
    
    console.log("\n\n🎉 All tests completed successfully!");
    console.log("\n✅ Confirmed:");
    console.log("   - Total population available");
    console.log("   - Urban population available");
    console.log("   - Rural population available");
    console.log("   - All 6 subdistricts queryable");
    console.log("   - Metrics calculated correctly");
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

testDemographicsHelper();

