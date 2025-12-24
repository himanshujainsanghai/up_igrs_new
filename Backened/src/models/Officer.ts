import mongoose, { Schema, Document } from "mongoose";

export interface IOfficer extends Document {
  name: string;
  designation: string;
  department: string;
  departmentCategory: "revenue" | "development" | "police" | "health" | "education" | "engineering" | "other";
  email: string;
  phone: string;
  cug?: string;
  officeAddress: string;
  residenceAddress?: string;
  
  // Geographic assignment
  districtName: string;
  districtLgd: number;
  subdistrictName?: string; // For tehsil-level officers
  subdistrictLgd?: number;
  
  // Hierarchy
  isDistrictLevel: boolean;
  isSubDistrictLevel: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const OfficerSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    designation: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    departmentCategory: {
      type: String,
      required: true,
      enum: ["revenue", "development", "police", "health", "education", "engineering", "other"],
    },
    email: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
    cug: {
      type: String,
      required: false,
    },
    officeAddress: {
      type: String,
      required: true,
    },
    residenceAddress: {
      type: String,
      required: false,
    },
    districtName: {
      type: String,
      required: true,
    },
    districtLgd: {
      type: Number,
      required: true,
    },
    subdistrictName: {
      type: String,
      required: false,
    },
    subdistrictLgd: {
      type: Number,
      required: false,
    },
    isDistrictLevel: {
      type: Boolean,
      required: true,
      default: true,
    },
    isSubDistrictLevel: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
OfficerSchema.index({ districtLgd: 1 });
OfficerSchema.index({ subdistrictLgd: 1 });
OfficerSchema.index({ departmentCategory: 1 });
OfficerSchema.index({ isDistrictLevel: 1 });

export default mongoose.model<IOfficer>("Officer", OfficerSchema);

