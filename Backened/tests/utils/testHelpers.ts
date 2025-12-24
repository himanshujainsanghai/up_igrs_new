/**
 * Test Helpers
 * Utility functions for testing
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../src/middleware/auth.middleware';

/**
 * Create a mock Express Request object
 */
export const createMockRequest = (overrides?: Partial<Request>): AuthRequest => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: undefined,
    ...overrides,
  } as AuthRequest;
};

/**
 * Create a mock Express Response object
 */
export const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create a mock NextFunction
 */
export const createMockNext = (): NextFunction => {
  return jest.fn();
};

/**
 * Create a mock user object
 */
export const createMockUser = (overrides?: any) => {
  return {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    ...overrides,
  } as any;
};

/**
 * Wait for a specified time (useful for async operations)
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Generate a random UUID-like string
 */
export const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Create a date in the past
 */
export const createPastDate = (daysAgo: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

/**
 * Create a date in the future
 */
export const createFutureDate = (daysAhead: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date;
};

