import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as complaintsService from "../services/complaints.service";
import { sendSuccess, sendPaginated, sendError } from "../utils/response";
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors";
import { Complaint } from "../models/Complaint";
import { User } from "../models/User";
import DistrictAdministrativeHead from "../models/DistrictAdministrativeHead";
import logger from "../config/logger";
import { emailService } from "../modules/email";
import { env } from "../config/env";

/**
 * Complaints Controller
 * Handles HTTP requests for complaint operations
 */

/**
 * GET /api/v1/complaints
 * Get all complaints with filters and pagination
 */
export const getAllComplaints = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string,
      category: req.query.category as string,
      sub_category: req.query.sub_category as string,
      priority: req.query.priority as string,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await complaintsService.getAllComplaints(filters);

    sendPaginated(
      res,
      result.complaints,
      filters.page,
      filters.limit,
      result.pagination.total
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/complaints/:id
 * Get single complaint by ID
 */
export const getComplaintById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const complaint = await complaintsService.getComplaintById(id);
    sendSuccess(res, complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/complaints
 * Create new complaint (public endpoint)
 */
export const createComplaint = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const complaintData = req.body;

    // Validate required geographic fields
    if (
      complaintData.latitude === undefined ||
      complaintData.latitude === null
    ) {
      throw new ValidationError("latitude is required");
    }
    if (
      complaintData.longitude === undefined ||
      complaintData.longitude === null
    ) {
      throw new ValidationError("longitude is required");
    }
    if (
      !complaintData.district_name ||
      typeof complaintData.district_name !== "string" ||
      complaintData.district_name.trim().length === 0
    ) {
      throw new ValidationError("district_name is required");
    }
    if (
      !complaintData.subdistrict_name ||
      typeof complaintData.subdistrict_name !== "string" ||
      complaintData.subdistrict_name.trim().length === 0
    ) {
      throw new ValidationError("subdistrict_name is required");
    }

    // Validate latitude and longitude ranges
    if (
      typeof complaintData.latitude !== "number" ||
      complaintData.latitude < -90 ||
      complaintData.latitude > 90
    ) {
      throw new ValidationError("latitude must be a number between -90 and 90");
    }
    if (
      typeof complaintData.longitude !== "number" ||
      complaintData.longitude < -180 ||
      complaintData.longitude > 180
    ) {
      throw new ValidationError(
        "longitude must be a number between -180 and 180"
      );
    }

    logger.info("Creating complaint with data:", {
      title: complaintData.title,
      category: complaintData.category,
      hasImages:
        Array.isArray(complaintData.images) && complaintData.images.length > 0,
      imageCount: Array.isArray(complaintData.images)
        ? complaintData.images.length
        : 0,
      latitude: complaintData.latitude,
      longitude: complaintData.longitude,
      district_name: complaintData.district_name,
      subdistrict_name: complaintData.subdistrict_name,
      village_name: complaintData.village_name || "not provided",
    });

    const complaint = await complaintsService.createComplaint(complaintData);
    logger.info(
      `Complaint created successfully: ${complaint.id || complaint._id}`
    );
    sendSuccess(res, complaint, 201);
  } catch (error) {
    logger.error("Error creating complaint:", error);
    next(error);
  }
};

/**
 * PUT /api/v1/complaints/:id
 * Update complaint (admin only)
 */
export const updateComplaint = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const complaint = await complaintsService.updateComplaint(id, updateData);
    sendSuccess(res, complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/complaints/:id
 * Delete complaint (admin only)
 */
export const deleteComplaint = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await complaintsService.deleteComplaint(id);
    sendSuccess(res, { message: "Complaint deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/complaints/:id/research
 * Update complaint research data (admin only)
 */
export const updateComplaintResearch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { research_data } = req.body;

    if (!research_data) {
      throw new ValidationError("research_data is required");
    }

    const complaint = await complaintsService.updateComplaintResearch(
      id,
      research_data
    );
    sendSuccess(res, complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/complaints/:id/stage1
 * Update complaint stage1 data (admin only)
 */
export const updateComplaintStage1Data = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const stage1Data = req.body;

    // Validate at least one field is provided
    const hasData =
      stage1Data.primary_officer !== undefined ||
      stage1Data.secondary_officer !== undefined ||
      stage1Data.drafted_letter !== undefined ||
      stage1Data.selected_officer !== undefined ||
      stage1Data.stage1_additional_docs !== undefined;

    if (!hasData) {
      throw new ValidationError("At least one stage1 field must be provided");
    }

    const complaint = await complaintsService.updateComplaintStage1Data(
      id,
      stage1Data
    );
    sendSuccess(res, complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/complaints/:id/notes
 * Add note to complaint
 */
export const addComplaintNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || note.trim().length < 5) {
      throw new ValidationError("Note must be at least 5 characters");
    }

    const complaintNote = await complaintsService.addComplaintNote(
      id,
      note,
      req.user?.email
    );

    sendSuccess(res, complaintNote, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/complaints/:id/notes
 * Get complaint notes
 */
export const getComplaintNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const notes = await complaintsService.getComplaintNotes(id);
    sendSuccess(res, notes);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/complaints/:id/documents
 * Add document to complaint
 */
export const addComplaintDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { file_url, file_name, file_type } = req.body;

    if (!file_url || !file_name || !file_type) {
      throw new ValidationError(
        "file_url, file_name, and file_type are required"
      );
    }

    if (!["inward", "outward"].includes(file_type)) {
      throw new ValidationError('file_type must be "inward" or "outward"');
    }

    const document = await complaintsService.addComplaintDocument(
      id,
      file_url,
      file_name,
      file_type,
      req.user?.email
    );

    sendSuccess(res, document, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/complaints/:id/documents
 * Get complaint documents
 */
export const getComplaintDocuments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const documents = await complaintsService.getComplaintDocuments(id);
    sendSuccess(res, documents);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/complaints/track/phone/:phoneNumber
 * Track complaints by phone number
 */
export const trackByPhone = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      sendError(res, "Phone number is required", 400, "VALIDATION_ERROR");
      return;
    }

    const complaints = await complaintsService.trackByPhone(phoneNumber);

    sendSuccess(res, {
      phone: phoneNumber,
      complaints,
      count: complaints.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/complaints/statistics
 * Get complaint statistics for dashboard
 */
export const getStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const statistics = await complaintsService.getComplaintStatistics();
    sendSuccess(res, statistics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/complaints/badaun
 * Get all complaints for Badaun district (public endpoint, no auth required)
 * Returns all complaints filtered by district_name "Badaun" or "Budaun"
 */
export const getBadaunComplaints = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch all complaints for Badaun district (both spellings)
    const complaints = await Complaint.find({
      $or: [{ district_name: "Badaun" }, { district_name: "Budaun" }],
    })
      .sort({ created_at: -1 })
      .lean();

    logger.info(`Fetched ${complaints.length} complaints for Badaun district`);

    sendSuccess(res, {
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    logger.error("Error fetching Badaun complaints:", error);
    next(error);
  }
};

/**
 * GET /api/v1/complaints/executives
 * Get all executive authorities from district administrative heads
 */
export const getExecutives = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch all district administrative heads with only executive_authorities field
    const administrativeHeads = await DistrictAdministrativeHead.find({})
      .select("district executive_authorities district_profile")
      .populate("district", "districtName districtLgd stateName")
      .lean();

    // Extract executive_authorities from each document
    const executives = administrativeHeads.map((head: any) => ({
      district: head.district,
      district_profile: head.district_profile,
      executive_authorities: head.executive_authorities,
    }));

    logger.info(`Fetched executives from ${executives.length} districts`);
    sendSuccess(res, executives);
  } catch (error) {
    logger.error("Error fetching executives:", error);
    next(error);
  }
};

/**
 * PUT /api/v1/complaints/:id/assign
 * Assign complaint to officer user (admin only)
 */
export const assignComplaintToOfficer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { assigned_to_user_id } = req.body;

    if (!assigned_to_user_id) {
      throw new ValidationError("Officer user ID is required");
    }

    // Verify officer user exists
    const officerUser = await User.findOne({
      id: assigned_to_user_id,
      role: "officer",
    });
    if (!officerUser) {
      throw new NotFoundError("Officer user not found");
    }

    const complaint = await Complaint.findOne({ id });
    if (!complaint) {
      throw new NotFoundError("Complaint not found");
    }

    complaint.assigned_to_user_id = assigned_to_user_id;
    complaint.status = "in_progress";
    await complaint.save();

    logger.info(`Complaint ${id} assigned to officer ${officerUser.email}`);

    sendSuccess(res, complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/complaints/:id/unassign
 * Unassign complaint from officer (admin only)
 */
export const unassignComplaint = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findOne({ id });
    if (!complaint) {
      throw new NotFoundError("Complaint not found");
    }

    complaint.assigned_to_user_id = undefined;
    if (complaint.status === "in_progress") {
      complaint.status = "pending";
    }
    await complaint.save();

    logger.info(`Complaint ${id} unassigned by admin ${req.user?.email}`);

    sendSuccess(res, complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/complaints/my-complaints
 * Get complaints assigned to logged-in officer (officer only)
 */
export const getMyComplaints = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Authentication required");
    }

    // Verify user is an officer
    if (req.user?.role !== "officer") {
      throw new UnauthorizedError(
        "Only officers can access their assigned complaints"
      );
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const category = req.query.category as string;
    const priority = req.query.priority as string;
    const search = req.query.search as string;

    const query: any = {
      assigned_to_user_id: userId,
    };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority;
    }

    // Handle search - search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { contact_name: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const complaints = await Complaint.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Complaint.countDocuments(query);

    sendPaginated(res, complaints, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/complaints/:id/send-email
 * Send email with drafted letter (admin only)
 */
export const sendComplaintEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { recipientEmail } = req.body;

    const result = await complaintsService.sendComplaintEmail(
      id,
      recipientEmail
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/complaints/:id/email-history
 * Get email history for a complaint
 */
export const getComplaintEmailHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const emailHistory = await complaintsService.getComplaintEmailHistory(id);
    sendSuccess(res, emailHistory);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/complaints/:id/assign-officer
 * Assign complaint to officer (intelligently creates new or uses existing)
 * Admin only
 *
 * Request body:
 * {
 *   "executive": {
 *     "name": "Shri Keshav Kumar",
 *     "designation": "Chief Development Officer (CDO)",
 *     "email": "cdo.budaun@up.gov.in",
 *     "phone": "05832-254231",
 *     "office_address": "Collectorate, Budaun",
 *     "district": "Budaun",
 *     "department": "Development",
 *     "departmentCategory": "development",
 *     ... (other executive fields from DistrictAdministrativeHead)
 *   }
 * }
 *
 * The service layer will automatically:
 * - Check if officer exists by email
 * - If exists and has User account → use existing officer
 * - If doesn't exist → create new User and Officer
 */
export const assignOfficer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { executive } = req.body;

    const result = await complaintsService.assignOfficer(id, executive);

    sendSuccess(res, result, result.isNewOfficer ? 201 : 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/complaints/:id/assign-and-send-email
 * Unified endpoint: Assign complaint to officer and send email with drafted letter
 * If new officer account is created, includes email and password in the email
 * Admin only
 *
 * Request body:
 * {
 *   "executive": {
 *     "name": "Shri Keshav Kumar",
 *     "designation": "Chief Development Officer (CDO)",
 *     "email": "cdo.budaun@up.gov.in",
 *     "phone": "05832-254231",
 *     "office_address": "Collectorate, Budaun",
 *     "district": "Budaun",
 *     ... (other executive fields)
 *   }
 * }
 */
export const assignOfficerAndSendEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { executive } = req.body;

    // Step 1: Assign officer to complaint
    const assignmentResult = await complaintsService.assignOfficer(
      id,
      executive
    );

    // Step 2: Fetch complaint with drafted letter
    const complaint = await Complaint.findOne({ id });
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

    // For testing: send all emails to test email
    // TODO: Remove this hardcoding after testing
    const testEmail = "himanshujainhj70662@gmail.com";

    // Determine recipient email
    // Priority: testEmail (for testing) > executive.email > primary_officer.email
    let emailTo: string | undefined = testEmail;
    if (!testEmail) {
      emailTo = executive.email || complaint.primary_officer?.email;
    }

    if (!emailTo) {
      throw new ValidationError(
        "Recipient email address is required. Please provide executive email or ensure primary_officer has an email."
      );
    }

    // Prepare email content
    const emailSubject =
      letter.subject || `Complaint Letter: ${complaint.title}`;

    // Base email body with letter content
    let emailBody = `
${letter.body || ""}

---
Complaint ID: ${complaint.id}
Complaint Title: ${complaint.title}
Category: ${complaint.category}
Status: ${complaint.status}
    `.trim();

    // If new officer was created, add credentials to email body
    if (assignmentResult.isNewOfficer && assignmentResult.user?.password) {
      const credentialsSection = `

═══════════════════════════════════════════════════════════
ACCOUNT CREDENTIALS
═══════════════════════════════════════════════════════════

A new account has been created for you to access the complaint management system.

Email: ${assignmentResult.user.email}
Password: ${assignmentResult.user.password}

Please use these credentials to log in to the system and access your assigned complaints.
You can change your password after logging in.

Important: Please save these credentials securely.
═══════════════════════════════════════════════════════════
      `;
      emailBody = emailBody + credentialsSection;
    }

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

      logger.info(
        `Unified: Email sent successfully for complaint ${id} after assignment`,
        {
          messageId: emailResult.messageId,
          to: emailTo,
          subject: emailSubject,
          isNewOfficer: assignmentResult.isNewOfficer,
        }
      );

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

      logger.info(`Email history saved for complaint ${id}`);

      // Return combined result
      sendSuccess(
        res,
        {
          assignment: assignmentResult,
          email: {
            success: true,
            messageId: emailResult.messageId,
            recipient: emailTo,
            subject: emailSubject,
            sentAt: emailHistoryEntry.sentAt,
          },
        },
        assignmentResult.isNewOfficer ? 201 : 200
      );
    } catch (error) {
      logger.error(
        `Failed to send email for complaint ${id} after assignment:`,
        error
      );

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

      logger.info(`Failed email history saved for complaint ${id}`);

      // Still return assignment result, but include email error
      sendSuccess(
        res,
        {
          assignment: assignmentResult,
          email: {
            success: false,
            error:
              error instanceof Error
                ? `Failed to send email: ${error.message}`
                : "Failed to send email",
          },
        },
        assignmentResult.isNewOfficer ? 201 : 200
      );
    }
  } catch (error) {
    next(error);
  }
};
