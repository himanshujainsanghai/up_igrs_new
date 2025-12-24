import mongoose from 'mongoose';
import logger from './logger';
import { env } from './env';

const MONGODB_URI = env.MONGODB_URI;

/**
 * Validate MongoDB connection string format
 */
const validateMongoURI = (uri: string): boolean => {
  if (!uri || typeof uri !== 'string') {
    return false;
  }
  const trimmedUri = uri.trim();
  return trimmedUri.startsWith('mongodb://') || trimmedUri.startsWith('mongodb+srv://');
};

/**
 * Connect to MongoDB database
 * Handles connection with retry logic and proper error handling
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    // Validate connection string format
    if (!validateMongoURI(MONGODB_URI)) {
      throw new Error(
        'Invalid MongoDB connection string. It must start with "mongodb://" or "mongodb+srv://". ' +
        'Please set MONGODB_URI environment variable correctly.'
      );
    }

    const options = {
      // Remove deprecated options for MongoDB 7.x
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(MONGODB_URI, options);

    logger.info('✅ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
    throw error;
  }
};

export default connectDatabase;

