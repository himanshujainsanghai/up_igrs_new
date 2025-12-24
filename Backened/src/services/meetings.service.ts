import { Meeting } from '../models/Meeting';
import { NotFoundError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Meetings Service
 * Business logic for meeting operations
 */

export interface CreateMeetingDto {
  requester_name: string;
  requester_email: string;
  requester_phone?: string;
  requester_area?: string;
  meeting_subject: string;
  purpose: string;
  meeting_type: 'general_inquiry' | 'complaint_followup' | 'suggestion' | 'other';
  preferred_date?: Date;
  preferred_time?: string;
  attachments?: { url: string; name: string }[];
}

export interface UpdateMeetingDto {
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  assigned_staff?: string;
  meeting_location?: string;
  meeting_notes?: string;
  admin_notes?: string;
  preferred_date?: Date;
  preferred_time?: string;
  actual_meeting_date?: Date;
  attachment_urls?: string[];
  attachment_names?: string[];
}

export interface MeetingFilters {
  status?: string;
  meeting_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all meetings with filters and pagination
 */
export const getAllMeetings = async (filters: MeetingFilters = {}) => {
  const {
    status,
    meeting_type,
    search,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

  // Build query
  const query: any = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  if (meeting_type && meeting_type !== 'all') {
    query.meeting_type = meeting_type;
  }

  // Text search
  if (search) {
    query.$or = [
      { requester_name: { $regex: search, $options: 'i' } },
      { requester_email: { $regex: search, $options: 'i' } },
      { meeting_subject: { $regex: search, $options: 'i' } },
      { purpose: { $regex: search, $options: 'i' } },
    ];
  }

  // Fetch meetings
  const [meetings, total] = await Promise.all([
    Meeting.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Meeting.countDocuments(query),
  ]);

  return {
    meetings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single meeting by ID
 */
export const getMeetingById = async (id: string) => {
  const meeting = await Meeting.findOne({ id }).lean();

  if (!meeting) {
    throw new NotFoundError('Meeting');
  }

  return meeting;
};

/**
 * Create new meeting request
 */
export const createMeeting = async (data: CreateMeetingDto) => {
  const { attachments, ...meetingData } = data;

  const meeting = new Meeting({
    ...meetingData,
    status: 'pending',
    attachment_urls: attachments?.map((a) => a.url) || [],
    attachment_names: attachments?.map((a) => a.name) || [],
  });

  await meeting.save();
  logger.info(`Meeting created: ${meeting.id}`);

  return meeting.toObject();
};

/**
 * Update meeting
 */
export const updateMeeting = async (id: string, data: UpdateMeetingDto) => {
  const meeting = await Meeting.findOne({ id });

  if (!meeting) {
    throw new NotFoundError('Meeting');
  }

  // Update fields
  Object.assign(meeting, data);
  
  // Auto-set actual meeting date if status changes to completed
  if (data.status === 'completed' && !meeting.actual_meeting_date) {
    meeting.actual_meeting_date = new Date();
  }

  await meeting.save();
  logger.info(`Meeting updated: ${id}`);

  return meeting.toObject();
};

/**
 * Delete meeting
 */
export const deleteMeeting = async (id: string) => {
  const meeting = await Meeting.findOne({ id });

  if (!meeting) {
    throw new NotFoundError('Meeting');
  }

  await Meeting.deleteOne({ id });
  logger.info(`Meeting deleted: ${id}`);
};

/**
 * Add attachment to meeting
 */
export const addMeetingAttachment = async (
  meetingId: string,
  fileUrl: string,
  fileName: string
) => {
  const meeting = await Meeting.findOne({ id: meetingId });

  if (!meeting) {
    throw new NotFoundError('Meeting');
  }

  const currentUrls = meeting.attachment_urls || [];
  const currentNames = meeting.attachment_names || [];

  meeting.attachment_urls = [...currentUrls, fileUrl];
  meeting.attachment_names = [...currentNames, fileName];

  await meeting.save();
  logger.info(`Attachment added to meeting: ${meetingId}`);

  return meeting.toObject();
};

/**
 * Get meetings by status
 */
export const getMeetingsByStatus = async (status: string) => {
  const meetings = await Meeting.find({ status })
    .sort({ created_at: -1 })
    .lean();

  return meetings;
};

