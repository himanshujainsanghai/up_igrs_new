/**
 * Upload Service
 * Maps to backend /api/v1/upload routes
 * Supports presigned URLs for upload (client PUT to S3) and view (time-limited GET)
 */

import apiClient from "@/lib/api";
import { ApiResponse, UploadResponse } from "@/types";

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  url: string;
  expiresIn: number;
}

export interface PresignedViewResult {
  viewUrl: string;
  expiresIn: number;
}

export const uploadService = {
  /**
   * Get presigned upload URL, then PUT file to S3 (no file through backend).
   * Uses fetch() so no Authorization header is sent to S3 (presigned URL has signature in query).
   * Returns { url, key } for storing in DB. Use for images, documents, or videos.
   */
  async uploadViaPresigned(
    file: File,
    folder?: string,
  ): Promise<{ url: string; key: string; fileName: string; fileSize: number }> {
    const contentType = this._contentType(file);
    const { uploadUrl, url, key } = await this.getPresignedUploadUrl(
      file.name,
      contentType,
      folder,
    );
    const res = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": contentType,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Upload to storage failed (${res.status}): ${text || res.statusText}`,
      );
    }
    return { url, key, fileName: file.name, fileSize: file.size };
  },

  /**
   * Get presigned upload URL from backend (POST /upload/presigned/upload).
   */
  async getPresignedUploadUrl(
    fileName: string,
    contentType: string,
    folder?: string,
  ): Promise<PresignedUploadResult> {
    const response = await apiClient.post<ApiResponse<PresignedUploadResult>>(
      "/upload/presigned/upload",
      {
        fileName,
        contentType,
        folder,
      },
    );
    if (response.success && response.data) return response.data;
    throw new Error(
      (response as any).error?.message || "Failed to get presigned upload URL",
    );
  },

  /**
   * Get presigned view URL for a private S3 object (GET /upload/presigned/view).
   * Pass either S3 key or full S3 URL (key will be extracted).
   */
  async getPresignedViewUrl(keyOrUrl: string): Promise<string> {
    const isUrl = keyOrUrl.startsWith("http");
    const params = new URLSearchParams(
      isUrl ? { url: keyOrUrl } : { key: keyOrUrl },
    );
    const response = await apiClient.get<ApiResponse<PresignedViewResult>>(
      `/upload/presigned/view?${params.toString()}`,
    );
    if (response.success && response.data?.viewUrl)
      return response.data.viewUrl;
    throw new Error(
      (response as any).error?.message || "Failed to get presigned view URL",
    );
  },

  /**
   * Upload single image (presigned first, fallback to legacy on network/CORS error)
   */
  async uploadImage(file: File): Promise<UploadResponse> {
    try {
      const result = await this.uploadViaPresigned(file, "images");
      return {
        url: result.url,
        key: result.key,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: file.type,
      };
    } catch (err: any) {
      const msg = err?.message || "";
      if (
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("network error") ||
        msg.includes("Upload to storage failed")
      ) {
        return this.uploadImageLegacy(file);
      }
      throw err;
    }
  },

  /**
   * Upload single document (presigned first, fallback to legacy on network/CORS error)
   */
  async uploadDocument(file: File): Promise<UploadResponse> {
    try {
      const result = await this.uploadViaPresigned(file, "documents");
      return {
        url: result.url,
        key: result.key,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: file.type,
      };
    } catch (err: any) {
      const msg = err?.message || "";
      if (
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("network error") ||
        msg.includes("Upload to storage failed")
      ) {
        return this.uploadDocumentLegacy(file);
      }
      throw err;
    }
  },

  /**
   * Upload single image (legacy - multipart through backend)
   * POST /api/v1/upload/image
   */
  async uploadImageLegacy(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.upload<ApiResponse<UploadResponse>>(
      "/upload/image",
      formData,
    );
    const res = response as ApiResponse<UploadResponse>;
    return (res.data ?? res) as UploadResponse;
  },

  /**
   * Upload single document (legacy - multipart through backend)
   * POST /api/v1/upload/document
   */
  async uploadDocumentLegacy(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.upload<ApiResponse<UploadResponse>>(
      "/upload/document",
      formData,
    );
    const res = response as ApiResponse<UploadResponse>;
    return (res.data ?? res) as UploadResponse;
  },

  /**
   * Upload single video
   * POST /api/v1/upload/video
   */
  async uploadVideo(file: File): Promise<UploadResponse> {
    const result = await this.uploadViaPresigned(file, "videos");
    return {
      url: result.url,
      key: result.key,
      fileName: result.fileName,
      fileSize: result.fileSize,
      fileType: file.type,
    };
  },

  /**
   * Upload multiple files
   * POST /api/v1/upload/multiple
   */
  async uploadMultiple(files: File[]): Promise<UploadResponse[]> {
    const results = await Promise.all(
      files.map((file) =>
        this.uploadViaPresigned(file, "uploads").then((r) => ({
          url: r.url,
          key: r.key,
          fileName: r.fileName,
          fileSize: r.fileSize,
          fileType: (file as File).type,
        })),
      ),
    );
    return results;
  },

  /**
   * Delete file from S3 (admin only)
   * DELETE /api/v1/upload/:key
   */
  async deleteFile(key: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/upload/${key}`);
  },

  /**
   * Whether the file should be treated as an image (for folder and legacy fallback).
   */
  _isImageFile(file: File): boolean {
    if (file.type && file.type.startsWith("image/")) return true;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name || "");
  },

  /**
   * Resolve contentType from file; infer from extension when file.type is empty.
   */
  _contentType(file: File): string {
    if (file.type && file.type.length > 0) return file.type;
    const name = (file.name || "").toLowerCase();
    const mime: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".txt": "text/plain",
    };
    for (const [ext, type] of Object.entries(mime)) {
      if (name.endsWith(ext)) return type;
    }
    return "application/octet-stream";
  },

  /**
   * Generic file upload - returns URL string.
   * Tries presigned (client PUT to S3) first; on failure falls back to legacy (multipart via backend).
   * Supports both documents (PDF, Word, etc.) and images.
   */
  async uploadFile(file: File): Promise<string> {
    const isImage = this._isImageFile(file);
    try {
      const result = await this.uploadViaPresigned(
        file,
        isImage ? "images" : "documents",
      );
      return result.url;
    } catch (presignedError: any) {
      const msg = presignedError?.message || "";
      const isNetworkOrCors =
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("network error") ||
        msg.includes("Upload to storage failed");
      if (isNetworkOrCors) {
        const legacy = isImage
          ? await this.uploadImageLegacy(file)
          : await this.uploadDocumentLegacy(file);
        return legacy.url;
      }
      throw presignedError;
    }
  },
};
