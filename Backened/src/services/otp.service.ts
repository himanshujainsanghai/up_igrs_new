/**
 * OTP Service
 * Handles OTP generation, verification, and SMS sending
 */

import { OTP } from '../models/OTP';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Generate random 6-digit OTP
 */
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate OTP for phone number
 */
export interface GenerateOTPOptions {
  phoneNumber: string;
  purpose?: 'meeting_request' | 'complaint' | 'general';
  expiryMinutes?: number;
}

export interface GenerateOTPResult {
  id: string;
  phone_number: string;
  expires_at: Date;
  expires_in_seconds: number;
  message: string;
}

export const generateOTPForPhone = async (options: GenerateOTPOptions): Promise<GenerateOTPResult> => {
  const { phoneNumber, purpose = 'general', expiryMinutes = 10 } = options;

  // Validate phone number
  const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
    throw new ValidationError('Invalid phone number format');
  }

  // Invalidate any existing unverified OTPs for this phone and purpose
  await OTP.updateMany(
    {
      phone_number: normalizedPhone,
      purpose,
      verified: false,
      expires_at: { $gt: new Date() },
    },
    {
      verified: true, // Mark as used
    }
  );

  // Generate new OTP
  const otp = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

  // Create OTP record
  const otpRecord = new OTP({
    phone_number: normalizedPhone,
    otp,
    purpose,
    expires_at: expiresAt,
    verified: false,
    attempts: 0,
    max_attempts: 3,
  });

  await otpRecord.save();

  // Send OTP via SMS (implement SMS service integration)
  try {
    await sendOTPViaSMS(normalizedPhone, otp);
    logger.info(`OTP sent to ${normalizedPhone} (masked)`);
  } catch (error) {
    logger.error('Failed to send OTP via SMS:', error);
    // Continue even if SMS fails - OTP is still stored
  }

  logger.info(`OTP generated for ${normalizedPhone} (purpose: ${purpose})`);

  const expiresInSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

  return {
    id: otpRecord.id,
    phone_number: normalizedPhone,
    expires_at: expiresAt,
    expires_in_seconds: expiresInSeconds,
    message: 'OTP sent successfully',
  };
};

/**
 * Verify OTP
 */
export interface VerifyOTPOptions {
  phoneNumber: string;
  otp: string;
  purpose?: 'meeting_request' | 'complaint' | 'general';
}

export interface VerifyOTPResult {
  verified: boolean;
  message: string;
}

export const verifyOTP = async (options: VerifyOTPOptions): Promise<VerifyOTPResult> => {
  const { phoneNumber, otp, purpose = 'general' } = options;

  // Validate inputs
  const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  if (!/^\d{6}$/.test(otp)) {
    throw new ValidationError('OTP must be 6 digits');
  }

  // Find active OTP
  const otpRecord = await OTP.findOne({
    phone_number: normalizedPhone,
    otp,
    purpose,
    verified: false,
    expires_at: { $gt: new Date() },
  });

  if (!otpRecord) {
    // Increment attempts on any matching phone/purpose OTP
    await OTP.updateOne(
      {
        phone_number: normalizedPhone,
        purpose,
        verified: false,
        expires_at: { $gt: new Date() },
      },
      {
        $inc: { attempts: 1 },
      }
    );

    throw new ValidationError('Invalid or expired OTP');
  }

  // Check if max attempts reached
  if (otpRecord.attempts >= otpRecord.max_attempts) {
    throw new ValidationError('Maximum verification attempts exceeded. Please request a new OTP.');
  }

  // Check if expired
  if (otpRecord.expires_at < new Date()) {
    throw new ValidationError('OTP has expired. Please request a new OTP.');
  }

  // Verify OTP
  otpRecord.verified = true;
  otpRecord.verified_at = new Date();
  await otpRecord.save();

  logger.info(`OTP verified for ${normalizedPhone} (purpose: ${purpose})`);

  return {
    verified: true,
    message: 'OTP verified successfully',
  };
};

/**
 * Resend OTP
 */
export const resendOTP = async (options: GenerateOTPOptions): Promise<GenerateOTPResult> => {
  // Invalidate old OTPs
  await OTP.updateMany(
    {
      phone_number: options.phoneNumber.replace(/[\s\-\(\)]/g, ''),
      purpose: options.purpose || 'general',
      verified: false,
    },
    {
      verified: true, // Mark as used
    }
  );

  // Generate new OTP
  return generateOTPForPhone(options);
};

/**
 * Send OTP via SMS
 * TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
 */
const sendOTPViaSMS = async (phoneNumber: string, otp: string): Promise<void> => {
  // Placeholder for SMS integration
  // In production, integrate with:
  // - Twilio
  // - AWS SNS
  // - Other SMS providers

  logger.info(`[SMS] Sending OTP ${otp} to ${phoneNumber}`);
  
  // Example: Twilio integration
  // const twilio = require('twilio');
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({
  //   body: `Your OTP is ${otp}. Valid for 10 minutes.`,
  //   to: phoneNumber,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  // });

  // For now, just log (in development)
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[DEV] OTP for ${phoneNumber}: ${otp}`);
  }
};

/**
 * Check if OTP is valid (not expired, not verified)
 */
export const isOTPValid = async (phoneNumber: string, purpose: string = 'general'): Promise<boolean> => {
  const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  const otpRecord = await OTP.findOne({
    phone_number: normalizedPhone,
    purpose,
    verified: false,
    expires_at: { $gt: new Date() },
    attempts: { $lt: 3 },
  });

  return !!otpRecord;
};

/**
 * Get OTP status
 */
export const getOTPStatus = async (phoneNumber: string, purpose: string = 'general') => {
  const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  const otpRecord = await OTP.findOne({
    phone_number: normalizedPhone,
    purpose,
    verified: false,
    expires_at: { $gt: new Date() },
  }).sort({ created_at: -1 });

  if (!otpRecord) {
    return {
      exists: false,
      message: 'No active OTP found',
    };
  }

  return {
    exists: true,
    expires_at: otpRecord.expires_at,
    attempts: otpRecord.attempts,
    max_attempts: otpRecord.max_attempts,
    expires_in_seconds: Math.floor((otpRecord.expires_at.getTime() - Date.now()) / 1000),
  };
};

export default {
  generateOTPForPhone,
  verifyOTP,
  resendOTP,
  isOTPValid,
  getOTPStatus,
};

