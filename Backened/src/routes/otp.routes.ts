import { Router } from 'express';
import * as otpController from '../controllers/otp.controller';

const router = Router();

/**
 * OTP Routes
 * /api/v1/otp
 * 
 * Note: OTP routes are public (no authentication required)
 * to allow users to verify their phone numbers
 */

router.post('/generate', otpController.generateOTP); // Generate and send OTP
router.post('/verify', otpController.verifyOTP); // Verify OTP
router.post('/resend', otpController.resendOTP); // Resend OTP
router.get('/status', otpController.getOTPStatus); // Get OTP status

export default router;

