/**
 * Complaints Service
 * Maps to backend /api/v1/complaints routes
 */

import apiClient from "@/lib/api";
import {
  ApiResponse,
  PaginatedResponse,
  Complaint,
  ComplaintFilters,
  ComplaintNote,
  OfficerNote,
  OfficerAttachment,
  ComplaintExtensionRequest,
  ComplaintDocument,
  ComplaintStatistics,
} from "@/types";

/**
 * Map backend complaint (snake_case) to frontend format (camelCase)
 */
const mapComplaint = (complaint: any): Complaint => {
  return {
    _id: complaint._id || complaint.id,
    id: complaint.id,
    complaint_id: complaint.complaint_id,
    contactName: complaint.contact_name || complaint.contactName,
    contactPhone: complaint.contact_phone || complaint.contactPhone,
    contactEmail: complaint.contact_email || complaint.contactEmail,
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    subCategory: complaint.sub_category || complaint.subCategory,
    status: complaint.status,
    priority: complaint.priority,
    location: complaint.location,
    latitude: complaint.latitude || 0,
    longitude: complaint.longitude || 0,
    districtName: complaint.district_name || complaint.districtName || "",
    subdistrictName:
      complaint.subdistrict_name || complaint.subdistrictName || "",
    villageName: complaint.village_name || complaint.villageName,
    voterId: complaint.voter_id || complaint.voterId,
    documents: complaint.documents || [],
    notes: complaint.notes || [],
    createdAt: complaint.created_at || complaint.createdAt,
    updatedAt: complaint.updated_at || complaint.updatedAt,
    assignedTo: complaint.assigned_to || complaint.assignedTo,
    assigned_to_user_id:
      complaint.assigned_to_user_id || complaint.assignedToUserId,
    assignedOfficer: complaint.assigned_officer || complaint.assignedOfficer,
    timeBoundary: complaint.time_boundary || complaint.timeBoundary,
    isExtended: complaint.is_extended || complaint.isExtended,
    closingDetails: complaint.closing_details || complaint.closingDetails,
    isComplaintClosed:
      complaint.is_complaint_closed ||
      complaint.isComplaintClosed ||
      complaint.is_closed ||
      complaint.isClosed,
    isOfficerAssigned:
      complaint.isOfficerAssigned || complaint.is_officer_assigned || false,
    // Include any other fields that might be present
    ...(complaint.drafted_letter && {
      drafted_letter: complaint.drafted_letter,
    }),
    ...(complaint.images && { images: complaint.images }),
    ...(complaint.research_data && { research_data: complaint.research_data }),
    ...(complaint.stage1_data && { stage1_data: complaint.stage1_data }),
    ...(complaint.assignedOfficerDetails && {
      assignedOfficerDetails: complaint.assignedOfficerDetails,
    }),
    ...(complaint.selected_officer && {
      selected_officer: complaint.selected_officer,
    }),
    ...(complaint.extensionRequests && {
      extensionRequests: complaint.extensionRequests,
    }),
  } as any; // Use 'as any' to allow additional fields from backend
};

/**
 * Map backend extension request (snake_case) to frontend format (camelCase)
 */
const mapExtension = (ext: any): ComplaintExtensionRequest => {
  return {
    _id: ext._id || ext.id,
    complaintId: ext.complaint_id,
    requestedBy: ext.requested_by,
    requestedByRole: ext.requested_by_role,
    daysRequested: ext.days_requested,
    reason: ext.reason,
    status: ext.status,
    decidedBy: ext.decided_by,
    decidedByRole: ext.decided_by_role,
    decidedAt: ext.decided_at,
    notes: ext.notes,
    createdAt: ext.created_at,
    updatedAt: ext.updated_at,
  };
};

export const complaintsService = {
  /**
   * Get all complaints with filters
   * GET /api/v1/complaints?page=1&limit=20&status=pending&category=roads&search=keyword
   */
  async getComplaints(
    filters: ComplaintFilters = {}
  ): Promise<PaginatedResponse<Complaint>> {
    const params = new URLSearchParams();

    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());
    if (filters.status && filters.status !== "all")
      params.append("status", filters.status);
    if (filters.category && filters.category !== "all")
      params.append("category", filters.category);
    if (filters.priority && filters.priority !== "all")
      params.append("priority", filters.priority);
    if (filters.search) params.append("search", filters.search);

    const queryString = params.toString();
    const url = `/complaints${queryString ? `?${queryString}` : ""}`;

    // apiClient.get returns response.data, which is ApiResponse<PaginatedResponse<Complaint>>
    // The backend returns: { success: true, data: [...], meta: {...} }
    const response = await apiClient.get<PaginatedResponse<Complaint>>(url);
    return response;
  },

  /**
   * Get Badaun district complaints
   * GET /api/v1/complaints/badaun
   * Returns all complaints for Badaun district (both "Badaun" and "Budaun" spellings)
   */
  async getBadaunComplaints(): Promise<Complaint[]> {
    const response = await apiClient.get<
      ApiResponse<{ count: number; complaints: Complaint[] }>
    >("/complaints/badaun");

    if (response.success && response.data) {
      return response.data.complaints || [];
    }

    return [];
  },

  /**
   * Get complaint by ID
   * GET /api/v1/complaints/:id
   */
  async getComplaintById(id: string): Promise<Complaint> {
    const response = await apiClient.get<ApiResponse<any>>(`/complaints/${id}`);
    // apiClient.get returns response.data, which is ApiResponse<Complaint>
    // So we need to access response.data to get the actual Complaint
    if (response.success && response.data) {
      return mapComplaint(response.data as any);
    }
    throw new Error(response.error?.message || "Complaint not found");
  },

  /**
   * Officer: combined complaint detail (complaint + extension requests + notes + attachments)
   * GET /api/v1/complaints/officer/complaint/:id
   */
  async getOfficerComplaintDetail(id: string): Promise<{
    complaint: Complaint;
    extensionRequests: ComplaintExtensionRequest[];
    officerNotes: OfficerNote[];
    officerAttachments: OfficerAttachment[];
  }> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/complaints/officer/complaint/${id}`
    );
    if (response.success && response.data) {
      const data = response.data;
      return {
        complaint: mapComplaint(data.complaint),
        extensionRequests: (data.extension_requests || []).map(mapExtension),
        officerNotes: (data.officer_notes || []).map((note: any) => ({
          _id: note._id || note.id,
          complaintId: note.complaint_id,
          content: note.note,
          type: note.type,
          attachments: note.attachments,
          officerId: note.officer_id,
          createdAt: note.created_at,
        })),
        officerAttachments: (data.officer_attachments || []).map(
          (doc: any) => ({
            _id: doc._id || doc.id,
            complaintId: doc.complaint_id,
            noteId: doc.note_id,
            attachmentType: doc.attachment_type,
            fileUrl: doc.file_url,
            fileName: doc.file_name,
            fileType: doc.file_type,
            fileSize: doc.file_size,
            uploadedBy: doc.uploaded_by,
            createdAt: doc.created_at,
          })
        ),
      };
    }
    throw new Error(response.error?.message || "Complaint not found");
  },

  /**
   * Create complaint
   * POST /api/v1/complaints
   * Backend expects snake_case fields (contact_name, contact_email, etc.)
   */
  async createComplaint(complaint: Partial<Complaint>): Promise<Complaint> {
    // Transform camelCase frontend format to snake_case backend format
    const backendData: any = {
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority || "medium",
      contact_name: complaint.contactName,
      contact_email:
        complaint.contactEmail ||
        (complaint.contactPhone ? `${complaint.contactPhone}@temp.com` : ""),
      contact_phone: complaint.contactPhone,
      location:
        typeof complaint.location === "string"
          ? complaint.location
          : complaint.location?.address || "",
      voter_id: complaint.voterId,
      images:
        complaint.documents?.map((doc) => doc.fileUrl).filter(Boolean) || [],
      // Geographic fields (required)
      latitude:
        complaint.latitude ??
        (typeof complaint.location === "object" && complaint.location !== null
          ? complaint.location.latitude
          : 0),
      longitude:
        complaint.longitude ??
        (typeof complaint.location === "object" && complaint.location !== null
          ? complaint.location.longitude
          : 0),
      district_name: complaint.districtName ?? "",
      subdistrict_name: complaint.subdistrictName ?? "",
      village_name: complaint.villageName || undefined, // Optional
    };

    const response = await apiClient.post<ApiResponse<Complaint>>(
      "/complaints",
      backendData
    );
    return response.data;
  },

  /**
   * Update complaint (admin only)
   * PUT /api/v1/complaints/:id
   */
  async updateComplaint(
    id: string,
    updates: Partial<Complaint>
  ): Promise<Complaint> {
    const response = await apiClient.put<ApiResponse<Complaint>>(
      `/complaints/${id}`,
      updates
    );
    return response.data;
  },

  /**
   * Delete complaint (admin only)
   * DELETE /api/v1/complaints/:id
   */
  async deleteComplaint(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/complaints/${id}`);
  },

  /**
   * Add note to complaint (admin only)
   * POST /api/v1/complaints/:id/notes
   * Backend expects: { note: string } (not content)
   */
  async addNote(id: string, content: string): Promise<ComplaintNote> {
    // Validate note length (backend requires at least 5 characters)
    if (!content || content.trim().length < 5) {
      throw new Error("Note must be at least 5 characters");
    }

    const response = await apiClient.post<ApiResponse<any>>(
      `/complaints/${id}/notes`,
      {
        note: content.trim(), // Backend expects 'note' field, not 'content'
      }
    );
    if (response.success && response.data) {
      // Transform backend snake_case to frontend camelCase
      const note = response.data;
      return {
        _id: note._id || note.id,
        complaintId: note.complaint_id,
        content: note.note, // Backend uses 'note' field
        createdBy: note.created_by,
        createdAt: note.created_at,
      };
    }
    throw new Error(response.error?.message || "Failed to add note");
  },

  /**
   * Get complaint notes
   * GET /api/v1/complaints/:id/notes
   * Backend returns snake_case, transform to camelCase
   */
  async getNotes(id: string): Promise<ComplaintNote[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `/complaints/${id}/notes`
    );
    if (response.success && response.data) {
      // Transform backend snake_case to frontend camelCase
      return response.data.map((note: any) => ({
        _id: note._id || note.id,
        complaintId: note.complaint_id,
        content: note.note, // Backend uses 'note' field
        createdBy: note.created_by,
        createdAt: note.created_at,
      }));
    }
    return [];
  },

  /**
   * Add document to complaint (admin only)
   * POST /api/v1/complaints/:id/documents
   * Backend expects: { file_url, file_name, file_type } (snake_case)
   */
  async addDocument(
    id: string,
    document: {
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }
  ): Promise<ComplaintDocument> {
    // Validate required fields
    if (!document.fileUrl || !document.fileName || !document.fileType) {
      throw new Error("file_url, file_name, and file_type are required");
    }

    // Validate file_type
    if (!["inward", "outward"].includes(document.fileType)) {
      throw new Error('file_type must be "inward" or "outward"');
    }

    // Transform camelCase to snake_case for backend
    const backendData = {
      file_url: document.fileUrl,
      file_name: document.fileName,
      file_type: document.fileType,
    };

    const response = await apiClient.post<ApiResponse<any>>(
      `/complaints/${id}/documents`,
      backendData
    );
    if (response.success && response.data) {
      // Transform backend snake_case to frontend camelCase
      const doc = response.data;
      return {
        _id: doc._id || doc.id,
        complaintId: doc.complaint_id,
        fileName: doc.file_name,
        fileUrl: doc.file_url,
        fileType: doc.file_type,
        fileSize: doc.file_size || document.fileSize || 0,
        uploadedBy: doc.uploaded_by,
        createdAt: doc.created_at,
      };
    }
    throw new Error(response.error?.message || "Failed to add document");
  },

  /**
   * Get complaint documents
   * GET /api/v1/complaints/:id/documents
   * Backend returns snake_case, transform to camelCase
   */
  async getDocuments(id: string): Promise<ComplaintDocument[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `/complaints/${id}/documents`
    );
    if (response.success && response.data) {
      // Transform backend snake_case to frontend camelCase
      return response.data.map((doc: any) => ({
        _id: doc._id || doc.id,
        complaintId: doc.complaint_id,
        fileName: doc.file_name,
        fileUrl: doc.file_url,
        fileType: doc.file_type,
        fileSize: doc.file_size || 0,
        uploadedBy: doc.uploaded_by,
        createdAt: doc.created_at,
      }));
    }
    return [];
  },

  /**
   * Track complaint by phone number
   * GET /api/v1/complaints/track/phone/:phoneNumber
   * Backend returns: { phone, complaints, count }
   * Backend returns snake_case, transform to camelCase
   */
  async trackByPhone(phoneNumber: string): Promise<Complaint[]> {
    const response = await apiClient.get<
      ApiResponse<{
        phone: string;
        complaints: any[];
        count: number;
      }>
    >(`/complaints/track/phone/${phoneNumber}`);
    // Extract complaints array from the response and transform snake_case to camelCase
    if (response.success && response.data && response.data.complaints) {
      return response.data.complaints.map((complaint: any) => ({
        _id: complaint._id || complaint.id,
        id: complaint.id,
        complaint_id: complaint.complaint_id,
        contactName: complaint.contact_name || complaint.contactName,
        contactPhone: complaint.contact_phone || complaint.contactPhone,
        contactEmail: complaint.contact_email || complaint.contactEmail,
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        subCategory: complaint.sub_category || complaint.subCategory,
        status: complaint.status,
        priority: complaint.priority,
        location: complaint.location,
        latitude: complaint.latitude || 0,
        longitude: complaint.longitude || 0,
        districtName: complaint.district_name || complaint.districtName || "",
        subdistrictName:
          complaint.subdistrict_name || complaint.subdistrictName || "",
        villageName: complaint.village_name || complaint.villageName,
        voterId: complaint.voter_id || complaint.voterId,
        documents: complaint.documents || [],
        notes: complaint.notes || [],
        createdAt: complaint.created_at || complaint.createdAt,
        updatedAt: complaint.updated_at || complaint.updatedAt,
      }));
    }
    return [];
  },

  /**
   * Get complaint statistics
   * GET /api/v1/complaints/statistics
   */
  async getStatistics(): Promise<ComplaintStatistics> {
    const response = await apiClient.get<ApiResponse<ComplaintStatistics>>(
      "/complaints/statistics"
    );
    return response.data;
  },

  /**
   * Officer: add note (inward/outward)
   * POST /api/v1/complaints/officer/notes
   */
  async addOfficerNote(input: {
    complaintId: string;
    note: string;
    type: "inward" | "outward";
    attachments?: string[];
  }): Promise<OfficerNote> {
    if (!input.note || input.note.trim().length < 5) {
      throw new Error("Note must be at least 5 characters");
    }

    const response = await apiClient.post<ApiResponse<any>>(
      `/complaints/officer/notes`,
      {
        complaint_id: input.complaintId,
        note: input.note.trim(),
        type: input.type,
        attachments: input.attachments,
      }
    );

    if (response.success && response.data) {
      const note = response.data;
      return {
        _id: note._id || note.id,
        complaintId: note.complaint_id,
        content: note.note,
        type: note.type,
        attachments: note.attachments,
        officerId: note.officer_id,
        createdAt: note.created_at,
      };
    }
    throw new Error(response.error?.message || "Failed to add officer note");
  },

  /**
   * Officer: get notes for a complaint
   * GET /api/v1/complaints/:id/officer-notes
   */
  async getOfficerNotes(complaintId: string): Promise<OfficerNote[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `/complaints/${complaintId}/officer-notes`
    );

    if (response.success && response.data) {
      return response.data.map((note: any) => ({
        _id: note._id || note.id,
        complaintId: note.complaint_id,
        content: note.note,
        type: note.type,
        attachments: note.attachments,
        officerId: note.officer_id,
        createdAt: note.created_at,
      }));
    }
    return [];
  },

  /**
   * Officer: add attachment (expects S3 URL already uploaded)
   * POST /api/v1/complaints/officer/attachments
   */
  async addOfficerAttachment(input: {
    complaintId: string;
    attachmentType: "inward" | "outward";
    fileUrl: string;
    fileName: string;
    fileType?: string;
    noteId?: string;
  }): Promise<OfficerAttachment> {
    if (!input.fileUrl || !input.fileName) {
      throw new Error("file_url and file_name are required");
    }

    const response = await apiClient.post<ApiResponse<any>>(
      `/complaints/officer/attachments`,
      {
        complaint_id: input.complaintId,
        attachment_type: input.attachmentType,
        file_url: input.fileUrl,
        file_name: input.fileName,
        file_type: input.fileType,
        note_id: input.noteId,
      }
    );

    if (response.success && response.data) {
      const doc = response.data;
      return {
        _id: doc._id || doc.id,
        complaintId: doc.complaint_id,
        noteId: doc.note_id,
        attachmentType: doc.attachment_type,
        fileUrl: doc.file_url,
        fileName: doc.file_name,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        uploadedBy: doc.uploaded_by,
        createdAt: doc.created_at,
      };
    }
    throw new Error(response.error?.message || "Failed to add attachment");
  },

  /**
   * Officer: get attachments for a complaint
   * GET /api/v1/complaints/:id/officer-attachments
   */
  async getOfficerAttachments(
    complaintId: string
  ): Promise<OfficerAttachment[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `/complaints/${complaintId}/officer-attachments`
    );

    if (response.success && response.data) {
      return response.data.map((doc: any) => ({
        _id: doc._id || doc.id,
        complaintId: doc.complaint_id,
        noteId: doc.note_id,
        attachmentType: doc.attachment_type,
        fileUrl: doc.file_url,
        fileName: doc.file_name,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        uploadedBy: doc.uploaded_by,
        createdAt: doc.created_at,
      }));
    }
    return [];
  },

  /**
   * Officer: request extension
   * POST /api/v1/complaints/:id/officer/extension
   */
  async requestExtension(
    complaintId: string,
    input: { days: number; reason?: string }
  ): Promise<ComplaintExtensionRequest> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/complaints/${complaintId}/officer/extension`,
      {
        days: input.days,
        reason: input.reason,
      }
    );
    if (response.success && response.data) {
      const req = response.data;
      return {
        _id: req._id || req.id,
        complaintId: req.complaint_id,
        requestedBy: req.requested_by,
        requestedByRole: req.requested_by_role,
        daysRequested: req.days_requested,
        reason: req.reason,
        status: req.status,
        decidedBy: req.decided_by,
        decidedByRole: req.decided_by_role,
        decidedAt: req.decided_at,
        notes: req.notes,
        createdAt: req.created_at,
        updatedAt: req.updated_at,
      };
    }
    throw new Error(response.error?.message || "Failed to request extension");
  },

  /**
   * Officer: close complaint with details
   * POST /api/v1/complaints/:id/officer/close
   */
  async closeComplaint(
    complaintId: string,
    input: {
      remarks: string;
      attachments?: Array<{
        url: string;
        fileName?: string;
        fileType?: string;
      }>;
      closingProof?: string;
    }
  ): Promise<Complaint> {
    const response = await apiClient.post<ApiResponse<Complaint>>(
      `/complaints/${complaintId}/officer/close`,
      input
    );
    return response.data;
  },

  /**
   * Admin: approve extension (optionally override days/notes)
   * POST /api/v1/complaints/:id/admin/approve-extension
   */
  /**
   * Admin: approve extension (optionally override days/notes)
   * POST /api/v1/complaints/:id/admin/approve-extension
   *
   * @param complaintId - The complaint ID
   * @param input - Optional days override and notes
   * @returns Updated time boundary and approved extension request
   */
  async approveExtension(
    complaintId: string,
    input: { days?: number; notes?: string }
  ): Promise<{
    timeBoundary: number;
    extension: ComplaintExtensionRequest;
  }> {
    if (!complaintId) {
      throw new Error("Complaint ID is required");
    }

    const response = await apiClient.post<ApiResponse<any>>(
      `/complaints/${complaintId}/admin/approve-extension`,
      {
        days: input.days,
        notes: input.notes,
      }
    );

    if (response.success && response.data) {
      const { timeBoundary, extension } = response.data;
      const ext = extension || response.data.extension;

      if (!ext) {
        throw new Error("Invalid response: extension data not found");
      }

      // Map backend response to frontend format
      const mapped: ComplaintExtensionRequest = {
        _id: ext._id || ext.id,
        complaintId: ext.complaint_id || complaintId,
        requestedBy: ext.requested_by,
        requestedByRole: ext.requested_by_role,
        daysRequested: ext.days_requested,
        reason: ext.reason,
        status: ext.status,
        decidedBy: ext.decided_by,
        decidedByRole: ext.decided_by_role,
        decidedAt: ext.decided_at,
        notes: ext.notes,
        createdAt: ext.created_at,
        updatedAt: ext.updated_at,
      };

      return {
        timeBoundary: timeBoundary || 0,
        extension: mapped,
      };
    }

    // Handle error response
    const errorMessage =
      (typeof response.error === "object" && response.error?.message) ||
      (typeof response.error === "string" ? response.error : null) ||
      "Failed to approve extension request";
    throw new Error(errorMessage);
  },

  /**
   * Update complaint research data
   * PUT /api/v1/complaints/:id/research
   */
  async updateComplaintResearch(
    id: string,
    researchData: any
  ): Promise<Complaint> {
    const response = await apiClient.put<ApiResponse<Complaint>>(
      `/complaints/${id}/research`,
      {
        research_data: researchData,
      }
    );
    return response.data;
  },

  /**
   * Update complaint stage1 data (officers, letter, documents)
   * PUT /api/v1/complaints/:id/stage1
   */
  async updateComplaintStage1Data(
    id: string,
    stage1Data: {
      primary_officer?: any;
      secondary_officer?: any;
      drafted_letter?: any;
      stage1_additional_docs?: string[];
    }
  ): Promise<Complaint> {
    const response = await apiClient.put<ApiResponse<Complaint>>(
      `/complaints/${id}/stage1`,
      stage1Data
    );
    return response.data;
  },

  /**
   * Get my complaints (for officers)
   * GET /api/v1/complaints/my-complaints
   */
  async getMyComplaints(
    filters: ComplaintFilters = {}
  ): Promise<PaginatedResponse<Complaint>> {
    const params = new URLSearchParams();

    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());
    if (filters.status && filters.status !== "all")
      params.append("status", filters.status);
    if (filters.category && filters.category !== "all")
      params.append("category", filters.category);
    if (filters.priority && filters.priority !== "all")
      params.append("priority", filters.priority);
    if (filters.search) params.append("search", filters.search);

    const queryString = params.toString();
    const url = `/complaints/my-complaints${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await apiClient.get<PaginatedResponse<Complaint>>(url);
    return response;
  },

  /**
   * Get executives (executive authorities from all districts)
   * GET /api/v1/complaints/executives
   */
  async getExecutives(): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      "/complaints/executives"
    );

    if (response.success && response.data) {
      return response.data;
    }
    return [];
  },

  /**
   * Send email with drafted letter
   * POST /api/v1/complaints/:id/send-email
   */
  async sendComplaintEmail(
    id: string,
    recipientEmail?: string
  ): Promise<{
    success: boolean;
    messageId: string;
    recipient: string;
    subject: string;
    sentAt?: string;
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        success: boolean;
        messageId: string;
        recipient: string;
        subject: string;
        sentAt?: string;
      }>
    >(`/complaints/${id}/send-email`, { recipientEmail });

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || "Failed to send email");
  },

  /**
   * Get email history for a complaint
   * GET /api/v1/complaints/:id/email-history
   */
  async getEmailHistory(id: string): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `/complaints/${id}/email-history`
    );

    if (response.success && response.data) {
      return response.data;
    }
    return [];
  },

  /**
   * Assign complaint to officer
   * POST /api/v1/complaints/:id/assign-officer
   */
  async assignOfficer(
    id: string,
    executive: any
  ): Promise<{
    complaint: Complaint;
    officer: any;
    user?: {
      id: string;
      email: string;
      name: string;
      password?: string;
    };
    isNewOfficer: boolean;
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        complaint: Complaint;
        officer: any;
        user?: {
          id: string;
          email: string;
          name: string;
          password?: string;
        };
        isNewOfficer: boolean;
      }>
    >(`/complaints/${id}/assign-officer`, { executive });

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || "Failed to assign officer");
  },

  /**
   * Unified: Assign complaint to officer and send email with drafted letter
   * POST /api/v1/complaints/:id/assign-and-send-email
   * If new officer account is created, includes email and password in the email
   */
  async assignOfficerAndSendEmail(
    id: string,
    executive: any
  ): Promise<{
    assignment: {
      complaint: Complaint;
      officer: any;
      user?: {
        id: string;
        email: string;
        name: string;
        password?: string;
      };
      isNewOfficer: boolean;
    };
    email: {
      success: boolean;
      messageId?: string;
      recipient?: string;
      subject?: string;
      sentAt?: string;
      error?: string;
    };
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        assignment: {
          complaint: Complaint;
          officer: any;
          user?: {
            id: string;
            email: string;
            name: string;
            password?: string;
          };
          isNewOfficer: boolean;
        };
        email: {
          success: boolean;
          messageId?: string;
          recipient?: string;
          subject?: string;
          sentAt?: string;
          error?: string;
        };
      }>
    >(`/complaints/${id}/assign-and-send-email`, { executive });

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(
      response.error?.message || "Failed to assign officer and send email"
    );
  },
};
