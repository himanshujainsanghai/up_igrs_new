/**
 * Reports Service
 * Maps to backend /api/v1/reports routes
 * All routes require admin authentication
 */

import apiClient from '@/lib/api';
import { ApiResponse } from '@/types';

export const reportsService = {
  /**
   * Get report statistics (admin only)
   * GET /api/v1/reports/statistics
   */
  async getStatistics(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/reports/statistics');
    return response.data;
  },

  /**
   * Generate PDF report (admin only)
   * GET /api/v1/reports/pdf?type=complaints&format=html
   */
  async generatePDFReport(type: string = 'complaints', format: string = 'html'): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/reports/pdf?type=${type}&format=${format}`, {
      responseType: 'blob',
    });
    return response as unknown as Blob;
  },

  /**
   * Generate Excel export (admin only)
   * GET /api/v1/reports/excel?type=complaints
   */
  async generateExcelExport(type: string = 'complaints'): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/reports/excel?type=${type}`, {
      responseType: 'blob',
    });
    return response as unknown as Blob;
  },

  /**
   * Export complaints (admin only)
   * GET /api/v1/reports/complaints/export?format=json
   */
  async exportComplaints(format: string = 'json'): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(`/reports/complaints/export?format=${format}`);
    return response.data;
  },
};

