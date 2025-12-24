/**
 * Feedback Service
 * Maps to backend /api/v1/feedback routes
 */

import apiClient from '@/lib/api';
import { ApiResponse, PaginatedResponse, Feedback, FeedbackRequest } from '@/types';

export const feedbackService = {
  /**
   * Create feedback (public)
   * POST /api/v1/feedback
   * Backend expects: type, content, is_anonymous, user_name, user_email, user_phone
   */
  async createFeedback(feedback: FeedbackRequest): Promise<Feedback> {
    // Transform to backend format (snake_case)
    const backendData: any = {
      type: feedback.category === 'suggestion' || feedback.category === 'praise' || feedback.category === 'issue'
        ? feedback.category
        : 'issue', // Default to 'issue' if category doesn't match
      content: feedback.comment,
      is_anonymous: !feedback.userName && !feedback.userEmail, // Anonymous if no user info
    };

    // Add user info if provided (not anonymous)
    if (!backendData.is_anonymous) {
      if (feedback.userName) backendData.user_name = feedback.userName;
      if (feedback.userEmail) backendData.user_email = feedback.userEmail;
      if (feedback.userPhone) backendData.user_phone = feedback.userPhone;
    }

    const response = await apiClient.post<ApiResponse<Feedback>>('/feedback', backendData);
    return response.data;
  },

  /**
   * Get all feedback (admin only)
   * GET /api/v1/feedback
   */
  async getAllFeedback(page = 1, limit = 20): Promise<PaginatedResponse<Feedback>> {
    return await apiClient.get<PaginatedResponse<Feedback>>(`/feedback?page=${page}&limit=${limit}`);
  },

  /**
   * Get feedback by ID (admin only)
   * GET /api/v1/feedback/:id
   */
  async getFeedbackById(id: string): Promise<Feedback> {
    const response = await apiClient.get<ApiResponse<Feedback>>(`/feedback/${id}`);
    return response.data;
  },

  /**
   * Update feedback (admin only)
   * PUT /api/v1/feedback/:id
   */
  async updateFeedback(id: string, updates: Partial<Feedback>): Promise<Feedback> {
    const response = await apiClient.put<ApiResponse<Feedback>>(`/feedback/${id}`, updates);
    return response.data;
  },

  /**
   * Delete feedback (admin only)
   * DELETE /api/v1/feedback/:id
   */
  async deleteFeedback(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/feedback/${id}`);
  },

  /**
   * Get feedback statistics (admin only)
   * GET /api/v1/feedback/statistics
   */
  async getStatistics(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/feedback/statistics');
    return response.data;
  },
};

