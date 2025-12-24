/**
 * Upload Service
 * Maps to backend /api/v1/upload routes
 * All routes require authentication
 */

import apiClient from '@/lib/api';
import { ApiResponse, UploadResponse } from '@/types';

export const uploadService = {
  /**
   * Upload single image
   * POST /api/v1/upload/image
   */
  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.upload<ApiResponse<UploadResponse>>('/upload/image', formData);
    return response.data;
  },

  /**
   * Upload single document
   * POST /api/v1/upload/document
   */
  async uploadDocument(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.upload<ApiResponse<UploadResponse>>('/upload/document', formData);
    return response.data;
  },

  /**
   * Upload single video
   * POST /api/v1/upload/video
   */
  async uploadVideo(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.upload<ApiResponse<UploadResponse>>('/upload/video', formData);
    return response.data;
  },

  /**
   * Upload multiple files
   * POST /api/v1/upload/multiple
   */
  async uploadMultiple(files: File[]): Promise<UploadResponse[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    const response = await apiClient.upload<ApiResponse<UploadResponse[]>>('/upload/multiple', formData);
    return response.data;
  },

  /**
   * Delete file from S3 (admin only)
   * DELETE /api/v1/upload/:key
   */
  async deleteFile(key: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/upload/${key}`);
  },

  /**
   * Generic file upload - returns URL string
   * POST /api/v1/upload/document
   */
  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.upload<ApiResponse<UploadResponse>>('/upload/document', formData);
    return response.data.url || response.data.fileUrl || '';
  },
};

