/**
 * OTP Service
 * Maps to backend /api/v1/otp routes
 * All routes are public (no authentication required)
 */

import apiClient from '@/lib/api';
import { ApiResponse, OTPRequest, OTPVerifyRequest, OTPResponse } from '@/types';

export const otpService = {
  /**
   * Generate and send OTP
   * POST /api/v1/otp/generate
   */
  async generateOTP(request: OTPRequest): Promise<OTPResponse> {
    const response = await apiClient.post<ApiResponse<OTPResponse>>('/otp/generate', request);
    return response.data;
  },

  /**
   * Verify OTP
   * POST /api/v1/otp/verify
   */
  async verifyOTP(request: OTPVerifyRequest): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/otp/verify', request);
    return response.data;
  },

  /**
   * Resend OTP
   * POST /api/v1/otp/resend
   */
  async resendOTP(request: OTPRequest): Promise<OTPResponse> {
    const response = await apiClient.post<ApiResponse<OTPResponse>>('/otp/resend', request);
    return response.data;
  },

  /**
   * Get OTP status
   * GET /api/v1/otp/status?phone=xxx&purpose=xxx
   */
  async getOTPStatus(phone: string, purpose: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(`/otp/status?phone=${phone}&purpose=${purpose}`);
    return response.data;
  },
};

