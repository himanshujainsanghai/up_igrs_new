import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as complaintsService from '../services/complaints.service';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';
import DistrictAdministrativeHead from '../models/DistrictAdministrativeHead';
import logger from '../config/logger';

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
    if (complaintData.latitude === undefined || complaintData.latitude === null) {
      throw new ValidationError('latitude is required');
    }
    if (complaintData.longitude === undefined || complaintData.longitude === null) {
      throw new ValidationError('longitude is required');
    }
    if (!complaintData.district_name || typeof complaintData.district_name !== 'string' || complaintData.district_name.trim().length === 0) {
      throw new ValidationError('district_name is required');
    }
    if (!complaintData.subdistrict_name || typeof complaintData.subdistrict_name !== 'string' || complaintData.subdistrict_name.trim().length === 0) {
      throw new ValidationError('subdistrict_name is required');
    }
    
    // Validate latitude and longitude ranges
    if (typeof complaintData.latitude !== 'number' || complaintData.latitude < -90 || complaintData.latitude > 90) {
      throw new ValidationError('latitude must be a number between -90 and 90');
    }
    if (typeof complaintData.longitude !== 'number' || complaintData.longitude < -180 || complaintData.longitude > 180) {
      throw new ValidationError('longitude must be a number between -180 and 180');
    }
    
    logger.info('Creating complaint with data:', {
      title: complaintData.title,
      category: complaintData.category,
      hasImages: Array.isArray(complaintData.images) && complaintData.images.length > 0,
      imageCount: Array.isArray(complaintData.images) ? complaintData.images.length : 0,
      latitude: complaintData.latitude,
      longitude: complaintData.longitude,
      district_name: complaintData.district_name,
      subdistrict_name: complaintData.subdistrict_name,
      village_name: complaintData.village_name || 'not provided',
    });
    
    const complaint = await complaintsService.createComplaint(complaintData);
    logger.info(`Complaint created successfully: ${complaint.id || complaint._id}`);
    sendSuccess(res, complaint, 201);
  } catch (error) {
    logger.error('Error creating complaint:', error);
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
    sendSuccess(res, { message: 'Complaint deleted successfully' });
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
      throw new ValidationError('research_data is required');
    }

    const complaint = await complaintsService.updateComplaintResearch(id, research_data);
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
      stage1Data.stage1_additional_docs !== undefined;

    if (!hasData) {
      throw new ValidationError('At least one stage1 field must be provided');
    }

    const complaint = await complaintsService.updateComplaintStage1Data(id, stage1Data);
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
      throw new ValidationError('Note must be at least 5 characters');
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
      throw new ValidationError('file_url, file_name, and file_type are required');
    }

    if (!['inward', 'outward'].includes(file_type)) {
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
      sendError(res, 'Phone number is required', 400, 'VALIDATION_ERROR');
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
      .select('district executive_authorities district_profile')
      .populate('district', 'districtName districtLgd stateName')
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
    logger.error('Error fetching executives:', error);
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
      throw new ValidationError('Officer user ID is required');
    }

    // Verify officer user exists
    const officerUser = await User.findOne({ id: assigned_to_user_id, role: 'officer' });
    if (!officerUser) {
      throw new NotFoundError('Officer user not found');
    }

    const complaint = await Complaint.findOne({ id });
    if (!complaint) {
      throw new NotFoundError('Complaint not found');
    }

    complaint.assigned_to_user_id = assigned_to_user_id;
    complaint.status = 'in_progress';
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
      throw new NotFoundError('Complaint not found');
    }

    complaint.assigned_to_user_id = undefined;
    if (complaint.status === 'in_progress') {
      complaint.status = 'pending';
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
      throw new UnauthorizedError('Authentication required');
    }

    // Verify user is an officer
    if (req.user?.role !== 'officer') {
      throw new UnauthorizedError('Only officers can access their assigned complaints');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const category = req.query.category as string;
    const priority = req.query.priority as string;

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

