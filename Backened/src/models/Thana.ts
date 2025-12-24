import mongoose, { Schema, Document } from "mongoose";

/**
 * THANA (POLICE STATION) MODEL
 * Stores police station information for districts
 */

export interface IThana extends Document {
  thanaName: string;                    // Police station name (e.g., "Gunnaur")
  thanaCode?: string;                   // Optional police station code
  tehsilName: string;                   // Tehsil/Subdistrict name (e.g., "Gunnaur")
  tehsilLgd: number;                    // Tehsil LGD code
  districtName: string;                 // District name (e.g., "Budaun")
  districtLgd: number;                   // District LGD code
  stateName: string;                    // State name (e.g., "Uttar Pradesh")
  stateLgd: number;                     // State LGD code
  
  // Geographic coordinates
  latitude?: number;                     // Latitude
  longitude?: number;                    // Longitude
  isGeocoded?: boolean;                 // Whether coordinates are available
  
  // Additional information
  address?: string;                      // Police station address
  phone?: string;                       // Contact phone number
  inCharge?: string;                    // Station in-charge name
  
  createdAt: Date;
  updatedAt: Date;
}

const ThanaSchema: Schema = new Schema(
  {
    thanaName: {
      type: String,
      required: true,
      maxlength: 200,
      index: true,
    },
    thanaCode: {
      type: String,
      required: false,
      maxlength: 50,
      index: true,
    },
    tehsilName: {
      type: String,
      required: true,
      maxlength: 100,
      index: true,
    },
    tehsilLgd: {
      type: Number,
      required: true,
    },
    districtName: {
      type: String,
      required: true,
      maxlength: 100,
    },
    districtLgd: {
      type: Number,
      required: true,
    },
    stateName: {
      type: String,
      required: true,
      maxlength: 100,
      default: "Uttar Pradesh",
    },
    stateLgd: {
      type: Number,
      required: true,
      default: 9, // Uttar Pradesh LGD code
    },
    latitude: {
      type: Number,
      required: false,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: false,
      min: -180,
      max: 180,
    },
    isGeocoded: {
      type: Boolean,
      required: true,
      default: false,
    },
    address: {
      type: String,
      required: false,
      maxlength: 500,
    },
    phone: {
      type: String,
      required: false,
      maxlength: 20,
    },
    inCharge: {
      type: String,
      required: false,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
ThanaSchema.index({ thanaName: 1, districtLgd: 1 });
ThanaSchema.index({ tehsilLgd: 1 });
ThanaSchema.index({ districtLgd: 1 });
ThanaSchema.index({ thanaName: 1, tehsilName: 1, districtLgd: 1 }, { unique: true }); // Unique thana per tehsil

export default mongoose.model<IThana>("Thana", ThanaSchema);

