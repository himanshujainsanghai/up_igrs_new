import mongoose from "mongoose";
import Officer from "../models/Officer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mpmla";

interface OfficerData {
  name: string;
  designation: string;
  department: string;
  departmentCategory: string;
  email: string;
  phone: string;
  cug?: string;
  officeAddress: string;
  residenceAddress?: string;
  isDistrictLevel: boolean;
  isSubDistrictLevel: boolean;
}

interface SubdistrictData {
  subdistrictName: string;
  subdistrictLgd: number;
  headquarters?: boolean;
  officers: OfficerData[];
}

interface OfficerFileData {
  districtInfo: {
    districtName: string;
    districtLgd: number;
    stateName: string;
    stateLgd: number;
  };
  subdistricts: SubdistrictData[];
  districtLevelOfficers: OfficerData[];
  otherDepartmentOfficers: OfficerData[];
}

async function seedBadaunOfficers() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Read officer data from JSON file
    const filePath = path.join(__dirname, "../../sample-data/badaun-officers-by-subdistrict.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const data: OfficerFileData = JSON.parse(fileContent);

    console.log("\n🗑️  Clearing existing Badaun officers...");
    await Officer.deleteMany({ districtLgd: data.districtInfo.districtLgd });
    console.log("✅ Cleared existing officers");

    let totalOfficers = 0;
    const officersToInsert: any[] = [];

    // Process sub-district officers
    console.log("\n📍 Processing Sub-district Officers...");
    for (const subdistrict of data.subdistricts) {
      console.log(`\n  Processing ${subdistrict.subdistrictName} (LGD: ${subdistrict.subdistrictLgd})...`);
      
      for (const officer of subdistrict.officers) {
        officersToInsert.push({
          ...officer,
          districtName: data.districtInfo.districtName,
          districtLgd: data.districtInfo.districtLgd,
          subdistrictName: subdistrict.subdistrictName,
          subdistrictLgd: subdistrict.subdistrictLgd,
        });
      }
      
      console.log(`    ✓ Added ${subdistrict.officers.length} officers for ${subdistrict.subdistrictName}`);
      totalOfficers += subdistrict.officers.length;
    }

    // Process district-level officers
    console.log("\n🏛️  Processing District-level Officers...");
    for (const officer of data.districtLevelOfficers) {
      officersToInsert.push({
        ...officer,
        districtName: data.districtInfo.districtName,
        districtLgd: data.districtInfo.districtLgd,
      });
    }
    console.log(`  ✓ Added ${data.districtLevelOfficers.length} district-level officers`);
    totalOfficers += data.districtLevelOfficers.length;

    // Process other department officers
    console.log("\n🏢 Processing Other Department Officers...");
    for (const officer of data.otherDepartmentOfficers) {
      officersToInsert.push({
        ...officer,
        districtName: data.districtInfo.districtName,
        districtLgd: data.districtInfo.districtLgd,
      });
    }
    console.log(`  ✓ Added ${data.otherDepartmentOfficers.length} other department officers`);
    totalOfficers += data.otherDepartmentOfficers.length;

    // Insert all officers
    console.log(`\n💾 Inserting ${totalOfficers} officers into database...`);
    await Officer.insertMany(officersToInsert);
    console.log("✅ Successfully inserted all officers");

    // Print summary by sub-district
    console.log("\n📊 Summary by Sub-district:");
    console.log("═".repeat(60));
    for (const subdistrict of data.subdistricts) {
      const count = await Officer.countDocuments({
        subdistrictLgd: subdistrict.subdistrictLgd,
      });
      console.log(`  ${subdistrict.subdistrictName.padEnd(20)} : ${count} officers`);
    }
    
    const districtCount = await Officer.countDocuments({
      districtLgd: data.districtInfo.districtLgd,
      isDistrictLevel: true,
    });
    console.log(`  ${"District Level".padEnd(20)} : ${districtCount} officers`);
    console.log("═".repeat(60));

    // Print summary by department category
    console.log("\n📊 Summary by Department Category:");
    console.log("═".repeat(60));
    const categories = ["revenue", "development", "police", "health", "education", "engineering", "other"];
    for (const category of categories) {
      const count = await Officer.countDocuments({
        districtLgd: data.districtInfo.districtLgd,
        departmentCategory: category,
      });
      if (count > 0) {
        console.log(`  ${category.charAt(0).toUpperCase() + category.slice(1).padEnd(19)} : ${count} officers`);
      }
    }
    console.log("═".repeat(60));

    console.log(`\n✅ Total Officers Seeded: ${totalOfficers}`);
    console.log("🎉 Seeding completed successfully!");

  } catch (error) {
    console.error("❌ Error seeding officers:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the seed function
seedBadaunOfficers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
