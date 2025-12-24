import mongoose, { Schema, Document } from "mongoose";

export interface IVillage extends Document {
  villageName: string;
  lgdCode: string;
  subdistrictName: string;
  subdistrictLgd: number;
  districtName: string;
  districtLgd: number;
  stateName: string;
  stateLgd: number;
  blockName?: string;                  // Block name (e.g., "Ambiapur")
  panchayatName?: string;              // Panchayat name
  sarpanch?: string;                   // Village Sarpanch name
  latitude?: number;
  longitude?: number;
  isGeocoded: boolean;
  population?: number;
  area?: number;
  createdAt: Date;
  updatedAt: Date;
}

const VillageSchema: Schema = new Schema(
  {
    villageName: {
      type: String,
      required: true,
      maxlength: 200,
    },
    lgdCode: {
      type: String,
      required: true,
      unique: true,
      maxlength: 50,
    },
    subdistrictName: {
      type: String,
      required: true,
      maxlength: 100,
    },
    subdistrictLgd: {
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
    },
    stateLgd: {
      type: Number,
      required: true,
    },
    blockName: {
      type: String,
      required: false,
      maxlength: 100,
      index: true,
    },
    panchayatName: {
      type: String,
      required: false,
      maxlength: 100,
      index: true,
    },
    sarpanch: {
      type: String,
      required: false,
      maxlength: 200,
    },
    latitude: {
      type: Number,
      required: false,
    },
    longitude: {
      type: Number,
      required: false,
    },
    isGeocoded: {
      type: Boolean,
      required: true,
      default: false,
    },
    population: {
      type: Number,
      required: false,
    },
    area: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
VillageSchema.index({ lgdCode: 1 });
VillageSchema.index({ districtLgd: 1 });
VillageSchema.index({ subdistrictLgd: 1 });
VillageSchema.index({ isGeocoded: 1 });

export default mongoose.model<IVillage>("Village", VillageSchema);

