import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as meetingsService from '../services/meetings.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { ValidationError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Meetings Controller
 * Handles HTTP requests for meeting operations
 */

/**
 * GET /api/v1/meetings
 * Get all meetings with filters and pagination
 */
export const getAllMeetings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string,
      meeting_type: req.query.meeting_type as string,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await meetingsService.getAllMeetings(filters);

    sendPaginated(
      res,
      result.meetings,
      filters.page,
      filters.limit,
      result.pagination.total
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/meetings/:id
 * Get single meeting by ID
 */
export const getMeetingById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const meeting = await meetingsService.getMeetingById(id);
    sendSuccess(res, meeting);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/meetings
 * Create new meeting request (public endpoint)
 */
export const createMeeting = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const meetingData = req.body;
    
    // Validate required fields
    if (!meetingData.requester_name || !meetingData.requester_email || !meetingData.meeting_subject || !meetingData.purpose) {
      throw new ValidationError('Missing required fields: requester_name, requester_email, meeting_subject, purpose');
    }

    const meeting = await meetingsService.createMeeting(meetingData);
    sendSuccess(res, meeting, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/meetings/:id
 * Update meeting (admin only)
 */
export const updateMeeting = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const meeting = await meetingsService.updateMeeting(id, updateData);
    sendSuccess(res, meeting);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/meetings/:id
 * Delete meeting (admin only)
 */
export const deleteMeeting = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await meetingsService.deleteMeeting(id);
    sendSuccess(res, { message: 'Meeting deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/meetings/status/:status
 * Get meetings by status
 */
export const getMeetingsByStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.params;
    const meetings = await meetingsService.getMeetingsByStatus(status);
    sendSuccess(res, meetings);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/meetings/:id/attachments
 * Add attachment to meeting
 */
export const addMeetingAttachment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { file_url, file_name } = req.body;

    if (!file_url || !file_name) {
      throw new ValidationError('file_url and file_name are required');
    }

    const meeting = await meetingsService.addMeetingAttachment(
      id,
      file_url,
      file_name
    );

    sendSuccess(res, meeting);
  } catch (error) {
    next(error);
  }
};

