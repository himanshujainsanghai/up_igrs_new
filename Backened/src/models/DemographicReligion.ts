import mongoose, { Schema, Document } from "mongoose";

/**
 * DEMOGRAPHIC RELIGION MODEL
 * Stores religion-based demographic data at district, sub-district, and town levels
 * Based on Census data with Total, Rural, and Urban breakdowns
 */

// Population breakdown interface
interface IPopulation {
  persons: number;
  males: number;
  females: number;
}

// Religion breakdown interface
interface IReligion {
  hindu?: IPopulation;
  muslim?: IPopulation;
  christian?: IPopulation;
  sikh?: IPopulation;
  buddhist?: IPopulation;
  jain?: IPopulation;
  others?: IPopulation;
  not_stated?: IPopulation;
}

// Area stats interface (Total, Rural, Urban)
interface IAreaStats {
  population: IPopulation;
  religion: IReligion;
}

// Town interface
interface ITown {
  name: string;
  type: string; // "Urban", "NP", "NPP", etc.
  population: IPopulation;
  religion: IReligion;
}

// Sub-district interface
interface ISubDistrict {
  name: string;
  code: string;
  stats: {
    Total: IAreaStats;
    Rural: IAreaStats;
    Urban: IAreaStats;
  };
  towns: ITown[];
}

// Main interface
export interface IDemographicReligion extends Document {
  district: mongoose.Types.ObjectId; // Reference to District model
  district_info: {
    name: string;
    state_code: string;
    district_code: string;
  };
  district_stats: {
    Total: IAreaStats;
    Rural: IAreaStats;
    Urban: IAreaStats;
  };
  sub_districts: ISubDistrict[];
  createdAt: Date;
  updatedAt: Date;
}

// Population sub-schema
const PopulationSchema = new Schema<IPopulation>(
  {
    persons: { type: Number, required: true, min: 0 },
    males: { type: Number, required: true, min: 0 },
    females: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Religion sub-schema
const ReligionSchema = new Schema<IReligion>(
  {
    hindu: { type: PopulationSchema },
    muslim: { type: PopulationSchema },
    christian: { type: PopulationSchema },
    sikh: { type: PopulationSchema },
    buddhist: { type: PopulationSchema },
    jain: { type: PopulationSchema },
    others: { type: PopulationSchema },
    not_stated: { type: PopulationSchema },
  },
  { _id: false }
);

// Area stats sub-schema
const AreaStatsSchema = new Schema<IAreaStats>(
  {
    population: { type: PopulationSchema, required: true },
    religion: { type: ReligionSchema, required: true },
  },
  { _id: false }
);

// Town sub-schema
const TownSchema = new Schema<ITown>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    population: { type: PopulationSchema, required: true },
    religion: { type: ReligionSchema, required: true },
  },
  { _id: false }
);

// Sub-district sub-schema
const SubDistrictSchema = new Schema<ISubDistrict>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    stats: {
      Total: { type: AreaStatsSchema, required: true },
      Rural: { type: AreaStatsSchema, required: true },
      Urban: { type: AreaStatsSchema, required: true },
    },
    towns: { type: [TownSchema], default: [] },
  },
  { _id: false }
);

// Main schema
const DemographicReligionSchema = new Schema<IDemographicReligion>(
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
    },
    district_stats: {
      Total: { type: AreaStatsSchema, required: true },
      Rural: { type: AreaStatsSchema, required: true },
      Urban: { type: AreaStatsSchema, required: true },
    },
    sub_districts: {
      type: [SubDistrictSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "demographic_religions",
  }
);

// Indexes
DemographicReligionSchema.index({ district: 1 }, { unique: true }); // One record per district
DemographicReligionSchema.index({ "district_info.district_code": 1 });
DemographicReligionSchema.index({ "district_info.state_code": 1 });
DemographicReligionSchema.index({ "district_info.name": 1 });

// Compound index for efficient sub-district queries
DemographicReligionSchema.index({ district: 1, "sub_districts.code": 1 });

export default mongoose.model<IDemographicReligion>(
  "DemographicReligion",
  DemographicReligionSchema
);

