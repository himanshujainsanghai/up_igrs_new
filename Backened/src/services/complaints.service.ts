import { Complaint } from "../models/Complaint";
import { AIResolutionStep } from "../models/AIResolutionStep";
import { ComplaintNote } from "../models/ComplaintNote";
import { ComplaintDocument } from "../models/ComplaintDocument";
import { AIStepExecutionInstruction } from "../models/AIStepExecutionInstruction";
import { NotFoundError, ValidationError } from "../utils/errors";
import logger from "../config/logger";
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

  // Add complaint to officer's assigned complaints
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

  // Add complaint to officer's assigned complaints if not already present
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
