import mongoose, { Schema, Document } from "mongoose";

/**
 * DEMOGRAPHICS MODEL
 * Stores census/demographic data at different geographic levels
 * Based on Census 2011 Primary Census Abstract (PCA) data
 */

export interface IDemographics extends Document {
  // GEOGRAPHIC HIERARCHY
  state: string;                    // State name (e.g., "Uttar Pradesh")
  stateLgd: number;                 // State LGD code
  district: string;                 // District name (e.g., "Budaun")
  districtLgd: number;              // District LGD code
  subdistrict?: string;             // Subdistrict/Tehsil name (e.g., "Bilsi")
  subdistrictLgd?: number;          // Subdistrict LGD code
  townVillageWard?: string;         // Town/Village/Ward name
  townVillageCode?: string;         // Town/Village code
  
  // GEOGRAPHIC COORDINATES
  latitude?: number;                // Latitude (from geocoding)
  longitude?: number;               // Longitude (from geocoding)
  isGeocoded?: boolean;             // Whether coordinates are available
  
  // LEVEL INDICATOR
  level: "state" | "district" | "subdistrict" | "town" | "village" | "ward";
  
  // AREA CLASSIFICATION
  residence: "total" | "urban" | "rural"; // TRU indicator
  areaName: string;                 // Full area name
  
  // CENSUS METADATA
  censusYear: number;               // Census year (e.g., 2011)
  ebCode?: string;                  // Electoral Block code
  
  // HOUSEHOLD DATA
  totalHouseholds: number;          // Number of households
  
  // TOTAL POPULATION
  totalPopulation: number;          // Total population
  malePopulation: number;           // Male population
  femalePopulation: number;         // Female population
  
  // CHILD POPULATION (0-6 years)
  childPopulation: number;          // Total 0-6 years
  childMale: number;                // Male 0-6 years
  childFemale: number;              // Female 0-6 years
  
  // SCHEDULED CASTE POPULATION
  scPopulation: number;             // Total SC population
  scMale: number;                   // Male SC
  scFemale: number;                 // Female SC
  
  // SCHEDULED TRIBE POPULATION
  stPopulation: number;             // Total ST population
  stMale: number;                   // Male ST
  stFemale: number;                 // Female ST
  
  // LITERACY (if available)
  literates?: number;               // Total literates
  literatesMale?: number;           // Male literates
  literatesFemale?: number;         // Female literates
  
  // WORKERS (if available)
  totalWorkers?: number;            // Total workers
  maleWorkers?: number;             // Male workers
  femaleWorkers?: number;           // Female workers
  
  // METADATA
  dataSource: string;               // Data source (e.g., "Census 2011 PCA")
  lastUpdated: Date;                // Last update timestamp
  
  createdAt: Date;
  updatedAt: Date;
}

const DemographicsSchema: Schema = new Schema(
  {
    // Geographic Hierarchy
    state: {
      type: String,
      required: true,
      index: true,
    },
    stateLgd: {
      type: Number,
      required: true,
      index: true,
    },
    district: {
      type: String,
      required: true,
      index: true,
    },
    districtLgd: {
      type: Number,
      required: true,
      index: true,
    },
    subdistrict: {
      type: String,
      index: true,
    },
    subdistrictLgd: {
      type: Number,
      index: true,
    },
    townVillageWard: {
      type: String,
      index: true,
    },
    townVillageCode: {
      type: String,
      index: true,
    },
    
    // Geographic Coordinates
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
    isGeocoded: {
      type: Boolean,
      default: false,
    },
    
    // Level Indicator
    level: {
      type: String,
      required: true,
      enum: ["state", "district", "subdistrict", "town", "village", "ward"],
      index: true,
    },
    
    // Area Classification
    residence: {
      type: String,
      required: true,
      enum: ["total", "urban", "rural"],
      index: true,
    },
    areaName: {
      type: String,
      required: true,
    },
    
    // Census Metadata
    censusYear: {
      type: Number,
      required: true,
      default: 2011,
      index: true,
    },
    ebCode: {
      type: String,
    },
    
    // Household Data
    totalHouseholds: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Total Population
    totalPopulation: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    malePopulation: {
      type: Number,
      required: true,
      min: 0,
    },
    femalePopulation: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Child Population
    childPopulation: {
      type: Number,
      required: true,
      min: 0,
    },
    childMale: {
      type: Number,
      required: true,
      min: 0,
    },
    childFemale: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Scheduled Caste
    scPopulation: {
      type: Number,
      required: true,
      min: 0,
    },
    scMale: {
      type: Number,
      required: true,
      min: 0,
    },
    scFemale: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Scheduled Tribe
    stPopulation: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    stMale: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    stFemale: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    
    // Optional Literacy Data
    literates: {
      type: Number,
      min: 0,
    },
    literatesMale: {
      type: Number,
      min: 0,
    },
    literatesFemale: {
      type: Number,
      min: 0,
    },
    
    // Optional Worker Data
    totalWorkers: {
      type: Number,
      min: 0,
    },
    maleWorkers: {
      type: Number,
      min: 0,
    },
    femaleWorkers: {
      type: Number,
      min: 0,
    },
    
    // Metadata
    dataSource: {
      type: String,
      required: true,
      default: "Census 2011 PCA",
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// COMPOUND INDEXES for efficient querying
DemographicsSchema.index({ districtLgd: 1, level: 1 });
DemographicsSchema.index({ subdistrictLgd: 1, level: 1 });
DemographicsSchema.index({ districtLgd: 1, subdistrictLgd: 1, level: 1 });
DemographicsSchema.index({ censusYear: 1, level: 1 });
DemographicsSchema.index({ residence: 1, level: 1 });

// Unique constraint: One entry per geographic unit per census year
DemographicsSchema.index(
  {
    districtLgd: 1,
    subdistrictLgd: 1,
    townVillageCode: 1,
    level: 1,
    residence: 1,
    censusYear: 1,
  },
  { unique: true, sparse: true }
);

export default mongoose.model<IDemographics>("Demographics", DemographicsSchema);

