/**
 * TypeScript Types for Frontend
 * Aligned with backend models
 */

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User Types
export interface User {
  _id?: string;
  id?: string;
  email: string;
  name?: string;
  role: "admin" | "officer" | "user";
  officerId?: {
    _id: string;
    name: string;
    designation: string;
    department: string;
    departmentCategory: string;
    email: string;
    phone: string;
    officeAddress: string;
    subdistrictName?: string;
  };
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Officer {
  _id: string;
  name: string;
  designation: string;
  department: string;
  departmentCategory:
    | "revenue"
    | "development"
    | "police"
    | "health"
    | "education"
    | "engineering"
    | "other";
  email: string;
  phone: string;
  cug?: string;
  officeAddress: string;
  residenceAddress?: string;
  districtName: string;
  districtLgd: number;
  subdistrictName?: string;
  subdistrictLgd?: number;
  isDistrictLevel: boolean;
  isSubDistrictLevel: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
  role: "admin" | "officer" | "user";
  officerId?: string;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  name?: string;
  role?: "admin" | "officer" | "user";
  officerId?: string;
  isActive?: boolean;
}

export interface UserStatistics {
  total: number;
  admins: number;
  officers: number;
  regularUsers: number;
  active: number;
  inactive: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Complaint Types
export type ComplaintCategory =
  | "roads"
  | "water"
  | "electricity"
  | "documents"
  | "health"
  | "education"
  | "other";
export type ComplaintStatus =
  | "pending"
  | "in_progress"
  | "resolved"
  | "rejected";
export type ComplaintPriority = "low" | "medium" | "high" | "urgent";

export interface Complaint {
  _id?: string; // MongoDB ObjectId (optional, may not be present)
  id?: string; // UUID identifier (used by backend)
  complaint_id?: string; // Human-readable complaint ID (DDMMYYYYMLA###)
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  subCategory?: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  location?:
    | string
    | {
        latitude: number;
        longitude: number;
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
      }; // Can be string or object for backward compatibility
  // Geographic fields (required for backend)
  latitude: number; // Latitude coordinate (required)
  longitude: number; // Longitude coordinate (required)
  districtName: string; // District name (required)
  subdistrictName: string; // Sub-district name (required)
  villageName?: string; // Village name (optional)
  voterId?: string;
  documents?: ComplaintDocument[];
  notes?: ComplaintNote[];
  aiResolution?: AIResolution;
  assignedTo?: string;
  assigned_to_user_id?: string; // User ID of assigned officer (UUID)
  assignedOfficer?:
    | string
    | {
        _id: string;
        name: string;
        email: string;
        designation?: string;
        department?: string;
      }; // Officer ObjectId or populated object
  isOfficerAssigned?: boolean; // Whether complaint is assigned to an officer
  arrivalTime?: string; // When complaint arrived to officer (ISO date string)
  assignedTime?: string; // When complaint was assigned to officer (ISO date string)
  timeBoundary?: number; // Time boundary in days (default: 7 days = 1 week)
  isComplaintClosed?: boolean; // Whether complaint is closed by officer
  closingDetails?: {
    closedAt?: string; // When complaint was closed (ISO date string)
    remarks?: string; // Closing remarks/notes
    attachments?: ClosingAttachment[]; // Attachments with metadata
    closedByOfficer?: {
      id?: string;
      name?: string;
      email?: string;
    };
    closingProof?: string; // URL to closing proof document
  };
  isExtended?: boolean; // Whether time boundary was extended
  officerFeedback?: string; // Officer's feedback
  drafted_letter?: {
    // Drafted letter data
    from?: string;
    to?: string;
    date?: string;
    subject?: string;
    body?: string;
    attachments?: string[];
  };
  selected_officer?: {
    // Selected officer for whom the letter is drafted
    name?: string;
    designation: string;
    office_address: string;
    phone: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ClosingAttachment {
  url: string;
  fileName?: string;
  fileType?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

export interface ComplaintDocument {
  _id: string;
  complaintId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

export interface ComplaintNote {
  _id: string;
  complaintId: string;
  content: string;
  createdBy: string;
  createdByUser?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface OfficerNote {
  _id: string;
  complaintId: string;
  content: string;
  type: "inward" | "outward";
  attachments?: string[];
  officerId?: string;
  createdAt: string;
}

export interface OfficerAttachment {
  _id: string;
  complaintId: string;
  noteId?: string;
  attachmentType: "inward" | "outward";
  fileUrl: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: string;
  createdAt: string;
}

export interface ComplaintExtensionRequest {
  _id: string;
  id?: string; // UUID identifier (optional, may come from backend)
  complaintId: string;
  requestedBy: string;
  requestedByRole: "officer" | "admin";
  daysRequested: number;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  decidedBy?: string;
  decidedByRole?: "admin";
  decidedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIResolution {
  _id: string;
  complaintId: string;
  summary: string;
  steps: AIResolutionStep[];
  createdAt: string;
}

export interface AIResolutionStep {
  _id: string;
  resolutionId: string;
  stepNumber: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  completedAt?: string;
}

export interface ComplaintFilters {
  page?: number;
  limit?: number;
  status?: ComplaintStatus | "all";
  category?: ComplaintCategory | "all";
  priority?: ComplaintPriority | "all";
  search?: string;
}

// Meeting Types
export interface Meeting {
  _id: string;
  complaintId: string;
  requestedBy: string;
  requestedByUser?: {
    _id: string;
    name: string;
    email: string;
  };
  requestedDate: string;
  requestedTime: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "completed";
  scheduledDate?: string;
  scheduledTime?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingRequest {
  complaintId?: string;
  requestedDate: string;
  requestedTime: string;
  reason: string;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  location?: string;
}

// Inventory Types
export interface Inventory {
  _id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  status: "available" | "in_use" | "maintenance" | "disposed";
  notes?: InventoryNote[];
  documents?: InventoryDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryNote {
  _id: string;
  inventoryId: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface InventoryDocument {
  _id: string;
  inventoryId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

// AI Types
export interface AIAnalysisRequest {
  complaintId: string;
  documents?: string[]; // Document URLs
}

export interface AIAnalysisResponse {
  summary: string;
  steps: Omit<AIResolutionStep, "_id" | "resolutionId">[];
}

// Upload Types
export interface UploadResponse {
  url: string;
  key: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface PresignedUrlResponse {
  url: string;
  key: string;
}

// Feedback Types
export interface Feedback {
  _id: string;
  userId?: string;
  complaintId?: string;
  rating: number;
  comment: string;
  category: "complaint" | "service" | "general";
  createdAt: string;
}

export interface FeedbackRequest {
  complaintId?: string;
  rating?: number; // Optional for frontend UI
  comment: string;
  category?:
    | "complaint"
    | "service"
    | "general"
    | "suggestion"
    | "praise"
    | "issue";
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

// OTP Types
export interface OTPRequest {
  phone: string;
  purpose: "verification" | "login" | "complaint";
}

export interface OTPVerifyRequest {
  phone: string;
  otp: string;
  purpose: "verification" | "login" | "complaint";
}

export interface OTPResponse {
  success: boolean;
  message: string;
  expiresAt?: string;
}

// Reports Types
export interface ComplaintStatistics {
  total: number;
  byStatus: Record<ComplaintStatus, number>;
  byCategory: Record<ComplaintCategory, number>;
  byPriority: Record<ComplaintPriority, number>;
  resolvedCount: number;
  pendingCount: number;
  resolutionRate: number;
  averageResolutionTime?: number;
  recentComplaints: Complaint[];
}

// Location Types
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResponse {
  address: {
    formatted_address: string;
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  coordinates: {
    lat: number;
    lon: number;
  };
}

export interface ReverseGeocodeRequest extends LocationCoordinates {}
