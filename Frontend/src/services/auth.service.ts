/**
 * Authentication Service
 * Maps to backend /api/v1/auth routes
 */

import apiClient from '@/lib/api';
import { ApiResponse, AuthResponse, User } from '@/types';

export const authService = {
  /**
   * Login
   * POST /api/v1/auth/login
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    
    // Backend returns: { success: true, data: { token, user } }
    if (response.success && response.data) {
      return response.data;
    }
    
    // Handle error response
    throw new Error(response.error?.message || 'Login failed');
  },

  /**
   * Get current user
   * GET /api/v1/auth/me
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error?.message || 'Failed to get user');
  },

  /**
   * Logout
   * POST /api/v1/auth/logout
   */
  async logout(): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>('/auth/logout');
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Logout failed');
    }
  },

  /**
   * Refresh token
   * POST /api/v1/auth/refresh
   */
  async refreshToken(): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error?.message || 'Token refresh failed');
  },
};

