import { Complaint } from "../models/Complaint";
import { AIResolutionStep } from "../models/AIResolutionStep";
import { ComplaintNote } from "../models/ComplaintNote";
import { ComplaintDocument } from "../models/ComplaintDocument";
import { OfficerNote } from "../models/OfficerNote";
import { OfficerAttachment } from "../models/OfficerAttachment";
import { ComplaintExtensionRequest } from "../models/ComplaintExtensionRequest";
import { AIStepExecutionInstruction } from "../models/AIStepExecutionInstruction";
import { NotFoundError, ValidationError } from "../utils/errors";
import logger from "../config/logger";
import * as complaintTimeline from "./complaintTimeline.service";
import { emailService } from "../modules/email";
import { env } from "../config/env";
import { User } from "../models/User";
import Officer from "../models/Officer";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

/**
 * Complaints Service
 * Business logic for complaint operations
 */

export interface CreateComplaintDto {
  title: string;
  description: string;
  category:
    | "roads"
    | "water"
    | "electricity"
    | "documents"
    | "health"
    | "education";
  sub_category?: string; // Optional sub-category
  priority?: "low" | "medium" | "high" | "urgent";
  location?: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  images?: string[];
  voter_id?: string;
  created_by_admin?: boolean;
  /** User id of admin who created (for notification: exclude from recipients) */
  created_by_user_id?: string;
  // Geographic fields (required)
  latitude: number; // Latitude coordinate (required)
  longitude: number; // Longitude coordinate (required)
  district_name: string; // District name (required)
  subdistrict_name: string; // Sub-district name (required)
  village_name?: string; // Village name (optional)
}

export interface UpdateComplaintDto {
  status?: "pending" | "in_progress" | "resolved" | "rejected";
  priority?: "low" | "medium" | "high" | "urgent";
  assigned_department?: string;
  resolution_notes?: string;
  estimated_resolution_date?: Date;
  actual_resolution_date?: Date;
}

export interface CloseComplaintDto {
  remarks: string;
  attachments?: Array<{
    url: string;
    fileName?: string;
    fileType?: string;
  }>;
  closingProof?: string;
  officerName?: string;
  officerEmail?: string;
}

export interface ComplaintFilters {
  status?: string;
  category?: string;
  sub_category?: string; // Optional sub-category filter
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all complaints with filters and pagination
 */
export const getAllComplaints = async (filters: ComplaintFilters = {}) => {
  const {
    status,
    category,
    sub_category,
    priority,
    search,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

  // Build query
  const query: any = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (category && category !== "all") {
    query.category = category;
  }

  if (sub_category && sub_category !== "all") {
    query.sub_category = sub_category;
  }

  if (priority && priority !== "all") {
    query.priority = priority;
  }

  // Text search
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { contact_name: { $regex: search, $options: "i" } },
      { contact_email: { $regex: search, $options: "i" } },
    ];
  }

  // Fetch complaints
  const [complaints, total] = await Promise.all([
    Complaint.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(query),
  ]);

  // Fetch AI resolution steps for all complaints
  const complaintIds = complaints.map((c) => c.id);
  const steps = await AIResolutionStep.find({
    complaint_id: { $in: complaintIds },
  })
    .sort({ step_number: 1 })
    .lean();

  // Group steps by complaint_id
  const stepsMap = new Map<string, any[]>();
  steps.forEach((step) => {
    if (!stepsMap.has(step.complaint_id)) {
      stepsMap.set(step.complaint_id, []);
    }
    stepsMap.get(step.complaint_id)!.push(step);
  });

  // Attach steps to complaints
  const complaintsWithSteps = complaints.map((complaint) => ({
    ...complaint,
    ai_steps: stepsMap.get(complaint.id) || [],
  }));

  return {
    complaints: complaintsWithSteps,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single complaint by ID
 */
export const getComplaintById = async (id: string) => {
  const complaint = await Complaint.findOne({ id }).lean();

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  // Fetch AI resolution steps
  const steps = await AIResolutionStep.find({ complaint_id: id })
    .sort({ step_number: 1 })
    .lean();

  // Fetch notes (shared collection: admin notes have created_by, officer notes have officer_id)
  const allNotes = await ComplaintNote.find({ complaint_id: id })
    .sort({ created_at: -1 })
    .lean();

  const admin_notes = allNotes.filter(
    (n: any) => n.officer_id == null || n.officer_id === ""
  );
  const officer_notes = allNotes.filter(
    (n: any) => n.officer_id != null && n.officer_id !== ""
  );

  // Fetch documents (shared collection: admin docs use file_type enum; officer docs have attachment_type)
  const allDocuments = await ComplaintDocument.find({ complaint_id: id })
    .sort({ created_at: -1 })
    .lean();

  const admin_documents = allDocuments.filter(
    (d: any) => d.attachment_type == null || d.attachment_type === ""
  );
  const officer_documents = allDocuments.filter(
    (d: any) => d.attachment_type != null && d.attachment_type !== ""
  );

  // Fetch extension requests for this complaint
  const extensionRequests = await ComplaintExtensionRequest.find({
    complaint_id: id,
  })
    .sort({ created_at: -1 })
    .lean();

  // Fetch assigned officer details if complaint is assigned
  let assignedOfficerDetails = null;

  // Check if complaint is assigned to an officer
  if (complaint.isOfficerAssigned && complaint.assignedOfficer) {
    try {
      const officer = await Officer.findById(complaint.assignedOfficer).lean();

      if (officer) {
        assignedOfficerDetails = {
          _id: officer._id?.toString(),
          name: officer.name,
          designation: officer.designation,
          department: officer.department,
          departmentCategory: officer.departmentCategory,
          email: officer.email,
          phone: officer.phone,
          cug: officer.cug,
          officeAddress: officer.officeAddress,
          residenceAddress: officer.residenceAddress,
          districtName: officer.districtName,
          districtLgd: officer.districtLgd,
          subdistrictName: officer.subdistrictName,
          subdistrictLgd: officer.subdistrictLgd,
          isDistrictLevel: officer.isDistrictLevel,
          isSubDistrictLevel: officer.isSubDistrictLevel,
          noOfComplaintsArrived: officer.noOfComplaintsArrived,
          noOfComplaintsActed: officer.noOfComplaintsActed,
          noOfComplaintsClosed: officer.noOfComplaintsClosed,
          createdAt: officer.createdAt,
          updatedAt: officer.updatedAt,
        };
      }
    } catch (error) {
      logger.error(
        `Error fetching assigned officer details for complaint ${id}:`,
        error
      );
    }
  }

  return {
    ...complaint,
    ai_steps: steps,
    admin_notes,
    officer_notes,
    admin_documents,
    officer_documents,
    extensionRequests,
    assignedOfficerDetails,
  };
};

/**
 * Create new complaint
 */
export const createComplaint = async (data: CreateComplaintDto) => {
  try {
    // Validate required geographic fields at service level as well
    if (data.latitude === undefined || data.latitude === null) {
      throw new ValidationError("latitude is required");
    }
    if (data.longitude === undefined || data.longitude === null) {
      throw new ValidationError("longitude is required");
    }
    if (
      !data.district_name ||
      typeof data.district_name !== "string" ||
      data.district_name.trim().length === 0
    ) {
      throw new ValidationError("district_name is required");
    }
    if (
      !data.subdistrict_name ||
      typeof data.subdistrict_name !== "string" ||
      data.subdistrict_name.trim().length === 0
    ) {
      throw new ValidationError("subdistrict_name is required");
    }

    logger.info("Creating complaint in service:", {
      title: data.title,
      category: data.category,
      hasImages: Array.isArray(data.images) && data.images.length > 0,
      imageCount: Array.isArray(data.images) ? data.images.length : 0,
      latitude: data.latitude,
      longitude: data.longitude,
      district_name: data.district_name,
      subdistrict_name: data.subdistrict_name,
      village_name: data.village_name || "not provided",
    });

    const complaint = new Complaint({
      ...data,
      priority: data.priority || "medium",
      status: "pending",
      ai_analysis_completed: false,
      // Ensure geographic fields are properly set
      latitude: data.latitude,
      longitude: data.longitude,
      district_name: data.district_name.trim(),
      subdistrict_name: data.subdistrict_name.trim(),
      village_name: data.village_name?.trim() || undefined,
    });

    await complaint.save();
    logger.info(
      `Complaint saved successfully: ${complaint.id}, complaint_id: ${complaint.complaint_id}`
    );

    try {
      await complaintTimeline.appendComplaintCreated(
        complaint.id,
        {
          title: complaint.title,
          category: complaint.category,
          created_by: data.created_by_admin ? "admin" : undefined,
          created_by_user_id: data.created_by_user_id,
        },
        data.created_by_admin
          ? { role: "admin" as const }
          : { role: "citizen" as const }
      );
    } catch (err) {
      logger.warn("Timeline appendComplaintCreated failed:", err);
    }

    const complaintObj = complaint.toObject();
    logger.info("Complaint object to return:", {
      id: complaintObj.id,
      _id: complaintObj._id,
      complaint_id: complaintObj.complaint_id,
      latitude: complaintObj.latitude,
      longitude: complaintObj.longitude,
      district_name: complaintObj.district_name,
      subdistrict_name: complaintObj.subdistrict_name,
    });

    return complaintObj;
  } catch (error) {
    logger.error("Error in createComplaint service:", error);
    throw error;
  }
};

/**
 * Update complaint
 */
export const updateComplaint = async (id: string, data: UpdateComplaintDto) => {
  const complaint = await Complaint.findOne({ id });

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  const oldStatus = complaint.status;
  const oldPriority = complaint.priority;
  // Update fields
  Object.assign(complaint, data);

  // Auto-set resolution date if status changes to resolved
  if (data.status === "resolved" && !complaint.actual_resolution_date) {
    complaint.actual_resolution_date = new Date();
  }

  await complaint.save({ validateModifiedOnly: true });
  logger.info(`Complaint updated: ${id}`);

  try {
    if (data.status !== undefined && data.status !== oldStatus) {
      await complaintTimeline.appendStatusChanged(id, {
        old_status: oldStatus,
        new_status: data.status,
      });
    }
    if (data.priority !== undefined && data.priority !== oldPriority) {
      await complaintTimeline.appendPriorityChanged(id, {
        old_priority: oldPriority,
        new_priority: data.priority,
      });
    }
    if (
      (data.status === undefined || data.status === oldStatus) &&
      (data.priority === undefined || data.priority === oldPriority)
    ) {
      await complaintTimeline.appendComplaintUpdated(id, {
        field: Object.keys(data).join(","),
        new_value: data,
      });
    }
  } catch (err) {
    logger.warn("Timeline append after updateComplaint failed:", err);
  }

  return complaint.toObject();
};

/**
 * Delete complaint and related data
 */
export const deleteComplaint = async (id: string) => {
  const complaint = await Complaint.findOne({ id });

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  // Delete related data
  await Promise.all([
    AIResolutionStep.deleteMany({ complaint_id: id }),
    ComplaintNote.deleteMany({ complaint_id: id }),
    ComplaintDocument.deleteMany({ complaint_id: id }),
    Complaint.deleteOne({ id }),
  ]);

  logger.info(`Complaint deleted: ${id}`);
};

/**
 * Add note to complaint
 */
export const addComplaintNote = async (
  complaintId: string,
  note: string,
  createdBy?: string
) => {
  const complaint = await Complaint.findOne({ id: complaintId });

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  const complaintNote = new ComplaintNote({
    complaint_id: complaintId,
    note,
    created_by: createdBy || "Admin",
  });

  await complaintNote.save();

  try {
    await complaintTimeline.appendNoteAdded(
      complaintId,
      {
        note_id: complaintNote.id,
        excerpt: note.length > 100 ? note.slice(0, 100) + "…" : note,
      },
      createdBy ? { name: createdBy } : undefined
    );
  } catch (err) {
    logger.warn("Timeline appendNoteAdded failed:", err);
  }

  return complaintNote.toObject();
};

/**
 * Get complaint notes (segregated: admin vs officer)
 */
export const getComplaintNotes = async (complaintId: string) => {
  const allNotes = await ComplaintNote.find({ complaint_id: complaintId })
    .sort({ created_at: -1 })
    .lean();

  const admin_notes = allNotes.filter(
    (n: any) => n.officer_id == null || n.officer_id === ""
  );
  const officer_notes = allNotes.filter(
    (n: any) => n.officer_id != null && n.officer_id !== ""
  );

  return { admin_notes, officer_notes };
};

/**
 * Add document to complaint
 */
export const addComplaintDocument = async (
  complaintId: string,
  fileUrl: string,
  fileName: string,
  fileType: "inward" | "outward",
  uploadedBy?: string
) => {
  const complaint = await Complaint.findOne({ id: complaintId });

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  const document = new ComplaintDocument({
    complaint_id: complaintId,
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType,
    uploaded_by: uploadedBy || "Admin",
  });

  await document.save();

  try {
    await complaintTimeline.appendDocumentAdded(
      complaintId,
      {
        document_id: document.id,
        file_name: fileName,
        file_type: fileType,
      },
      uploadedBy ? { name: uploadedBy } : undefined
    );
  } catch (err) {
    logger.warn("Timeline appendDocumentAdded failed:", err);
  }

  return document.toObject();
};

/**
 * Get complaint documents (segregated: admin vs officer)
 */
export const getComplaintDocuments = async (complaintId: string) => {
  const allDocuments = await ComplaintDocument.find({
    complaint_id: complaintId,
  })
    .sort({ created_at: -1 })
    .lean();

  const admin_documents = allDocuments.filter(
    (d: any) => d.attachment_type == null || d.attachment_type === ""
  );
  const officer_documents = allDocuments.filter(
    (d: any) => d.attachment_type != null && d.attachment_type !== ""
  );

  return { admin_documents, officer_documents };
};

/**
 * Add officer note (inward/outward) for a complaint
 * Assumes file uploads handled by client/S3; only URLs are persisted
 */
export const addOfficerNote = async (
  complaintId: string,
  note: string,
  type: "inward" | "outward",
  officerId: string,
  attachments?: string[]
) => {
  if (!note || note.trim().length < 5) {
    throw new ValidationError("Note must be at least 5 characters");
  }

  if (!["inward", "outward"].includes(type)) {
    throw new ValidationError('type must be "inward" or "outward"');
  }

  const complaint = await Complaint.findOne({ id: complaintId });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  if (
    complaint.assigned_to_user_id &&
    complaint.assigned_to_user_id !== officerId
  ) {
    throw new ValidationError("You are not assigned to this complaint");
  }

  const officerNote = new OfficerNote({
    complaint_id: complaintId,
    note,
    type,
    officer_id: officerId,
    attachments: attachments?.length ? attachments : undefined,
  });

  await officerNote.save();

  try {
    await complaintTimeline.appendOfficerNoteAdded(
      complaintId,
      {
        note_id: officerNote.id,
        officer_id: officerId,
        type,
        excerpt: note.length > 100 ? note.slice(0, 100) + "…" : note,
      },
      { user_id: officerId, role: "officer" }
    );
  } catch (err) {
    logger.warn("Timeline appendOfficerNoteAdded failed:", err);
  }

  return officerNote.toObject();
};

/**
 * Get officer notes for a complaint (sorted newest first)
 */
export const getOfficerNotes = async (
  complaintId: string,
  officerId: string
) => {
  const complaint = await Complaint.findOne({ id: complaintId });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  if (
    complaint.assigned_to_user_id &&
    complaint.assigned_to_user_id !== officerId
  ) {
    throw new ValidationError("You are not assigned to this complaint");
  }

  const notes = await OfficerNote.find({ complaint_id: complaintId })
    .sort({ created_at: -1 })
    .lean();

  return notes;
};

/**
 * Add officer attachment for a complaint (S3 URL already generated on client)
 */
export const addOfficerAttachment = async (
  complaintId: string,
  attachmentType: "inward" | "outward",
  fileUrl: string,
  fileName: string,
  officerId: string,
  noteId?: string,
  fileType?: string
) => {
  if (!fileUrl || !fileName) {
    throw new ValidationError("file_url and file_name are required");
  }

  if (!["inward", "outward"].includes(attachmentType)) {
    throw new ValidationError('attachment_type must be "inward" or "outward"');
  }

  const complaint = await Complaint.findOne({ id: complaintId });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  if (
    complaint.assigned_to_user_id &&
    complaint.assigned_to_user_id !== officerId
  ) {
    throw new ValidationError("You are not assigned to this complaint");
  }

  const attachment = new OfficerAttachment({
    complaint_id: complaintId,
    note_id: noteId,
    attachment_type: attachmentType,
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType,
    uploaded_by: officerId,
  });

  await attachment.save();

  try {
    await complaintTimeline.appendOfficerDocumentAdded(
      complaintId,
      {
        attachment_id: attachment.id,
        officer_id: officerId,
        file_name: fileName,
        attachment_type: attachmentType,
      },
      { user_id: officerId, role: "officer" }
    );
  } catch (err) {
    logger.warn("Timeline appendOfficerDocumentAdded failed:", err);
  }

  return attachment.toObject();
};

/**
 * Get officer attachments for a complaint (newest first)
 */
export const getOfficerAttachments = async (
  complaintId: string,
  officerId: string
) => {
  const complaint = await Complaint.findOne({ id: complaintId });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  if (
    complaint.assigned_to_user_id &&
    complaint.assigned_to_user_id !== officerId
  ) {
    throw new ValidationError("You are not assigned to this complaint");
  }

  // Same collection as ComplaintDocument; only return docs that have attachment_type (officer uploads)
  const attachments = await OfficerAttachment.find({
    complaint_id: complaintId,
    attachment_type: { $in: ["inward", "outward"] },
  })
    .sort({ created_at: -1 })
    .lean();

  return attachments;
};

/**
 * Get officer-only documents from complaint_documents collection.
 * OfficerAttachment and ComplaintDocument share the same collection; admin docs have file_type
 * but no attachment_type. Officer uploads have attachment_type set. Use this so admin and officer
 * panels show the same set of "officer documents".
 */
const getOfficerAttachmentsOnly = async (complaintId: string) => {
  return OfficerAttachment.find({
    complaint_id: complaintId,
    attachment_type: { $in: ["inward", "outward"] },
  })
    .sort({ created_at: -1 })
    .lean();
};

/**
 * Officer: combined complaint detail with extension requests, notes (admin + officer), documents (admin + officer)
 * Segregates admin notes/documents so officer panel can display them like the admin panel.
 * officer_attachments: only documents with attachment_type set (real officer uploads), same as admin's officer_documents.
 */
export const getOfficerComplaintDetail = async (
  complaintId: string,
  officerId: string
) => {
  const complaint = await Complaint.findOne({ id: complaintId }).lean();
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  if (
    complaint.assigned_to_user_id &&
    complaint.assigned_to_user_id !== officerId
  ) {
    throw new ValidationError("You are not assigned to this complaint");
  }

  const [
    extensionRequests,
    officerNotes,
    officerAttachments,
    notesSegregated,
    documentsSegregated,
  ] = await Promise.all([
    ComplaintExtensionRequest.find({ complaint_id: complaintId })
      .sort({ created_at: -1 })
      .lean(),
    OfficerNote.find({ complaint_id: complaintId })
      .sort({ created_at: -1 })
      .lean(),
    getOfficerAttachmentsOnly(complaintId),
    getComplaintNotes(complaintId),
    getComplaintDocuments(complaintId),
  ]);

  return {
    complaint,
    extension_requests: extensionRequests,
    officer_notes: officerNotes,
    officer_attachments: officerAttachments,
    admin_notes: notesSegregated.admin_notes,
    admin_documents: documentsSegregated.admin_documents,
  };
};

/**
 * Close complaint by assigned officer with closing metadata
 */
export const closeComplaint = async (
  complaintId: string,
  officerId: string,
  input: CloseComplaintDto
) => {
  if (!input.remarks || input.remarks.trim().length < 5) {
    throw new ValidationError("Closing remarks must be at least 5 characters");
  }

  const complaint = await Complaint.findOne({ id: complaintId });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  if (complaint.isComplaintClosed) {
    throw new ValidationError("Complaint is already closed");
  }

  if (
    complaint.assigned_to_user_id &&
    complaint.assigned_to_user_id !== officerId
  ) {
    throw new ValidationError("You are not assigned to this complaint");
  }

  const now = new Date();

  const attachments =
    input.attachments?.map((att, index) => {
      if (!att?.url || typeof att.url !== "string") {
        throw new ValidationError(
          `attachments[${index}].url is required and must be a string`
        );
      }

      return {
        url: att.url,
        fileName: att.fileName,
        fileType: att.fileType,
        uploadedBy: officerId,
        uploadedAt: now,
      };
    }) || [];

  let closedByOfficer = {
    id: officerId,
    name: input.officerName,
    email: input.officerEmail,
  };

  try {
    const officerUser = await User.findOne({ id: officerId }).lean();
    if (officerUser) {
      closedByOfficer = {
        id: officerId,
        name: officerUser.name || input.officerName,
        email: officerUser.email || input.officerEmail,
      };
    }
  } catch (error) {
    logger.warn(
      `Could not fetch officer details for closing complaint ${complaintId}:`,
      error
    );
  }

  complaint.isComplaintClosed = true;
  complaint.status = "resolved";
  complaint.actual_resolution_date = now;
  complaint.closingDetails = {
    closedAt: now,
    remarks: input.remarks.trim(),
    attachments: attachments.length ? attachments : undefined,
    closedByOfficer,
    closingProof: input.closingProof,
  };
  complaint.updated_at = now;

  await complaint.save();

  try {
    await complaintTimeline.appendComplaintClosed(
      complaintId,
      {
        closed_by_user_id: officerId,
        closed_by_name: closedByOfficer.name,
        closed_by_email: closedByOfficer.email,
        remarks_excerpt:
          input.remarks.trim().length > 200
            ? input.remarks.trim().slice(0, 200) + "…"
            : input.remarks.trim(),
        closed_at: now.toISOString(),
      },
      { user_id: officerId, role: "officer", name: closedByOfficer.name }
    );
  } catch (err) {
    logger.warn("Timeline appendComplaintClosed failed:", err);
  }

  return complaint.toObject();
};

/**
 * Officer requests extension of time boundary
 */
export const requestOfficerExtension = async (
  complaintId: string,
  officerId: string,
  days: number,
  reason?: string
) => {
  if (!days || days < 1 || days > 365) {
    throw new ValidationError("days must be between 1 and 365");
  }

  const complaint = await Complaint.findOne({ id: complaintId });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  if (
    complaint.assigned_to_user_id &&
    complaint.assigned_to_user_id !== officerId
  ) {
    throw new ValidationError("You are not assigned to this complaint");
  }

  const request = new ComplaintExtensionRequest({
    complaint_id: complaintId,
    requested_by: officerId,
    requested_by_role: "officer",
    days_requested: days,
    reason,
    status: "pending",
  });

  await request.save();

  try {
    await complaintTimeline.appendExtensionRequested(
      complaintId,
      {
        request_id: request.id,
        requested_by: officerId,
        requested_by_role: "officer",
        days_requested: days,
        reason,
      },
      { user_id: officerId, role: "officer" }
    );
  } catch (err) {
    logger.warn("Timeline appendExtensionRequested failed:", err);
  }

  return request.toObject();
};

/**
 * Admin approves extension (defaults to latest pending request)
 * Updates extension request status, approval details, and complaint time boundary
 */
export const approveExtension = async (
  complaintId: string,
  adminId: string,
  days?: number,
  notes?: string
) => {
  // Find the complaint
  const complaint = await Complaint.findOne({ id: complaintId });
  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  // Find the latest pending extension request for this complaint
  const pendingRequest = await ComplaintExtensionRequest.findOne({
    complaint_id: complaintId,
    status: "pending",
  }).sort({ created_at: -1 });

  if (!pendingRequest) {
    throw new ValidationError("No pending extension request found");
  }

  // Validate extension days
  const extensionDays = days ?? pendingRequest.days_requested;

  if (!extensionDays || extensionDays < 1 || extensionDays > 365) {
    throw new ValidationError("Extension days must be between 1 and 365");
  }

  // Use transaction to ensure atomicity
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update extension request with approval details
    pendingRequest.status = "approved";
    pendingRequest.decided_by = adminId;
    pendingRequest.decided_by_role = "admin";
    pendingRequest.decided_at = new Date();
    pendingRequest.updated_at = new Date(); // Explicitly update updated_at
    if (notes) {
      pendingRequest.notes = notes;
    }
    // Allow admin to override days if provided
    if (days !== undefined) {
      pendingRequest.days_requested = extensionDays;
    }
    await pendingRequest.save({ session });

    // Update complaint: extend time boundary and mark as extended
    const currentTimeBoundary = complaint.timeBoundary || 7; // Default 7 days if not set
    complaint.timeBoundary = currentTimeBoundary + extensionDays;
    complaint.isExtended = true;
    complaint.updated_at = new Date(); // Explicitly update updated_at
    await complaint.save({ session });

    // Commit transaction
    await session.commitTransaction();

    try {
      await complaintTimeline.appendExtensionApproved(
        complaintId,
        {
          request_id: pendingRequest.id,
          new_deadline_days: extensionDays,
          decided_by: adminId,
        },
        { user_id: adminId, role: "admin" }
      );
    } catch (err) {
      logger.warn("Timeline appendExtensionApproved failed:", err);
    }

    logger.info(
      `Extension request ${pendingRequest.id} approved by admin ${adminId} for complaint ${complaintId}. Extended by ${extensionDays} days.`
    );

    return {
      timeBoundary: complaint.timeBoundary,
      extension: pendingRequest.toObject(),
    };
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    logger.error(
      `Error approving extension for complaint ${complaintId}:`,
      error
    );
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Track complaints by phone number
 */
export const trackByPhone = async (phoneNumber: string) => {
  if (!phoneNumber || phoneNumber.trim().length < 10) {
    throw new ValidationError("Valid phone number is required");
  }

  // Normalize phone number (remove spaces, dashes, etc.)
  const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");

  // Find all complaints with this phone number
  const complaints = await Complaint.find({
    contact_phone: { $regex: normalizedPhone, $options: "i" },
  })
    .sort({ created_at: -1 })
    .lean();

  // Fetch AI resolution steps for all complaints
  const complaintIds = complaints.map((c) => c.id);
  const steps = await AIResolutionStep.find({
    complaint_id: { $in: complaintIds },
  })
    .sort({ step_number: 1 })
    .lean();

  // Group steps by complaint_id
  const stepsMap = new Map<string, any[]>();
  steps.forEach((step) => {
    if (!stepsMap.has(step.complaint_id)) {
      stepsMap.set(step.complaint_id, []);
    }
    stepsMap.get(step.complaint_id)!.push(step);
  });

  // Attach steps to complaints
  const complaintsWithSteps = complaints.map((complaint) => ({
    ...complaint,
    ai_steps: stepsMap.get(complaint.id) || [],
  }));

  return complaintsWithSteps;
};

/**
 * Get complaint statistics for dashboard
 */
export const getComplaintStatistics = async () => {
  // Get total count
  const total = await Complaint.countDocuments();

  // Get counts by status
  const [pending, inProgress, resolved, rejected] = await Promise.all([
    Complaint.countDocuments({ status: "pending" }),
    Complaint.countDocuments({ status: "in_progress" }),
    Complaint.countDocuments({ status: "resolved" }),
    Complaint.countDocuments({ status: "rejected" }),
  ]);

  // Get counts by priority
  const [low, medium, high, urgent] = await Promise.all([
    Complaint.countDocuments({ priority: "low" }),
    Complaint.countDocuments({ priority: "medium" }),
    Complaint.countDocuments({ priority: "high" }),
    Complaint.countDocuments({ priority: "urgent" }),
  ]);

  // Get category breakdown
  const categoryBreakdown = await Complaint.aggregate([
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  // Get recent complaints (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentCount = await Complaint.countDocuments({
    created_at: { $gte: sevenDaysAgo },
  });

  // Get resolved this month
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const resolvedThisMonth = await Complaint.countDocuments({
    status: "resolved",
    actual_resolution_date: { $gte: thisMonth },
  });

  return {
    total,
    status: {
      pending,
      in_progress: inProgress,
      resolved,
      rejected,
    },
    priority: {
      low,
      medium,
      high,
      urgent,
    },
    category: categoryBreakdown.map((item) => ({
      category: item._id,
      count: item.count,
    })),
    recent: {
      last_7_days: recentCount,
    },
    resolved_this_month: resolvedThisMonth,
  };
};

/**
 * Update complaint research data
 */
export const updateComplaintResearch = async (
  complaintId: string,
  researchData: any
): Promise<any> => {
  const complaint = await Complaint.findOne({ id: complaintId });

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  complaint.research_data = researchData;
  complaint.updated_at = new Date();
  await complaint.save({ validateModifiedOnly: true });

  try {
    await complaintTimeline.appendResearchCompleted(
      complaintId,
      { updated: true },
      undefined
    );
  } catch (err) {
    logger.warn("Timeline appendResearchCompleted failed:", err);
  }

  logger.info(`Research data updated for complaint: ${complaintId}`);
  return complaint.toObject();
};

/**
 * Update complaint stage1 data
 */
export interface UpdateStage1DataDto {
  primary_officer?: {
    name?: string;
    designation: string;
    office_address: string;
    phone: string;
    email: string;
  };
  secondary_officer?: {
    name?: string;
    designation: string;
    office_address: string;
    phone: string;
    email: string;
  };
  drafted_letter?: {
    from: string;
    to: string;
    date: string;
    subject: string;
    body: string;
    attachments?: string[];
  };
  selected_officer?: {
    name?: string;
    designation: string;
    office_address: string;
    phone: string;
    email: string;
  };
  stage1_additional_docs?: string[];
}

export const updateComplaintStage1Data = async (
  complaintId: string,
  stage1Data: UpdateStage1DataDto
): Promise<any> => {
  const complaint = await Complaint.findOne({ id: complaintId });

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  const previousSelectedOfficer = complaint.selected_officer
    ? { ...complaint.selected_officer }
    : undefined;

  // Update only provided fields (partial update)
  if (stage1Data.primary_officer !== undefined) {
    complaint.primary_officer = stage1Data.primary_officer;
  }
  if (stage1Data.secondary_officer !== undefined) {
    complaint.secondary_officer = stage1Data.secondary_officer;
  }
  if (stage1Data.drafted_letter !== undefined) {
    complaint.drafted_letter = stage1Data.drafted_letter;
  }
  if (stage1Data.selected_officer !== undefined) {
    complaint.selected_officer = stage1Data.selected_officer;
  }
  if (stage1Data.stage1_additional_docs !== undefined) {
    complaint.stage1_additional_docs = stage1Data.stage1_additional_docs;
  }

  complaint.updated_at = new Date();
  await complaint.save({ validateModifiedOnly: true });

  try {
    if (stage1Data.drafted_letter !== undefined) {
      await complaintTimeline.appendLetterSaved(
        complaintId,
        {
          to_name: stage1Data.drafted_letter?.to,
          to_designation: complaint.selected_officer?.designation,
        },
        undefined
      );
    }
    if (
      stage1Data.selected_officer !== undefined &&
      previousSelectedOfficer &&
      previousSelectedOfficer.email !== stage1Data.selected_officer?.email
    ) {
      await complaintTimeline.appendRecipientUpdated(
        complaintId,
        {
          previous_officer_name: previousSelectedOfficer.name,
          new_officer_name: stage1Data.selected_officer?.name,
          new_officer_email: stage1Data.selected_officer?.email,
        },
        undefined
      );
    }
  } catch (err) {
    logger.warn("Timeline append after updateComplaintStage1Data failed:", err);
  }

  logger.info(`Stage1 data updated for complaint: ${complaintId}`);
  return complaint.toObject();
};

/**
 * Regenerate AI analysis for a complaint
 * Clears existing AI data and prepares for new analysis
 */
export const regenerateAIAnalysis = async (
  complaintId: string
): Promise<void> => {
  const complaint = await Complaint.findOne({ id: complaintId });

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  // Clear existing AI data
  complaint.ai_analysis_completed = false;
  complaint.ai_severity_score = undefined;
  complaint.ai_estimated_cost = undefined;
  complaint.ai_estimated_timeline_days = undefined;
  complaint.ai_risks = undefined;
  complaint.ai_alternatives = undefined;
  complaint.ai_success_metrics = undefined;
  complaint.ai_resource_requirements = undefined;
  complaint.ai_analysis = undefined;
  complaint.updated_at = new Date();
  await complaint.save();

  // Delete existing AI resolution steps
  await AIResolutionStep.deleteMany({ complaint_id: complaintId });

  logger.info(
    `AI analysis data cleared for complaint: ${complaintId}. Ready for regeneration.`
  );
};

/**
 * Get AI analysis progress for a complaint
 */
export const getAIAnalysisProgress = async (complaintId: string) => {
  const complaint = await Complaint.findOne({ id: complaintId }).lean();

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  // Count AI resolution steps
  const totalSteps = await AIResolutionStep.countDocuments({
    complaint_id: complaintId,
  });

  // Count completed steps
  const completedSteps = await AIResolutionStep.countDocuments({
    complaint_id: complaintId,
    status: "completed",
  });

  // Count instructions
  const instructionsGenerated = await AIStepExecutionInstruction.countDocuments(
    {
      complaint_id: complaintId,
    }
  );

  // Calculate completion percentage
  const completionPercentage =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return {
    analysis_completed: complaint.ai_analysis_completed || false,
    steps_generated: totalSteps,
    instructions_generated: instructionsGenerated,
    total_steps: totalSteps,
    completed_steps: completedSteps,
    completion_percentage: completionPercentage,
  };
};

/**
 * Send email with drafted letter
 */
export const sendComplaintEmail = async (
  complaintId: string,
  recipientEmail?: string
): Promise<any> => {
  const complaint = await Complaint.findOne({ id: complaintId });

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  // Check if drafted letter exists
  if (!complaint.drafted_letter) {
    throw new ValidationError(
      "Drafted letter not found. Please draft a letter first."
    );
  }

  const letter = complaint.drafted_letter;

  // For testing: send all emails to 'rajamoulirrr46@gmail.com'
  // TODO: Remove this hardcoding after testing
  const testEmail = "himanshujainhj70662@gmail.com";

  // Determine recipient email
  // Priority: testEmail (for testing) > recipientEmail (from request) > primary_officer.email
  let emailTo: string | undefined = testEmail;
  if (!testEmail) {
    emailTo = recipientEmail || complaint.primary_officer?.email;
  }

  if (!emailTo) {
    throw new ValidationError(
      "Recipient email address is required. Please provide recipientEmail or ensure primary_officer has an email."
    );
  }

  // Prepare email content
  const emailSubject = letter.subject || `Complaint Letter: ${complaint.title}`;

  // Format email body with letter content
  const emailBody = `
${letter.body || ""}

---
Complaint ID: ${complaint.id}
Complaint Title: ${complaint.title}
Category: ${complaint.category}
Status: ${complaint.status}
  `.trim();

  // Get sender email (from environment)
  const fromEmail = env.SMTP_FROM_EMAIL || env.SMTP_USER || "";

  try {
    // Send email using email service
    const emailResult = await emailService.sendEmail({
      to: emailTo,
      subject: emailSubject,
      text: emailBody,
      html: `<pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${emailBody.replace(
        /\n/g,
        "<br>"
      )}</pre>`,
    });

    logger.info(`Email sent successfully for complaint ${complaintId}`, {
      messageId: emailResult.messageId,
      to: emailTo,
      subject: emailSubject,
    });

    // Save email history to complaint
    const emailHistoryEntry = {
      from: fromEmail,
      to: emailTo,
      subject: emailSubject,
      messageId: emailResult.messageId,
      sentAt: new Date(),
      status: "sent" as const,
    };

    // Initialize email_history array if it doesn't exist
    if (!complaint.email_history) {
      complaint.email_history = [];
    }

    // Add email history entry
    complaint.email_history.push(emailHistoryEntry);
    complaint.updated_at = new Date();
    await complaint.save({ validateModifiedOnly: true });

    logger.info(`Email history saved for complaint ${complaintId}`);

    return {
      success: true,
      messageId: emailResult.messageId,
      recipient: emailTo,
      subject: emailSubject,
      sentAt: emailHistoryEntry.sentAt,
    };
  } catch (error) {
    logger.error(`Failed to send email for complaint ${complaintId}:`, error);

    // Save failed email attempt to history
    const emailHistoryEntry = {
      from: fromEmail,
      to: emailTo,
      subject: emailSubject,
      sentAt: new Date(),
      status: "failed" as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };

    // Initialize email_history array if it doesn't exist
    if (!complaint.email_history) {
      complaint.email_history = [];
    }

    // Add failed email history entry
    complaint.email_history.push(emailHistoryEntry);
    complaint.updated_at = new Date();
    await complaint.save({ validateModifiedOnly: true });

    logger.info(`Failed email history saved for complaint ${complaintId}`);

    throw new ValidationError(
      error instanceof Error
        ? `Failed to send email: ${error.message}`
        : "Failed to send email"
    );
  }
};

/**
 * Get email history for a complaint
 */
export const getComplaintEmailHistory = async (
  complaintId: string
): Promise<any[]> => {
  const complaint = await Complaint.findOne({ id: complaintId }).lean();

  if (!complaint) {
    throw new NotFoundError("Complaint");
  }

  // Return email history or empty array
  return complaint.email_history || [];
};

/**
 * Remove complaint from an officer's assignedComplaints (single source of truth).
 * Handles legacy data: officer may have no assignedComplaints or complaint may not be in array.
 * @param complaintMongoId - Complaint's _id (ObjectId)
 * @param officerId - Officer's _id (string)
 */
async function removeComplaintFromOfficer(
  complaintMongoId: mongoose.Types.ObjectId,
  officerId: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(officerId)) return;
  const officer = await Officer.findById(officerId);
  if (!officer) return;
  const list = officer.assignedComplaints;
  if (!list || !Array.isArray(list)) return;
  const before = list.length;
  officer.assignedComplaints = list.filter(
    (id) => id && id.toString() !== complaintMongoId.toString()
  );
  if (officer.assignedComplaints.length < before) {
    await officer.save();
    logger.debug(
      `Removed complaint ${complaintMongoId} from officer ${officerId} (complaint moved/reassigned)`
    );
  }
}

/**
 * Assign complaint to a new officer (creates User and Officer records)
 * Service function for internal use
 */
export const assignNewOfficerService = async (
  complaintId: string,
  executive: any
): Promise<any> => {
  // Find complaint
  const complaint = await Complaint.findOne({ id: complaintId });
  if (!complaint) {
    throw new NotFoundError("Complaint not found");
  }

  // Generate dummy password for testing
  const dummyPassword = `Officer@${Date.now()}`;
  const hashedPassword = await bcrypt.hash(dummyPassword, 10);

  // Log the password for testing purposes
  logger.info(
    `[TESTING] Created officer user with email: ${executive.email}, Password: ${dummyPassword}`
  );
  console.log(
    `[TESTING] Officer User Created - Email: ${executive.email}, Password: ${dummyPassword}`
  );

  // Create User account
  const newUser = new User({
    email: executive.email.toLowerCase().trim(),
    password: hashedPassword,
    name: executive.name.trim(),
    role: "officer",
    isActive: true,
  });
  await newUser.save();

  // Determine department category from designation or department
  let departmentCategory:
    | "revenue"
    | "development"
    | "police"
    | "health"
    | "education"
    | "engineering"
    | "other" = "other";
  const designationLower = (executive.designation || "").toLowerCase();
  const departmentLower = (executive.department || "").toLowerCase();

  if (
    designationLower.includes("revenue") ||
    departmentLower.includes("revenue")
  ) {
    departmentCategory = "revenue";
  } else if (
    designationLower.includes("development") ||
    departmentLower.includes("development")
  ) {
    departmentCategory = "development";
  } else if (
    designationLower.includes("police") ||
    departmentLower.includes("police")
  ) {
    departmentCategory = "police";
  } else if (
    designationLower.includes("health") ||
    departmentLower.includes("health")
  ) {
    departmentCategory = "health";
  } else if (
    designationLower.includes("education") ||
    departmentLower.includes("education")
  ) {
    departmentCategory = "education";
  } else if (
    designationLower.includes("engineer") ||
    departmentLower.includes("engineering")
  ) {
    departmentCategory = "engineering";
  }

  // Extract district LGD from complaint or use default
  const districtLgd = complaint.district_name === "Budaun" ? 134 : 0; // Default to 0 if unknown

  // Create or update Officer record
  let officer = await Officer.findOne({
    email: executive.email.toLowerCase(),
  });

  if (officer) {
    // Update existing officer
    officer.name = executive.name.trim();
    officer.designation = executive.designation.trim();
    officer.department = executive.department || executive.designation;
    officer.departmentCategory =
      executive.departmentCategory || departmentCategory;
    officer.phone = executive.phone || executive.contact?.phone || "";
    officer.cug = executive.contact?.cug_mobile || executive.cug || "";
    // officeAddress is required - check for non-empty strings
    const officeAddressValue =
      (executive.office_address && executive.office_address.trim()) ||
      (executive.contact?.address && executive.contact.address.trim()) ||
      (executive.contact?.official_address &&
        executive.contact.official_address.trim()) ||
      (executive.officeAddress && executive.officeAddress.trim()) ||
      `${
        executive.district || complaint.district_name || "District"
      } District Office`;
    officer.officeAddress = officeAddressValue;
    officer.districtName = executive.district || complaint.district_name;
    officer.districtLgd = districtLgd;
    officer.userId = newUser._id;

    // Initialize counters if not present
    if (!officer.assignedComplaints) {
      officer.assignedComplaints = [];
    }
    if (officer.noOfComplaintsArrived === undefined) {
      officer.noOfComplaintsArrived = 0;
    }
    if (officer.noOfComplaintsActed === undefined) {
      officer.noOfComplaintsActed = 0;
    }
    if (officer.noOfComplaintsClosed === undefined) {
      officer.noOfComplaintsClosed = 0;
    }
  } else {
    // Create new officer
    officer = new Officer({
      name: executive.name.trim(),
      designation: executive.designation.trim(),
      department: executive.department || executive.designation,
      departmentCategory: executive.departmentCategory || departmentCategory,
      email: executive.email.toLowerCase().trim(),
      phone: executive.phone || executive.contact?.phone || "",
      cug: executive.contact?.cug_mobile || executive.cug || "",
      // officeAddress is required - check for non-empty strings
      officeAddress: (() => {
        const addr =
          (executive.office_address && executive.office_address.trim()) ||
          (executive.contact?.address && executive.contact.address.trim()) ||
          (executive.contact?.official_address &&
            executive.contact.official_address.trim()) ||
          (executive.officeAddress && executive.officeAddress.trim());
        return (
          addr ||
          `${
            executive.district || complaint.district_name || "District"
          } District Office`
        );
      })(),
      districtName: executive.district || complaint.district_name,
      districtLgd: districtLgd,
      isDistrictLevel: true, // Default to district level
      isSubDistrictLevel: false,
      userId: newUser._id,
      assignedComplaints: [],
      noOfComplaintsArrived: 0,
      noOfComplaintsActed: 0,
      noOfComplaintsClosed: 0,
    });
  }

  const previousAssignedUserId = complaint.assigned_to_user_id;
  const previousOfficerId = complaint.assignedOfficer?.toString();

  // Single source of truth: remove complaint from previous officer's list (if any)
  if (previousOfficerId) {
    await removeComplaintFromOfficer(complaint._id, previousOfficerId);
  }

  // Add complaint to new officer's assigned complaints
  if (!officer.assignedComplaints) {
    officer.assignedComplaints = [];
  }
  if (!officer.assignedComplaints.includes(complaint._id)) {
    officer.assignedComplaints.push(complaint._id);
    officer.noOfComplaintsArrived = (officer.noOfComplaintsArrived || 0) + 1;
  }
  await officer.save();

  // Update User with officerId reference
  newUser.officerId = officer._id;
  await newUser.save();

  // Update complaint with assignment details
  complaint.assigned_to_user_id = newUser.id;
  complaint.assignedOfficer = officer._id;
  complaint.isOfficerAssigned = true;
  complaint.assignedTime = new Date();
  complaint.arrivalTime = new Date();
  complaint.timeBoundary = 7; // 1 week default
  complaint.status = "in_progress";
  await complaint.save();

  try {
    if (previousAssignedUserId && previousOfficerId) {
      await complaintTimeline.appendOfficerReassigned(
        complaintId,
        {
          previous_officer_id: previousOfficerId,
          new_officer_id: officer._id.toString(),
          new_officer_name: executive.name,
          new_officer_email: executive.email,
          new_time_deadline_days: 7,
        },
        undefined
      );
    } else {
      await complaintTimeline.appendOfficerAssigned(
        complaintId,
        {
          assigned_to_user_id: newUser.id,
          officer_id: officer._id.toString(),
          officer_name: executive.name,
          officer_email: executive.email,
          time_deadline_days: 7,
          is_new_officer: true,
        },
        undefined
      );
    }
  } catch (err) {
    logger.warn("Timeline append officer assign failed:", err);
  }

  logger.info(
    `Complaint ${complaintId} assigned to new officer ${executive.name} (${executive.email})`
  );

  return {
    complaint: complaint.toObject(),
    officer: officer.toObject(),
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      password: dummyPassword, // Return password for testing
    },
    isNewOfficer: true,
  };
};

/**
 * Assign complaint to an existing officer (officer already has User account)
 * Service function for internal use
 */
export const assignExistingOfficerService = async (
  complaintId: string,
  officerId: string
): Promise<any> => {
  // Find complaint
  const complaint = await Complaint.findOne({ id: complaintId });
  if (!complaint) {
    throw new NotFoundError("Complaint not found");
  }

  // Validate officer ID format
  if (!mongoose.Types.ObjectId.isValid(officerId)) {
    throw new ValidationError("Invalid officer ID format");
  }

  // Find officer
  const officer = await Officer.findById(officerId);
  if (!officer) {
    throw new NotFoundError("Officer not found");
  }

  // Find user associated with officer
  const user = await User.findOne({ officerId: officer._id, role: "officer" });
  if (!user) {
    throw new NotFoundError("User account not found for this officer");
  }

  // Check if complaint is already assigned to this officer
  if (
    complaint.assignedOfficer &&
    complaint.assignedOfficer.toString() === officerId
  ) {
    throw new ValidationError("Complaint is already assigned to this officer");
  }

  const previousAssignedUserId = complaint.assigned_to_user_id;
  const previousOfficerId = complaint.assignedOfficer?.toString();

  // Single source of truth: remove complaint from previous officer's list (if any)
  if (previousOfficerId) {
    await removeComplaintFromOfficer(complaint._id, previousOfficerId);
  }

  // Add complaint to new officer's assigned complaints if not already present
  if (!officer.assignedComplaints) {
    officer.assignedComplaints = [];
  }
  if (!officer.assignedComplaints.includes(complaint._id)) {
    officer.assignedComplaints.push(complaint._id);
    officer.noOfComplaintsArrived = (officer.noOfComplaintsArrived || 0) + 1;
    await officer.save();
  }

  // Update complaint with assignment details
  complaint.assigned_to_user_id = user.id;
  complaint.assignedOfficer = officer._id;
  complaint.isOfficerAssigned = true;
  complaint.assignedTime = new Date();
  complaint.arrivalTime = new Date();
  complaint.timeBoundary = 7; // 1 week default
  complaint.status = "in_progress";
  await complaint.save();

  try {
    if (previousAssignedUserId && previousOfficerId) {
      let previousOfficerName: string | undefined;
      let previousOfficerEmail: string | undefined;
      try {
        const prevOfficer = await Officer.findById(previousOfficerId).lean();
        if (prevOfficer) {
          previousOfficerName = prevOfficer.name;
          previousOfficerEmail = prevOfficer.email;
        }
      } catch (_) {
        // ignore
      }
      await complaintTimeline.appendOfficerReassigned(
        complaintId,
        {
          previous_officer_id: previousOfficerId,
          previous_officer_name: previousOfficerName,
          previous_officer_email: previousOfficerEmail,
          new_officer_id: officer._id.toString(),
          new_officer_name: officer.name,
          new_officer_email: officer.email,
          new_time_deadline_days: 7,
        },
        undefined
      );
    } else {
      await complaintTimeline.appendOfficerAssigned(
        complaintId,
        {
          assigned_to_user_id: user.id,
          officer_id: officer._id.toString(),
          officer_name: officer.name,
          officer_email: officer.email,
          time_deadline_days: 7,
          is_new_officer: false,
        },
        undefined
      );
    }
  } catch (err) {
    logger.warn("Timeline append officer assign failed:", err);
  }

  logger.info(
    `Complaint ${complaintId} assigned to existing officer ${officer.name} (${officer.email})`
  );

  return {
    complaint: complaint.toObject(),
    officer: officer.toObject(),
    isNewOfficer: false,
  };
};

/**
 * Assign complaint to officer (main service function)
 * Intelligently determines whether to create new officer or use existing one
 * based on email in the request
 */
export const assignOfficer = async (
  complaintId: string,
  executive: any
): Promise<any> => {
  // Validate executive data
  if (!executive) {
    throw new ValidationError("Executive data is required");
  }

  if (!executive.name || !executive.designation || !executive.email) {
    throw new ValidationError(
      "Executive name, designation, and email are required"
    );
  }

  const email = executive.email.toLowerCase().trim();

  // Check if officer exists by email
  const existingOfficer = await Officer.findOne({ email });

  if (existingOfficer) {
    // Officer exists - check if user account exists
    const existingUser = await User.findOne({
      email,
      role: "officer",
    });

    if (existingUser && existingOfficer.userId) {
      // Both officer and user exist - use existing officer
      logger.info(
        `Officer with email ${email} already exists. Using existing officer assignment.`
      );
      return await assignExistingOfficerService(
        complaintId,
        existingOfficer._id.toString()
      );
    } else {
      // Officer exists but no user account - create user and link
      logger.info(
        `Officer with email ${email} exists but no user account. Creating user account.`
      );
      // This case is handled by assignNewOfficerService which will update the existing officer
      return await assignNewOfficerService(complaintId, executive);
    }
  } else {
    // Officer doesn't exist - create new officer and user
    logger.info(
      `Officer with email ${email} does not exist. Creating new officer and user.`
    );
    return await assignNewOfficerService(complaintId, executive);
  }
};

/**
 * Reassign complaint to a different officer (admin only).
 * Single source of truth: updates Complaint.assignedOfficer and both officers' assignedComplaints.
 * Appends officer_reassigned to timeline (works even if no prior timeline event exists for this complaint).
 */
export const reassignOfficer = async (
  complaintId: string,
  newOfficerId: string,
  adminId?: string
): Promise<{ complaint: any; officer: any }> => {
  const complaint = await Complaint.findOne({ id: complaintId });
  if (!complaint) {
    throw new NotFoundError("Complaint not found");
  }

  if (!complaint.assignedOfficer || !complaint.isOfficerAssigned) {
    throw new ValidationError(
      "Complaint is not assigned to any officer. Use assign-officer to assign."
    );
  }

  const previousOfficerId = complaint.assignedOfficer.toString();
  if (previousOfficerId === newOfficerId) {
    throw new ValidationError("Complaint is already assigned to this officer.");
  }

  if (!mongoose.Types.ObjectId.isValid(newOfficerId)) {
    throw new ValidationError("Invalid new officer ID format");
  }

  const newOfficer = await Officer.findById(newOfficerId);
  if (!newOfficer) {
    throw new NotFoundError("Officer not found");
  }

  const newUser = await User.findOne({
    officerId: newOfficer._id,
    role: "officer",
  });
  if (!newUser) {
    throw new NotFoundError("User account not found for this officer");
  }

  // Single source of truth: remove complaint from previous officer's list
  await removeComplaintFromOfficer(complaint._id, previousOfficerId);

  // Add complaint to new officer's list
  if (!newOfficer.assignedComplaints) {
    newOfficer.assignedComplaints = [];
  }
  if (!newOfficer.assignedComplaints.includes(complaint._id)) {
    newOfficer.assignedComplaints.push(complaint._id);
    newOfficer.noOfComplaintsArrived =
      (newOfficer.noOfComplaintsArrived || 0) + 1;
  }
  await newOfficer.save();

  // Previous officer details for timeline (handles legacy: no timeline element needed to exist)
  let previousOfficerName: string | undefined;
  let previousOfficerEmail: string | undefined;
  try {
    const prevOfficer = await Officer.findById(previousOfficerId).lean();
    if (prevOfficer) {
      previousOfficerName = prevOfficer.name;
      previousOfficerEmail = prevOfficer.email;
    }
  } catch (_) {
    // ignore
  }

  // Update complaint to new officer (reopened if it was closed, so new officer sees it as active)
  complaint.assigned_to_user_id = newUser.id;
  complaint.assignedOfficer = newOfficer._id;
  complaint.isOfficerAssigned = true;
  complaint.assignedTime = new Date();
  complaint.arrivalTime = new Date();
  complaint.timeBoundary = 7;
  complaint.status = "in_progress";
  if (complaint.isComplaintClosed) {
    complaint.isComplaintClosed = false;
    // closingDetails kept for audit; complaint is effectively reopened for new officer
  }
  await complaint.save();

  try {
    await complaintTimeline.appendOfficerReassigned(
      complaintId,
      {
        previous_officer_id: previousOfficerId,
        previous_officer_name: previousOfficerName,
        previous_officer_email: previousOfficerEmail,
        new_officer_id: newOfficer._id.toString(),
        new_officer_name: newOfficer.name,
        new_officer_email: newOfficer.email,
        new_time_deadline_days: 7,
      },
      adminId ? { user_id: adminId, role: "admin" } : undefined
    );
  } catch (err) {
    logger.warn("Timeline appendOfficerReassigned failed:", err);
  }

  logger.info(
    `Complaint ${complaintId} reassigned from officer ${previousOfficerId} to ${newOfficer.name} (${newOfficer.email})`
  );

  return {
    complaint: complaint.toObject(),
    officer: newOfficer.toObject(),
  };
};

/**
 * Unassign complaint from officer (admin only).
 * Clears assignment on complaint and appends timeline event.
 */
export const unassignComplaint = async (
  complaintId: string,
  adminId?: string
): Promise<any> => {
  const complaint = await Complaint.findOne({ id: complaintId });
  if (!complaint) {
    throw new NotFoundError("Complaint not found");
  }

  const previousOfficerId = complaint.assignedOfficer?.toString();
  let previousOfficerName: string | undefined;
  let previousOfficerEmail: string | undefined;
  if (previousOfficerId) {
    try {
      const prevOfficer = await Officer.findById(previousOfficerId).lean();
      if (prevOfficer) {
        previousOfficerName = prevOfficer.name;
        previousOfficerEmail = prevOfficer.email;
      }
    } catch (_) {
      // ignore
    }
    // Single source of truth: remove complaint from officer's list
    await removeComplaintFromOfficer(complaint._id, previousOfficerId);
  }

  complaint.assigned_to_user_id = undefined;
  complaint.assignedOfficer = undefined;
  complaint.isOfficerAssigned = false;
  if (complaint.status === "in_progress") {
    complaint.status = "pending";
  }
  await complaint.save();

  try {
    if (previousOfficerId) {
      await complaintTimeline.appendOfficerUnassigned(
        complaintId,
        {
          previous_officer_id: previousOfficerId,
          previous_officer_name: previousOfficerName,
          previous_officer_email: previousOfficerEmail,
        },
        adminId ? { user_id: adminId, role: "admin" } : undefined
      );
    }
  } catch (err) {
    logger.warn("Timeline appendOfficerUnassigned failed:", err);
  }

  logger.info(`Complaint ${complaintId} unassigned`);
  return complaint.toObject();
};
