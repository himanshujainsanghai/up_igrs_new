import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { connectDatabase } from '../config/database';
import logger from '../config/logger';

// Load environment variables
dotenv.config();

/**
 * Script to create admin user
 * Run with: npx ts-node src/scripts/createAdmin.ts
 */

const createAdmin = async () => {
  try {
    // Connect to database
    await connectDatabase();

    const email = process.env.ADMIN_EMAIL || 'admin@admin.com';
    const password = process.env.ADMIN_PASSWORD || 'Test@123';
    const name = process.env.ADMIN_NAME || 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      logger.warn(`Admin user already exists: ${email}`);
      logger.info('Updating password...');
      
      // Update password
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.updateOne(
        { email },
        { password: hashedPassword, isActive: true }
      );
      
      logger.info('✅ Admin password updated successfully');
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash(password, 10);

      const admin = new User({
        email,
        password: hashedPassword,
        name,
        role: 'admin',
        isActive: true,
      });

      await admin.save();
      logger.info('✅ Admin user created successfully');
    }

    logger.info(`Admin Email: ${email}`);
    logger.info(`Admin Password: ${password}`);
    logger.info('⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    logger.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();

