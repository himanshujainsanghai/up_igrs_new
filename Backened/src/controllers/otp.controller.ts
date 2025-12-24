import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as otpService from '../services/otp.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import logger from '../config/logger';

/**
 * OTP Controller
 * Handles OTP generation and verification requests
 */

/**
 * POST /api/v1/otp/generate
 * Generate and send OTP
 */
export const generateOTP = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone_number, purpose, expiry_minutes } = req.body;

    if (!phone_number) {
      throw new ValidationError('Phone number is required');
    }

    const result = await otpService.generateOTPForPhone({
      phoneNumber: phone_number,
      purpose: purpose || 'general',
      expiryMinutes: expiry_minutes || 10,
    });

    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/otp/verify
 * Verify OTP
 */
export const verifyOTP = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone_number, otp, purpose } = req.body;

    if (!phone_number || !otp) {
      throw new ValidationError('Phone number and OTP are required');
    }

    const result = await otpService.verifyOTP({
      phoneNumber: phone_number,
      otp,
      purpose: purpose || 'general',
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/otp/resend
 * Resend OTP
 */
export const resendOTP = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone_number, purpose, expiry_minutes } = req.body;

    if (!phone_number) {
      throw new ValidationError('Phone number is required');
    }

    const result = await otpService.resendOTP({
      phoneNumber: phone_number,
      purpose: purpose || 'general',
      expiryMinutes: expiry_minutes || 10,
    });

    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/otp/status
 * Get OTP status
 */
export const getOTPStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone_number, purpose } = req.query;

    if (!phone_number) {
      throw new ValidationError('Phone number is required');
    }

    const status = await otpService.getOTPStatus(
      phone_number as string,
      (purpose as string) || 'general'
    );

    sendSuccess(res, status);
  } catch (error) {
    next(error);
  }
};

