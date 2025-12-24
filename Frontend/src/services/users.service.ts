/**
 * Users Service
 * Maps to backend /api/v1/users routes
 * All routes require admin authentication
 */

import apiClient from '@/lib/api';
import { ApiResponse, PaginatedResponse, User, Officer, CreateUserRequest, UpdateUserRequest, UserStatistics } from '@/types';

export const usersService = {
  /**
   * Get all users with pagination and filters
   * GET /api/v1/users?page=1&limit=20&role=officer&search=keyword
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    isActive?: boolean;
  }): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const queryString = queryParams.toString();
    const url = `/users${queryString ? `?${queryString}` : ''}`;

    // Backend returns PaginatedResponse<User> directly (via sendPaginated)
    const response = await apiClient.get<PaginatedResponse<User>>(url);
    return response;
  },

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to get user');
  },

  /**
   * Create new user
   * POST /api/v1/users
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>('/users', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to create user');
  },

  /**
   * Update user
   * PUT /api/v1/users/:id
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to update user');
  },

  /**
   * Delete user
   * DELETE /api/v1/users/:id
   */
  async deleteUser(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/users/${id}`);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete user');
    }
  },

  /**
   * Activate user
   * PATCH /api/v1/users/:id/activate
   */
  async activateUser(id: string): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/activate`, {});
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to activate user');
  },

  /**
   * Deactivate user
   * PATCH /api/v1/users/:id/deactivate
   */
  async deactivateUser(id: string): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/deactivate`, {});
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to deactivate user');
  },

  /**
   * Get available officers (not yet linked to users)
   * GET /api/v1/users/officers/available?search=keyword&departmentCategory=revenue
   */
  async getAvailableOfficers(params?: {
    search?: string;
    departmentCategory?: string;
    subdistrictLgd?: number;
  }): Promise<{ officers: Officer[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.departmentCategory) queryParams.append('departmentCategory', params.departmentCategory);
    if (params?.subdistrictLgd) queryParams.append('subdistrictLgd', params.subdistrictLgd.toString());

    const queryString = queryParams.toString();
    const url = `/users/officers/available${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<{ officers: Officer[]; total: number }>>(url);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to get available officers');
  },

  /**
   * Get officer details by ID
   * GET /api/v1/users/officers/:officerId
   */
  async getOfficerById(officerId: string): Promise<{
    officer: Officer;
    hasUserAccount: boolean;
    existingUserId?: string;
  }> {
    const response = await apiClient.get<ApiResponse<{
      officer: Officer;
      hasUserAccount: boolean;
      existingUserId?: string;
    }>>(`/users/officers/${officerId}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to get officer details');
  },

  /**
   * Get all officer users (for complaint assignment)
   * GET /api/v1/users/officers
   */
  async getOfficerUsers(search?: string): Promise<{ officers: User[] }> {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);

    const queryString = queryParams.toString();
    const url = `/users/officers${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<{ officers: User[] }>>(url);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to get officer users');
  },

  /**
   * Get user statistics
   * GET /api/v1/users/statistics
   */
  async getUserStatistics(): Promise<UserStatistics> {
    const response = await apiClient.get<ApiResponse<UserStatistics>>('/users/statistics');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to get user statistics');
  },
};

