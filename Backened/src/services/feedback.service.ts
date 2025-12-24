/**
 * Feedback Service
 * Business logic for feedback operations
 */

import { Feedback } from '../models/Feedback';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../config/logger';

export interface CreateFeedbackDto {
  type: 'suggestion' | 'praise' | 'issue';
  content: string;
  is_anonymous: boolean;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  media_urls?: string[];
}

export interface UpdateFeedbackDto {
  status?: 'pending' | 'reviewed' | 'addressed';
  admin_response?: string;
  reviewed_by?: string;
}

export interface FeedbackFilters {
  type?: string;
  status?: string;
  is_anonymous?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Create new feedback
 */
export const createFeedback = async (data: CreateFeedbackDto) => {
  // Validate content length
  if (data.content.length < 10) {
    throw new ValidationError('Feedback content must be at least 10 characters');
  }

  if (data.content.length > 5000) {
    throw new ValidationError('Feedback content cannot exceed 5000 characters');
  }

  // If anonymous, don't store user info
  const feedbackData: any = {
    type: data.type,
    content: data.content,
    is_anonymous: data.is_anonymous,
    status: 'pending',
  };

  if (!data.is_anonymous) {
    if (data.user_name) feedbackData.user_name = data.user_name;
    if (data.user_email) feedbackData.user_email = data.user_email;
    if (data.user_phone) feedbackData.user_phone = data.user_phone;
  }

  if (data.media_urls && data.media_urls.length > 0) {
    feedbackData.media_urls = data.media_urls;
  }

  const feedback = new Feedback(feedbackData);
  await feedback.save();

  logger.info(`Feedback created: ${feedback.id}`);

  return feedback.toObject();
};

/**
 * Get all feedback with filters and pagination
 */
export const getAllFeedback = async (filters: FeedbackFilters = {}) => {
  const {
    type,
    status,
    is_anonymous,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

  // Build query
  const query: any = {};

  if (type && type !== 'all') {
    query.type = type;
  }

  if (status && status !== 'all') {
    query.status = status;
  }

  if (is_anonymous !== undefined) {
    query.is_anonymous = is_anonymous;
  }

  // Fetch feedback
  const [feedback, total] = await Promise.all([
    Feedback.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Feedback.countDocuments(query),
  ]);

  return {
    feedback,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single feedback by ID
 */
export const getFeedbackById = async (id: string) => {
  const feedback = await Feedback.findOne({ id }).lean();

  if (!feedback) {
    throw new NotFoundError('Feedback');
  }

  return feedback;
};

/**
 * Update feedback (admin only)
 */
export const updateFeedback = async (id: string, data: UpdateFeedbackDto) => {
  const feedback = await Feedback.findOne({ id });

  if (!feedback) {
    throw new NotFoundError('Feedback');
  }

  // Update fields
  if (data.status) {
    feedback.status = data.status;
    if (data.status === 'reviewed' || data.status === 'addressed') {
      feedback.reviewed_at = new Date();
    }
  }

  if (data.admin_response !== undefined) {
    feedback.admin_response = data.admin_response;
  }

  if (data.reviewed_by) {
    feedback.reviewed_by = data.reviewed_by;
  }

  await feedback.save();
  logger.info(`Feedback updated: ${id}`);

  return feedback.toObject();
};

/**
 * Delete feedback (admin only)
 */
export const deleteFeedback = async (id: string) => {
  const feedback = await Feedback.findOne({ id });

  if (!feedback) {
    throw new NotFoundError('Feedback');
  }

  await Feedback.deleteOne({ id });
  logger.info(`Feedback deleted: ${id}`);
};

/**
 * Get feedback statistics
 */
export const getFeedbackStatistics = async () => {
  const total = await Feedback.countDocuments();

  const [suggestions, praise, issues] = await Promise.all([
    Feedback.countDocuments({ type: 'suggestion' }),
    Feedback.countDocuments({ type: 'praise' }),
    Feedback.countDocuments({ type: 'issue' }),
  ]);

  const [pending, reviewed, addressed] = await Promise.all([
    Feedback.countDocuments({ status: 'pending' }),
    Feedback.countDocuments({ status: 'reviewed' }),
    Feedback.countDocuments({ status: 'addressed' }),
  ]);

  return {
    total,
    by_type: {
      suggestion: suggestions,
      praise,
      issue: issues,
    },
    by_status: {
      pending,
      reviewed,
      addressed,
    },
  };
};

