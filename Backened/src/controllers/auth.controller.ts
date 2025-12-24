import { Response, NextFunction } from 'express';
import { Request } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';
import logger from '../config/logger';

/**
 * Auth Controller
 * Handles authentication operations
 */

export interface LoginDto {
  email: string;
  password: string;
}

/**
 * Generate JWT token
 */
const generateToken = (userId: string, email: string, role: string): string => {
  const options: SignOptions = {
    expiresIn: (env.JWT_EXPIRES_IN || '7d') as any,
  };
  
  return jwt.sign(
    { userId, email, role },
    env.JWT_SECRET,
    options
  );
};

/**
 * POST /api/v1/auth/login
 * Admin login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as LoginDto;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user by email (with password field)
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .lean();

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role);

    // Update last login
    await User.updateOne(
      { id: user.id },
      { lastLogin: new Date() }
    );

    logger.info(`User logged in: ${user.email}`);

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 * Logout (client-side token removal)
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // JWT is stateless, so logout is handled client-side
    // You could implement token blacklisting here if needed
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 * Get current user (requires authentication)
 */
export const getMe = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await User.findOne({ id: userId }).lean();

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/refresh
 * Refresh JWT token
 */
export const refreshToken = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await User.findOne({ id: userId }).lean();

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Generate new token
    const token = generateToken(user.id, user.email, user.role);

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

