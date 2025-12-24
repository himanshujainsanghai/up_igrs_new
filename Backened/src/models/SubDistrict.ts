import mongoose, { Schema, Document } from "mongoose";

export interface ISubDistrict extends Document {
  subdistrictName: string;
  subdistrictLgd: number;
  districtName: string;
  districtLgd: number;
  stateName: string;
  stateLgd: number;
  centerLatitude?: number;
  centerLongitude?: number;
  area?: number;
  population?: number;
  totalVillages?: number;
  isGeocoded: boolean;
  boundaryGeoJSON?: any;
  createdAt: Date;
  updatedAt: Date;
}

const SubDistrictSchema: Schema = new Schema(
  {
    subdistrictName: {
      type: String,
      required: true,
      maxlength: 100,
    },
    subdistrictLgd: {
      type: Number,
      required: true,
      unique: true,
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
    centerLatitude: {
      type: Number,
      required: false,
    },
    centerLongitude: {
      type: Number,
      required: false,
    },
    area: {
      type: Number,
      required: false,
    },
    population: {
      type: Number,
      required: false,
    },
    totalVillages: {
      type: Number,
      required: false,
      default: 0,
    },
    isGeocoded: {
      type: Boolean,
      required: true,
      default: false,
    },
    boundaryGeoJSON: {
      type: Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SubDistrictSchema.index({ subdistrictLgd: 1 });
SubDistrictSchema.index({ districtLgd: 1 });

export default mongoose.model<ISubDistrict>("SubDistrict", SubDistrictSchema);

