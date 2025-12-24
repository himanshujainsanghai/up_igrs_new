import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Complaint } from '../models/Complaint';
import { Meeting } from '../models/Meeting';
import logger from '../config/logger';

/**
 * Script to seed database with sample data
 * Run with: npx ts-node src/scripts/seedDatabase.ts
 */

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await Complaint.deleteMany({});
    // await Meeting.deleteMany({});

    // Check if data already exists
    const existingComplaints = await Complaint.countDocuments();
    if (existingComplaints > 0) {
      logger.warn('Database already has data. Skipping seed.');
      process.exit(0);
    }

    // Create sample complaints
    const sampleComplaints = [
      {
        title: 'Large Pothole on Main Street Causing Vehicle Damage',
        description: 'A dangerous pothole has formed on Main Street near the city center. Multiple vehicles have suffered tire damage, and the hole is growing larger due to recent rains. Immediate repair needed to prevent accidents.',
        category: 'roads',
        status: 'pending',
        priority: 'high',
        location: 'Main Street, City Center - GPS: 12.9716°N, 77.5946°E',
        contact_name: 'Rajesh Kumar',
        contact_email: 'rajesh.kumar@email.com',
        contact_phone: '+91-9876543210',
        assigned_department: 'Public Works Department',
        ai_analysis_completed: true,
        ai_severity_score: 8,
        ai_estimated_cost: 45000,
        ai_estimated_timeline_days: 5,
        ai_risks: ['Traffic accidents during repair', 'Weather delays', 'Underground utility damage'],
        ai_alternatives: ['Temporary cold patching', 'Complete road section reconstruction'],
        ai_success_metrics: ['Zero vehicle damage reports', 'Smooth traffic flow', 'Surface durability >5 years'],
        ai_resource_requirements: ['Asphalt mixture', 'Road roller', 'Traffic cones', 'Warning signs'],
      },
      {
        title: 'Water Supply Interruption in Residential Area',
        description: 'Complete water supply failure affecting 200+ households in Sector 15. Main pipeline burst detected near the pump station.',
        category: 'water',
        status: 'in_progress',
        priority: 'urgent',
        location: 'Sector 15, Residential Area',
        contact_name: 'Priya Sharma',
        contact_email: 'priya.sharma@email.com',
        contact_phone: '+91-9876543211',
        assigned_department: 'Water Supply Department',
        ai_analysis_completed: true,
        ai_severity_score: 9,
        ai_estimated_cost: 120000,
        ai_estimated_timeline_days: 3,
      },
    ];

    const createdComplaints = await Complaint.insertMany(sampleComplaints);
    logger.info(`✅ Created ${createdComplaints.length} sample complaints`);

    // Create sample meetings
    const sampleMeetings = [
      {
        requester_name: 'Ravi Patel',
        requester_email: 'ravi.patel@email.com',
        requester_phone: '+91-9876543220',
        meeting_subject: 'Birth Certificate Follow-up',
        purpose: 'Follow up on birth certificate application delay and understand the current status of document processing.',
        meeting_type: 'complaint_followup',
        preferred_date: new Date('2024-02-20'),
        preferred_time: '10:00:00',
        status: 'pending',
      },
    ];

    const createdMeetings = await Meeting.insertMany(sampleMeetings);
    logger.info(`✅ Created ${createdMeetings.length} sample meetings`);

    logger.info('✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

