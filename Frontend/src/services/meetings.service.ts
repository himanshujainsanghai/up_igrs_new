/**
 * Meetings Service
 * Maps to backend /api/v1/meetings routes
 */

import apiClient from "@/lib/api";
import {
  ApiResponse,
  PaginatedResponse,
  Meeting,
  MeetingRequest,
} from "@/types";

export const meetingsService = {
  /**
   * Get all meetings
   * GET /api/v1/meetings
   * @param status - optional: pending | approved | rejected | completed (omit or 'all' for all)
   */
  async getMeetings(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<PaginatedResponse<Meeting>> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (status && status !== "all") params.set("status", status);
    return await apiClient.get<PaginatedResponse<Meeting>>(
      `/meetings?${params.toString()}`,
    );
  },

  /**
   * Get meeting by ID
   * GET /api/v1/meetings/:id
   */
  async getMeetingById(id: string): Promise<Meeting> {
    const response = await apiClient.get<ApiResponse<Meeting>>(
      `/meetings/${id}`,
    );
    return response.data;
  },

  /**
   * Create meeting request
   * POST /api/v1/meetings
   * Backend expects snake_case fields
   */
  async createMeeting(meeting: MeetingRequest): Promise<Meeting> {
    // Transform to backend format (snake_case)
    const backendData: any = {
      requester_name: meeting.name || "Anonymous",
      requester_email: meeting.email || `${meeting.phone || "user"}@temp.com`,
      requester_phone: meeting.phone,
      requester_area: meeting.location || "",
      meeting_subject:
        meeting.subject ||
        `Meeting Request${meeting.complaintId ? ` - Complaint ${meeting.complaintId}` : ""}`,
      purpose: meeting.reason,
      meeting_type: meeting.complaintId
        ? "complaint_followup"
        : "general_inquiry",
      preferred_date: meeting.requestedDate
        ? new Date(meeting.requestedDate)
        : undefined,
      preferred_time: meeting.requestedTime,
    };

    const response = await apiClient.post<ApiResponse<Meeting>>(
      "/meetings",
      backendData,
    );
    return response.data;
  },

  /**
   * Get meetings by status
   * GET /api/v1/meetings/status/:status
   */
  async getMeetingsByStatus(status: string): Promise<Meeting[]> {
    const response = await apiClient.get<ApiResponse<Meeting[]>>(
      `/meetings/status/${status}`,
    );
    return response.data;
  },

  /**
   * Update meeting (admin only)
   * PUT /api/v1/meetings/:id
   */
  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting> {
    const response = await apiClient.put<ApiResponse<Meeting>>(
      `/meetings/${id}`,
      updates,
    );
    return response.data;
  },

  /**
   * Delete meeting (admin only)
   * DELETE /api/v1/meetings/:id
   */
  async deleteMeeting(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/meetings/${id}`);
  },

  /**
   * Add meeting attachment (admin only)
   * POST /api/v1/meetings/:id/attachments
   */
  async addAttachment(
    id: string,
    attachment: { fileName: string; fileUrl: string; fileType: string },
  ): Promise<void> {
    await apiClient.post<ApiResponse<void>>(
      `/meetings/${id}/attachments`,
      attachment,
    );
  },
};
