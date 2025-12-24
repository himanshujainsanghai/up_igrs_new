import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

/**
 * COMPLAINT MODEL
 * Complete field documentation for citizen complaints/grievances
 */

export interface IComplaint extends Document {
  // IDENTIFICATION
  id: string; // UUID unique identifier
  complaint_id?: string; // Human-readable ID (DDMMYYYYMLA###)

  // BASIC INFO
  title: string; // Complaint title (5-255 chars)
  description: string; // Detailed description (20-5000 chars)
  category:
    | "roads"
    | "water"
    | "electricity"
    | "documents"
    | "health"
    | "education";
  sub_category?: string; // Optional sub-category (max 100 chars)
  location?: string; // Physical location (max 500 chars)
  images?: string[]; // Array of S3 image URLs

  // GEOGRAPHIC DATA
  village_name?: string; // Village name (optional)
  village_lgd?: string; // Village LGD code
  subdistrict_name: string; // Sub-district name (required)
  district_name: string; // District name (required)
  latitude: number; // Latitude coordinate (required)
  longitude: number; // Longitude coordinate (required)

  // STATUS & PRIORITY
  status: "pending" | "in_progress" | "resolved" | "rejected";
  priority: "low" | "medium" | "high" | "urgent";

  // CONTACT INFO
  contact_name: string; // Complainant name (2-100 chars)
  contact_email: string; // Email address
  contact_phone?: string; // Phone number (10-15 digits)

  // ASSIGNMENT & RESOLUTION
  assigned_department?: string; // Assigned department
  assigned_to_user_id?: string; // User ID of assigned officer (UUID)
  estimated_resolution_date?: Date; // Expected completion date
  actual_resolution_date?: Date; // Actual completion date
  resolution_notes?: string; // Resolution details (max 2000 chars)

  // ADMIN & METADATA
  created_by_admin?: boolean; // Created by admin flag
  voter_id?: string; // Voter ID (alphanumeric, max 20)

  // AI ANALYSIS FIELDS
  ai_analysis_completed: boolean; // AI analysis done flag
  ai_severity_score?: number; // Severity score (1-10)
  ai_estimated_cost?: number; // Estimated cost in INR
  ai_estimated_timeline_days?: number; // Estimated days
  ai_risks?: string[]; // Identified risks
  ai_alternatives?: string[]; // Alternative solutions
  ai_success_metrics?: string[]; // Success criteria
  ai_resource_requirements?: string[]; // Required resources
  ai_analysis?: string; // Full AI analysis text (max 10000 chars)

  // WORKFLOW FIELDS
  research_data?: any; // Research findings (JSON object)
  primary_officer?: {
    // Primary officer info
    name?: string;
    designation: string;
    office_address: string;
    phone: string;
    email: string;
  };
  secondary_officer?: {
    // Secondary officer info
    name?: string;
    designation: string;
    office_address: string;
    phone: string;
    email: string;
  };
  drafted_letter?: {
    // Drafted letter
    from: string;
    to: string;
    date: string;
    subject: string;
    body: string;
    attachments?: string[];
  };
  stage1_additional_docs?: string[]; // Additional documents URLs

  // TIMESTAMPS
  created_at: Date; // Creation timestamp
  updated_at: Date; // Last update timestamp
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
      index: true,
    },
    complaint_id: {
      type: String,
      unique: true,
      sparse: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [255, "Title cannot exceed 255 characters"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "roads",
          "water",
          "electricity",
          "documents",
          "health",
          "education",
        ],
        message: "{VALUE} is not a valid category",
      },
      index: true,
    },
    sub_category: {
      type: String,
      maxlength: [100, "Sub-category cannot exceed 100 characters"],
      trim: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "in_progress", "resolved", "rejected"],
      default: "pending",
    },
    priority: {
      type: String,
      required: true,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    location: {
      type: String,
      maxlength: [500, "Location cannot exceed 500 characters"],
      trim: true,
    },
    images: [
      {
        type: String,
        validate: {
          validator: (v: string) => {
            try {
              new URL(v);
              return true;
            } catch {
              return false;
            }
          },
          message: "Invalid image URL",
        },
      },
    ],
    village_name: {
      type: String,
      maxlength: [200, "Village name cannot exceed 200 characters"],
      trim: true,
    },
    village_lgd: {
      type: String,
      maxlength: [50, "Village LGD code cannot exceed 50 characters"],
      trim: true,
    },
    subdistrict_name: {
      type: String,
      required: [true, "Sub-district name is required"],
      maxlength: [100, "Sub-district name cannot exceed 100 characters"],
      trim: true,
    },
    district_name: {
      type: String,
      required: [true, "District name is required"],
      maxlength: [100, "District name cannot exceed 100 characters"],
      trim: true,
    },
    latitude: {
      type: Number,
      required: [true, "Latitude is required"],
      min: [-90, "Latitude must be between -90 and 90"],
      max: [90, "Latitude must be between -90 and 90"],
    },
    longitude: {
      type: Number,
      required: [true, "Longitude is required"],
      min: [-180, "Longitude must be between -180 and 180"],
      max: [180, "Longitude must be between -180 and 180"],
    },
    contact_name: {
      type: String,
      required: [true, "Contact name is required"],
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
      trim: true,
    },
    contact_email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    contact_phone: {
      type: String,
      match: [/^\+?[\d\s-]{10,15}$/, "Please provide a valid phone number"],
      trim: true,
    },
    assigned_department: {
      type: String,
      maxlength: [100, "Department name cannot exceed 100 characters"],
      trim: true,
    },
    assigned_to_user_id: {
      type: String,
      required: false,
      index: true,
    },
    estimated_resolution_date: Date,
    actual_resolution_date: Date,
    resolution_notes: {
      type: String,
      maxlength: [2000, "Resolution notes cannot exceed 2000 characters"],
    },
    created_by_admin: {
      type: Boolean,
      default: false,
    },
    voter_id: {
      type: String,
      maxlength: [20, "Voter ID cannot exceed 20 characters"],
      match: [/^[A-Z0-9]+$/, "Voter ID must be alphanumeric"],
      uppercase: true,
    },
    ai_analysis_completed: {
      type: Boolean,
      required: true,
      default: false,
    },
    ai_severity_score: {
      type: Number,
      min: [1, "Severity score must be at least 1"],
      max: [10, "Severity score cannot exceed 10"],
    },
    ai_estimated_cost: {
      type: Number,
      min: [0, "Cost cannot be negative"],
    },
    ai_estimated_timeline_days: {
      type: Number,
      min: [1, "Timeline must be at least 1 day"],
    },
    ai_risks: [String],
    ai_alternatives: [String],
    ai_success_metrics: [String],
    ai_resource_requirements: [String],
    ai_analysis: {
      type: String,
      maxlength: [10000, "AI analysis cannot exceed 10000 characters"],
    },
    research_data: {
      type: Schema.Types.Mixed,
    },
    primary_officer: {
      type: Schema.Types.Mixed,
    },
    secondary_officer: {
      type: Schema.Types.Mixed,
    },
    drafted_letter: {
      type: Schema.Types.Mixed,
    },
    stage1_additional_docs: [String],
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: "complaints",
  }
);

// Performance indexes
ComplaintSchema.index({ status: 1, priority: -1 });
ComplaintSchema.index({ category: 1, status: 1 });
ComplaintSchema.index({ category: 1, sub_category: 1 }); // For filtering by category and sub-category
ComplaintSchema.index({ contact_email: 1 });
ComplaintSchema.index({ created_at: -1 });
ComplaintSchema.index({ assigned_to_user_id: 1, status: 1 }); // For officer complaint queries

// Text search index (for MongoDB Atlas or with text search enabled)
ComplaintSchema.index({ title: "text", description: "text", location: "text" });

// Auto-update updated_at before save
ComplaintSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Auto-generate complaint_id on creation
ComplaintSchema.pre("save", async function (next) {
  if (this.isNew && !this.complaint_id) {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const prefix = `${day}${month}${year}MLA`;

    try {
      const Complaint = mongoose.model("Complaint");
      const todayStart = new Date(date.setHours(0, 0, 0, 0));
      const todayEnd = new Date(date.setHours(23, 59, 59, 999));
      const count = await Complaint.countDocuments({
        created_at: { $gte: todayStart, $lte: todayEnd },
      });

      this.complaint_id = `${prefix}${String(count + 1).padStart(3, "0")}`;
    } catch (error) {
      // If model not found, generate simple ID
      this.complaint_id = `${prefix}001`;
    }
  }
  next();
});

export const Complaint: Model<IComplaint> = mongoose.model<IComplaint>(
  "Complaint",
  ComplaintSchema
);
