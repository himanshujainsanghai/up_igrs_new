import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * OTP MODEL
 * One-Time Password for verification
 */

export interface IOTP extends Document {
  id: string;                                    // UUID unique identifier
  phone_number: string;                          // Phone number (indexed)
  otp: string;                                   // 6-digit OTP
  purpose: 'meeting_request' | 'complaint' | 'general'; // OTP purpose
  verified: boolean;                             // Verification status
  expires_at: Date;                              // Expiration timestamp
  verified_at?: Date;                            // Verification timestamp
  attempts: number;                              // Verification attempts
  max_attempts: number;                          // Maximum attempts (default 3)
  created_at: Date;                              // Creation timestamp
}

const OTPSchema = new Schema<IOTP>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
      index: true,
    },
    phone_number: {
      type: String,
      required: [true, 'Phone number is required'],
      index: true,
    },
    otp: {
      type: String,
      required: [true, 'OTP is required'],
      length: [6, 'OTP must be 6 digits'],
      match: [/^\d{6}$/, 'OTP must be 6 digits'],
    },
    purpose: {
      type: String,
      enum: ['meeting_request', 'complaint', 'general'],
      default: 'general',
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    expires_at: {
      type: Date,
      required: true,
      // TTL index defined in schema.index() below
    },
    verified_at: Date,
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    max_attempts: {
      type: Number,
      default: 3,
      min: 1,
      max: 5,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: 'otps',
  }
);

// Performance indexes
OTPSchema.index({ phone_number: 1, purpose: 1, verified: 1 });
OTPSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const OTP: Model<IOTP> = mongoose.model<IOTP>('OTP', OTPSchema);

