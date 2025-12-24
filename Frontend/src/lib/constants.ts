/**
 * Application Constants
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:8080';

// Complaint Categories (must match backend enum)
export const COMPLAINT_CATEGORIES = [
  { value: 'roads', label: 'Roads & Infrastructure' },
  { value: 'water', label: 'Water Supply' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'documents', label: 'Documents & Certificates' },
  { value: 'health', label: 'Health Services' },
  { value: 'education', label: 'Education' },
] as const;

// Complaint Status
export const COMPLAINT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
} as const;

// Complaint Priority
export const COMPLAINT_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  OFFICER: 'officer',
  USER: 'user',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
} as const;

