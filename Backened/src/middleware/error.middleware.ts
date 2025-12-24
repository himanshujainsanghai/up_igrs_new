import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import logger from '../config/logger';

/**
 * Global Error Handling Middleware
 * Catches all errors and sends standardized error responses
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle known AppError
  if (err instanceof AppError) {
    sendError(
      res,
      err.message,
      err.statusCode,
      err.code
    );
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    sendError(
      res,
      'Validation error',
      400,
      'VALIDATION_ERROR',
      err.message
    );
    return;
  }

  // Handle MongoDB duplicate key error
  if ((err as any).code === 11000) {
    sendError(
      res,
      'Duplicate entry',
      409,
      'DUPLICATE_ENTRY',
      'A record with this value already exists'
    );
    return;
  }

  // Handle MongoDB cast error (invalid ID format)
  if (err.name === 'CastError') {
    sendError(
      res,
      'Invalid ID format',
      400,
      'INVALID_ID'
    );
    return;
  }

  // Default error response
  sendError(
    res,
    process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    500,
    'INTERNAL_ERROR'
  ).end();
};

/**
 * 404 Not Found Middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  sendError(
    res,
    `Route ${req.originalUrl} not found`,
    404,
    'NOT_FOUND'
  ).end();
};

