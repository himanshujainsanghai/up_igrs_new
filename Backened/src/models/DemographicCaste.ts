import mongoose, { Schema, Document } from "mongoose";

/**
 * DEMOGRAPHIC CASTE MODEL
 * Stores caste-wise demographic data at district level
 * Includes Scheduled Tribes, Scheduled Castes, OBCs, General, and Minority categories
 * Based on Census data
 */

// Population breakdown interface
interface IPopulation {
  total: number;
  male: number;
  female: number;
}

// Caste entry interface
interface ICasteEntry {
  caste_name: string;
  population: IPopulation;
}

// Main interface
export interface IDemographicCaste extends Document {
  district: mongoose.Types.ObjectId; // Reference to District model
  district_info: {
    name: string;
    state_code: string;
    district_code: string;
    census_year: string;
  };
  demographics: {
    scheduled_tribes: ICasteEntry[];
    scheduled_castes: ICasteEntry[];
    obcs?: ICasteEntry[]; // Other Backward Classes
    general?: ICasteEntry[]; // General category
    minority?: ICasteEntry[]; // Minority communities
  };
  createdAt: Date;
  updatedAt: Date;
}

// Population sub-schema
const PopulationSchema = new Schema<IPopulation>(
  {
    total: { type: Number, required: true, min: 0 },
    male: { type: Number, required: true, min: 0 },
    female: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Caste entry sub-schema
const CasteEntrySchema = new Schema<ICasteEntry>(
  {
    caste_name: { type: String, required: true },
    population: { type: PopulationSchema, required: true },
  },
  { _id: false }
);

// Main schema
const DemographicCasteSchema = new Schema<IDemographicCaste>(
  {
    district: {
      type: Schema.Types.ObjectId,
      ref: "District",
      required: true,
      index: true,
    },
    district_info: {
      name: { type: String, required: true },
      state_code: { type: String, required: true },
      district_code: { type: String, required: true },
      census_year: { type: String, required: true },
    },
    demographics: {
      scheduled_tribes: {
        type: [CasteEntrySchema],
        default: [],
        required: true,
      },
      scheduled_castes: {
        type: [CasteEntrySchema],
        default: [],
        required: true,
      },
      obcs: {
        type: [CasteEntrySchema],
        default: [],
      },
      general: {
        type: [CasteEntrySchema],
        default: [],
      },
      minority: {
        type: [CasteEntrySchema],
        default: [],
      },
    },
  },
  {
    timestamps: true,
    collection: "demographic_castes",
  }
);

// Indexes
DemographicCasteSchema.index({ district: 1 }, { unique: true }); // One record per district
DemographicCasteSchema.index({ "district_info.district_code": 1 });
DemographicCasteSchema.index({ "district_info.state_code": 1 });
DemographicCasteSchema.index({ "district_info.name": 1 });
DemographicCasteSchema.index({ "district_info.census_year": 1 });

// Compound index for efficient queries by district and census year
DemographicCasteSchema.index({ district: 1, "district_info.census_year": 1 });

export default mongoose.model<IDemographicCaste>(
  "DemographicCaste",
  DemographicCasteSchema
);

