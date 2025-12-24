import { Complaint } from "../models/Complaint";
import { AIResolutionStep } from "../models/AIResolutionStep";
import { ComplaintNote } from "../models/ComplaintNote";
import { ComplaintDocument } from "../models/ComplaintDocument";
import { AIStepExecutionInstruction } from "../models/AIStepExecutionInstruction";
import { NotFoundError, ValidationError } from "../utils/errors";
import logger from "../config/logger";

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

  // Fetch notes
  const notes = await ComplaintNote.find({ complaint_id: id })
    .sort({ created_at: -1 })
    .lean();

  // Fetch documents
  const documents = await ComplaintDocument.find({ complaint_id: id })
    .sort({ created_at: -1 })
    .lean();

  return {
    ...complaint,
    ai_steps: steps,
    notes,
    documents,
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

  // Update fields
  Object.assign(complaint, data);

  // Auto-set resolution date if status changes to resolved
  if (data.status === "resolved" && !complaint.actual_resolution_date) {
    complaint.actual_resolution_date = new Date();
  }

  await complaint.save({ validateModifiedOnly: true });
  logger.info(`Complaint updated: ${id}`);

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
  return complaintNote.toObject();
};

/**
 * Get complaint notes
 */
export const getComplaintNotes = async (complaintId: string) => {
  const notes = await ComplaintNote.find({ complaint_id: complaintId })
    .sort({ created_at: -1 })
    .lean();

  return notes;
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
  return document.toObject();
};

/**
 * Get complaint documents
 */
export const getComplaintDocuments = async (complaintId: string) => {
  const documents = await ComplaintDocument.find({ complaint_id: complaintId })
    .sort({ created_at: -1 })
    .lean();

  return documents;
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
  if (stage1Data.stage1_additional_docs !== undefined) {
    complaint.stage1_additional_docs = stage1Data.stage1_additional_docs;
  }

  complaint.updated_at = new Date();
  await complaint.save({ validateModifiedOnly: true });

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
