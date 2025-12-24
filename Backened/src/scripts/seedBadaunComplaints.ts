/**
 * Seed Sample Complaints for Badaun District
 * 
 * Creates realistic complaints with coordinates for different villages
 * This will populate the heat map with complaint data
 */

import { Complaint } from "../models/Complaint";
import Village from "../models/Village";
import logger from "../config/logger";
import connectDatabase from "../config/database";

/**
 * Sample complaints data for Badaun villages
 */
const SAMPLE_COMPLAINTS = [
  // Budaun Sub-district
  {
    title: "Broken road near Aamgaun village",
    description: "The main road connecting Aamgaun to Budaun city has multiple potholes causing traffic issues and vehicle damage. Immediate repair needed.",
    category: "roads",
    sub_category: "potholes",
    priority: "high",
    village_name: "Aamgaun",
    subdistrict_name: "Budaun",
    contact_name: "Rajesh Kumar",
    contact_email: "rajesh.kumar@example.com",
    contact_phone: "+919876543210",
  },
  {
    title: "Water supply disruption in Achaura",
    description: "Water supply has been irregular for the past week in Achaura village. Residents are facing difficulties in getting clean drinking water.",
    category: "water",
    sub_category: "supply",
    priority: "urgent",
    village_name: "Achaura",
    subdistrict_name: "Budaun",
    contact_name: "Sunita Devi",
    contact_email: "sunita.devi@example.com",
    contact_phone: "+919876543211",
  },
  // Bisauli Sub-district
  {
    title: "Street lights not working in Aadpur",
    description: "All street lights in Aadpur village have been non-functional for two months. This poses safety concerns for residents at night.",
    category: "electricity",
    sub_category: "street_lights",
    priority: "medium",
    village_name: "Aadpur",
    subdistrict_name: "Bisauli",
    contact_name: "Mohan Singh",
    contact_email: "mohan.singh@example.com",
    contact_phone: "+919876543212",
  },
  // Sahaswan Sub-district
  {
    title: "Drainage problem in Abbu Nagar",
    description: "Clogged drainage system causing water logging during rains in Abbu Nagar village. Needs immediate cleaning and repair.",
    category: "roads",
    sub_category: "drainage",
    priority: "high",
    village_name: "Abbu Nagar",
    subdistrict_name: "Sahaswan",
    contact_name: "Ramesh Chandra",
    contact_email: "ramesh.chandra@example.com",
    contact_phone: "+919876543213",
  },
  // Dataganj Sub-district
  {
    title: "Health center lacks basic medicines in Abhai Pur",
    description: "The primary health center in Abhai Pur village does not have basic medicines and medical staff is often absent.",
    category: "health",
    sub_category: "clinic",
    priority: "urgent",
    village_name: "Abhai Pur",
    subdistrict_name: "Dataganj",
    contact_name: "Sushila Sharma",
    contact_email: "sushila.sharma@example.com",
    contact_phone: "+919876543214",
  },
  // Bilsi Sub-district
  {
    title: "School building needs repair in Achalpur",
    description: "The primary school building in Achalpur village has damaged roof and walls. Children's safety is at risk during monsoon.",
    category: "education",
    sub_category: "infrastructure",
    priority: "high",
    village_name: "Achalpur",
    subdistrict_name: "Bilsi",
    contact_name: "Dinesh Yadav",
    contact_email: "dinesh.yadav@example.com",
    contact_phone: "+919876543215",
  },
  // More complaints across different villages
  {
    title: "Electricity outage in Adampur",
    description: "Frequent power cuts in Adampur village for the last month. Affecting daily life and businesses.",
    category: "electricity",
    sub_category: "outage",
    priority: "medium",
    village_name: "Adampur",
    subdistrict_name: "Sahaswan",
    contact_name: "Vikas Gupta",
    contact_email: "vikas.gupta@example.com",
    contact_phone: "+919876543216",
  },
  {
    title: "Birth certificate delay in Adhauli",
    description: "Applied for birth certificate 3 months ago in Adhauli village but still not received. Need urgent help.",
    category: "documents",
    sub_category: "certificates",
    priority: "medium",
    village_name: "Adhauli",
    subdistrict_name: "Budaun",
    contact_name: "Anita Verma",
    contact_email: "anita.verma@example.com",
    contact_phone: "+919876543217",
  },
  {
    title: "Contaminated water in Adipura",
    description: "Water quality is very poor in Adipura village. Many people are falling sick due to contaminated water supply.",
    category: "water",
    sub_category: "quality",
    priority: "urgent",
    village_name: "Adipura",
    subdistrict_name: "Bisauli",
    contact_name: "Suresh Pal",
    contact_email: "suresh.pal@example.com",
    contact_phone: "+919876543218",
  },
  {
    title: "Road construction incomplete in Abhigaon",
    description: "Road construction project in Abhigaon started 6 months ago but work has stopped halfway. Dust and potholes causing problems.",
    category: "roads",
    sub_category: "construction",
    priority: "high",
    village_name: "Abhigaon",
    subdistrict_name: "Dataganj",
    contact_name: "Kailash Sharma",
    contact_email: "kailash.sharma@example.com",
    contact_phone: "+919876543219",
  },
];

/**
 * Seed complaints with coordinates from villages
 */
async function seedBadaunComplaints() {
  try {
    await connectDatabase();

    logger.info(`Starting to seed ${SAMPLE_COMPLAINTS.length} complaints for Badaun`);

    let created = 0;
    let failed = 0;

    for (const complaintData of SAMPLE_COMPLAINTS) {
      try {
        // Find the village to get coordinates
        const village = await Village.findOne({
          villageName: complaintData.village_name,
          subdistrictName: complaintData.subdistrict_name,
        });

        if (!village || !village.latitude || !village.longitude) {
          logger.warn(
            `Village ${complaintData.village_name} not found or not geocoded, skipping complaint`
          );
          failed++;
          continue;
        }

        // Create complaint with village coordinates
        const complaint = new Complaint({
          title: complaintData.title,
          description: complaintData.description,
          category: complaintData.category,
          sub_category: complaintData.sub_category,
          priority: complaintData.priority,
          location: `${complaintData.village_name}, ${complaintData.subdistrict_name}, Budaun, Uttar Pradesh`,
          village_name: complaintData.village_name,
          village_lgd: village.lgdCode,
          subdistrict_name: complaintData.subdistrict_name,
          district_name: "Budaun",
          latitude: Number(village.latitude),
          longitude: Number(village.longitude),
          contact_name: complaintData.contact_name,
          contact_email: complaintData.contact_email,
          contact_phone: complaintData.contact_phone,
          status: "pending",
          ai_analysis_completed: false,
          created_by_admin: false,
        });

        await complaint.save();
        created++;
        logger.info(
          `✓ Created complaint: ${complaint.title} (ID: ${complaint.complaint_id}) at ${complaintData.village_name}`
        );
      } catch (error: any) {
        failed++;
        logger.error(`Error creating complaint: ${error.message}`);
      }
    }

    logger.info("\n=== Seed Summary ===");
    logger.info(`Total processed: ${SAMPLE_COMPLAINTS.length}`);
    logger.info(`Successfully created: ${created}`);
    logger.info(`Failed: ${failed}`);
    logger.info("====================\n");

    logger.info("Next steps:");
    logger.info("1. View complaints on heat map");
    logger.info("2. Click on villages to see complaint details");
    logger.info("3. Filter by category/status");

    process.exit(0);
  } catch (error: any) {
    logger.error("Error seeding complaints:", error);
    process.exit(1);
  }
}

// Run the seed
seedBadaunComplaints();

