import mongoose, { Schema, Document } from "mongoose";

export interface IDistrict extends Document {
  districtName: string;
  districtLgd: number;
  stateName: string;
  stateLgd: number;
  area: number; // in sq km
  population: number;
  malePopulation: number;
  femalePopulation: number;
  language: string;
  totalVillages: number;
  headquarters: string;
  createdAt: Date;
  updatedAt: Date;
}

const DistrictSchema: Schema = new Schema(
  {
    districtName: {
      type: String,
      required: true,
      unique: true,
    },
    districtLgd: {
      type: Number,
      required: true,
      unique: true,
    },
    stateName: {
      type: String,
      required: true,
    },
    stateLgd: {
      type: Number,
      required: true,
    },
    area: {
      type: Number,
      required: true,
      comment: "Area in square kilometers",
    },
    population: {
      type: Number,
      required: true,
    },
    malePopulation: {
      type: Number,
      required: true,
    },
    femalePopulation: {
      type: Number,
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    totalVillages: {
      type: Number,
      required: true,
    },
    headquarters: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
DistrictSchema.index({ districtLgd: 1 });
DistrictSchema.index({ stateLgd: 1 });

export default mongoose.model<IDistrict>("District", DistrictSchema);

