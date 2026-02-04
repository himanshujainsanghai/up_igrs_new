/**
 * AI Service
 * Maps to backend /api/v1/ai routes
 */

import apiClient from "@/lib/api";
import {
  ApiResponse,
  AIAnalysisRequest,
  AIAnalysisResponse,
  DocumentSummaryRecord,
} from "@/types";

export const aiService = {
  /**
   * Trigger AI analysis for complaint
   * POST /api/v1/ai/complaints/:id/analyze
   */
  async triggerAnalysis(
    complaintId: string,
    request?: AIAnalysisRequest
  ): Promise<AIAnalysisResponse> {
    const response = await apiClient.post<ApiResponse<AIAnalysisResponse>>(
      `/ai/complaints/${complaintId}/analyze`,
      request || {}
    );
    return response.data;
  },

  /**
   * Process document (OCR/AI processing)
   * POST /api/v1/ai/documents/process
   *
   * Note: AI processing can take time, so no timeout is set
   */
  async processDocument(file: File | string): Promise<any> {
    if (file instanceof File) {
      // Convert File to base64 data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const imageDataUrl = reader.result as string;
            const response = await apiClient.post<ApiResponse<any>>(
              "/ai/documents/process",
              {
                imageDataUrl,
              },
              {
                timeout: 0, // No timeout - AI processing can take time
              }
            );
            resolve(response.data);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    } else {
      // If it's a URL, send as JSON
      return await apiClient.post<ApiResponse<any>>(
        "/ai/documents/process",
        {
          imageDataUrl: file,
        },
        {
          timeout: 0, // No timeout - AI processing can take time
        }
      );
    }
  },

  /**
   * Process multiple documents in batch (OCR/AI processing)
   * POST /api/v1/ai/documents/process-batch
   * Converts all files to base64 data URLs and sends them in one request
   *
   * Note: This operation can take a long time (AI processing multiple images),
   * so no timeout is set - the request will wait until the server responds
   */
  async processDocumentsBatch(files: File[]): Promise<any> {
    if (!files || files.length === 0) {
      throw new Error("At least one file is required");
    }

    // Convert all files to base64 data URLs
    const imageDataUrls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve(reader.result as string);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
          })
      )
    );

    // Send all images in one batch request
    // No timeout - AI processing can take several minutes for multiple images
    const response = await apiClient.post<ApiResponse<any>>(
      "/ai/documents/process-batch",
      {
        imageDataUrls,
      },
      {
        timeout: 0, // No timeout - wait for server response regardless of time
      }
    );
    return response.data;
  },

  /**
   * Research related issues
   * POST /api/v1/ai/complaints/:id/research
   */
  async researchRelatedIssues(complaintId: string): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/ai/complaints/${complaintId}/research`,
      {}
    );
    return response.data;
  },

  /**
   * Find complaint officers
   * POST /api/v1/ai/complaints/:id/find-officers
   */
  async findComplaintOfficers(complaintId: string): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/ai/complaints/${complaintId}/find-officers`,
      {}
    );
    return response.data;
  },

  /**
   * Draft complaint letter
   * POST /api/v1/ai/complaints/:id/draft-letter
   */
  async draftComplaintLetter(
    complaintId: string,
    selectedExecutive?: any
  ): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/ai/complaints/${complaintId}/draft-letter`,
      {
        selected_executive: selectedExecutive,
      },
      {
        timeout: 0, // No timeout - AI processing can take time
      }
    );
    return response.data;
  },

  /**
   * Generate complaint actions
   * POST /api/v1/ai/complaints/:id/generate-actions
   */
  async generateComplaintActions(complaintId: string): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/ai/complaints/${complaintId}/generate-actions`,
      {}
    );
    return response.data;
  },

  /**
   * List document summary history for a complaint (newest first)
   * GET /api/v1/ai/complaints/:id/summarize-documents
   */
  async listDocumentSummaries(
    complaintId: string
  ): Promise<
    ApiResponse<{
      complaint_id: string;
      summaries: DocumentSummaryRecord[];
      count: number;
    }>
  > {
    return apiClient.get<
      ApiResponse<{
        complaint_id: string;
        summaries: DocumentSummaryRecord[];
        count: number;
      }>
    >(`/ai/complaints/${complaintId}/summarize-documents`);
  },

  /**
   * Generate new document summary (stores in ComplaintDocumentSummary)
   * POST /api/v1/ai/complaints/:id/summarize-documents
   * Body: { useComplaintContext?: boolean, user_prompt?: string }
   */
  async summarizeDocuments(
    complaintId: string,
    options?: { useComplaintContext?: boolean; user_prompt?: string }
  ): Promise<
    ApiResponse<{
      summary: string;
      useComplaintContext: boolean;
      user_prompt?: string;
      record: DocumentSummaryRecord;
    }>
  > {
    const response = await apiClient.post<
      ApiResponse<{
        summary: string;
        useComplaintContext: boolean;
        user_prompt?: string;
        record: DocumentSummaryRecord;
      }>
    >(`/ai/complaints/${complaintId}/summarize-documents`, options ?? {}, {
      timeout: 0,
    });
    return response.data;
  },
};
