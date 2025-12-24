import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import Officer from '../models/Officer';
import { sendSuccess, sendPaginated } from '../utils/response';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/errors';
import bcrypt from 'bcryptjs';
import logger from '../config/logger';
import mongoose from 'mongoose';

export interface CreateUserDto {
  email: string;
  password: string;
  name?: string;
  role: 'admin' | 'officer' | 'user';
  officerId?: string; // Officer MongoDB _id
  isActive?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  name?: string;
  role?: 'admin' | 'officer' | 'user';
  officerId?: string;
  isActive?: boolean;
}

/**
 * GET /api/v1/users/officers/available
 * Get officers available for user account creation (not yet linked to users)
 */
export const getAvailableOfficers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, departmentCategory, subdistrictLgd } = req.query;

    // Build query for Badaun district
    const query: any = {
      districtLgd: 134, // Badaun district
    };

    if (departmentCategory) {
      query.departmentCategory = departmentCategory;
    }

    if (subdistrictLgd) {
      query.subdistrictLgd = parseInt(subdistrictLgd as string);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Get all officers
    const allOfficers = await Officer.find(query)
      .select('name designation department departmentCategory email phone officeAddress districtName subdistrictName')
      .sort({ designation: 1, name: 1 })
      .lean();

    // Get officers that already have user accounts
    const usersWithOfficers = await User.find({
      officerId: { $exists: true, $ne: null },
    })
      .select('officerId')
      .lean();

    const linkedOfficerIds = new Set(
      usersWithOfficers.map((u: any) => u.officerId?.toString())
    );

    // Filter out officers that already have accounts
    const availableOfficers = allOfficers.filter(
      (officer: any) => !linkedOfficerIds.has(officer._id.toString())
    );

    sendSuccess(res, {
      officers: availableOfficers,
      total: availableOfficers.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/officers/:officerId
 * Get officer details by ID (for auto-filling user form)
 */
export const getOfficerById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { officerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(officerId)) {
      throw new ValidationError('Invalid officer ID');
    }

    const officer = await Officer.findById(officerId).lean();

    if (!officer) {
      throw new NotFoundError('Officer not found');
    }

    // Check if officer already has a user account
    const existingUser = await User.findOne({ officerId: officer._id }).lean();

    sendSuccess(res, {
      officer,
      hasUserAccount: !!existingUser,
      existingUserId: existingUser?.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users
 * Get all users (admin only)
 */
export const getAllUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string;
    const search = req.query.search as string;
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined;

    const query: any = {};

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
      .populate('officerId', 'name designation department departmentCategory email phone officeAddress subdistrictName')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    sendPaginated(res, users, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/officers
 * Get all users who are officers (for complaint assignment)
 */
export const getOfficerUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search } = req.query;

    const query: any = { role: 'officer', isActive: true };

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password id email name role')
      .populate('officerId', 'name designation department departmentCategory subdistrictName')
      .sort({ name: 1 })
      .lean();

    sendSuccess(res, { officers: users });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/governance
 * Get all governance users (users with role='user') (admin only)
 */
export const getGovernanceUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined;

    const query: any = { role: 'user' };

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    sendPaginated(res, users, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/:id
 * Get single user by ID (admin only)
 */
export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ id })
      .select('-password')
      .populate('officerId')
      .lean();

    if (!user) {
      throw new NotFoundError('User not found');
    }

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/users
 * Create new user (admin only)
 * If officerId is provided, auto-fill name and email from Officer model
 */
export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let { email, password, name, role = 'user', officerId, isActive = true } = req.body as CreateUserDto;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    if (password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    // If creating officer user, validate officerId
    if (role === 'officer') {
      if (!officerId) {
        throw new ValidationError('Officer ID is required for officer role');
      }

      if (!mongoose.Types.ObjectId.isValid(officerId)) {
        throw new ValidationError('Invalid officer ID');
      }

      // Check if officer exists
      const officer = await Officer.findById(officerId);
      if (!officer) {
        throw new NotFoundError('Officer not found');
      }

      // Check if officer already has a user account
      const existingOfficerUser = await User.findOne({ officerId: officer._id });
      if (existingOfficerUser) {
        throw new ValidationError('This officer already has a user account');
      }

      // Auto-fill email and name from officer if not provided
      if (!email && officer.email) {
        email = officer.email;
      }
      if (!name && officer.name) {
        name = officer.name;
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ValidationError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name?.trim(),
      role,
      officerId: officerId ? new mongoose.Types.ObjectId(officerId) : undefined,
      isActive,
    });

    await user.save();

    // Populate officer details for response
    await user.populate('officerId');

    logger.info(`User created: ${user.email} (role: ${role}) by admin ${req.user?.email}`);

    const { password: _, ...userResponse } = user.toObject();

    sendSuccess(res, userResponse, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/users/:id
 * Update user (admin only)
 */
export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { email, password, name, role, officerId, isActive } = req.body as UpdateUserDto;

    const user = await User.findOne({ id }).select('+password');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prevent admin from modifying themselves
    if (req.user?.id === id && role === 'user') {
      throw new ValidationError('You cannot change your own role from admin');
    }

    // Update officerId if provided
    if (officerId !== undefined) {
      if (officerId && !mongoose.Types.ObjectId.isValid(officerId)) {
        throw new ValidationError('Invalid officer ID');
      }

      if (officerId) {
        const officer = await Officer.findById(officerId);
        if (!officer) {
          throw new NotFoundError('Officer not found');
        }

        // Check if another user already has this officer
        const existingOfficerUser = await User.findOne({
          officerId: officer._id,
          id: { $ne: id },
        });
        if (existingOfficerUser) {
          throw new ValidationError('This officer is already linked to another user');
        }
      }

      user.officerId = officerId ? new mongoose.Types.ObjectId(officerId) : undefined;
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser.id !== id) {
        throw new ValidationError('User with this email already exists');
      }
      user.email = email.toLowerCase();
    }

    if (password) {
      if (password.length < 6) {
        throw new ValidationError('Password must be at least 6 characters');
      }
      user.password = await bcrypt.hash(password, 10);
    }

    if (name !== undefined) user.name = name?.trim();
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    await user.populate('officerId');

    logger.info(`User updated: ${user.email} by admin ${req.user?.email}`);

    const { password: _, ...userResponse } = user.toObject();

    sendSuccess(res, userResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/users/:id
 * Delete user (admin only)
 */
export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      throw new ValidationError('You cannot delete your own account');
    }

    const user = await User.findOne({ id });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await User.deleteOne({ id });

    logger.info(`User deleted: ${user.email} by admin ${req.user?.email}`);

    sendSuccess(res, { message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/:id/activate
 * Activate user account (admin only)
 */
export const activateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ id });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.isActive = true;
    await user.save();
    await user.populate('officerId');

    logger.info(`User activated: ${user.email} by admin ${req.user?.email}`);

    const { password: _, ...userResponse } = user.toObject();

    sendSuccess(res, userResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/:id/deactivate
 * Deactivate user account (admin only)
 */
export const deactivateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent admin from deactivating themselves
    if (req.user?.id === id) {
      throw new ValidationError('You cannot deactivate your own account');
    }

    const user = await User.findOne({ id });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.isActive = false;
    await user.save();
    await user.populate('officerId');

    logger.info(`User deactivated: ${user.email} by admin ${req.user?.email}`);

    const { password: _, ...userResponse } = user.toObject();

    sendSuccess(res, userResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/statistics
 * Get user statistics (admin only)
 */
export const getUserStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalOfficers = await User.countDocuments({ role: 'officer' });
    const totalRegularUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    sendSuccess(res, {
      total: totalUsers,
      admins: totalAdmins,
      officers: totalOfficers,
      regularUsers: totalRegularUsers,
      active: activeUsers,
      inactive: inactiveUsers,
    });
  } catch (error) {
    next(error);
  }
};

