import mongoose, { Schema, Document } from "mongoose";

/**
 * DISTRICT ADMINISTRATIVE HEAD MODEL
 * Stores district-wise administrative heads including legislative and executive authorities
 */

// Contact information sub-schema
interface IContact {
  official_address?: string;
  phone?: string;
  cug_mobile?: string;
  office_phone?: string;
  email?: string;
  address?: string;
  official_type?: string;
}

// MLA sub-schema
interface IMLA {
  constituency_no: string;
  constituency_name: string;
  name: string;
  party: string;
  status: string;
  image?: string; // Optional
  contact?: IContact;
}

// MLC sub-schema
interface IMLC {
  constituency_type: string;
  name: string;
  party: string;
  status: string;
  image?: string; // Optional
  contact?: IContact;
}

// Local body head sub-schema
interface ILocalBodyHead {
  designation: string;
  name: string;
  party: string;
  level: string;
  image?: string; // Optional
  contact?: IContact;
}

// General administration official sub-schema
interface IGeneralAdministration {
  designation: string;
  name: string;
  role: string;
  image?: string; // Optional
  contact?: IContact;
}

// Police administration official sub-schema
interface IPoliceAdministration {
  designation: string;
  name: string;
  role: string;
  image?: string; // Optional
  contact?: IContact;
}

// Main interface
export interface IDistrictAdministrativeHead extends Document {
  district: mongoose.Types.ObjectId; // Reference to District model
  district_profile: {
    name: string;
    state: string;
    headquarters: string;
    official_website?: string;
  };
  legislative_authorities: {
    members_of_legislative_assembly_MLA: IMLA[];
    member_of_legislative_council_MLC: IMLC[];
    local_body_heads: ILocalBodyHead[];
  };
  executive_authorities: {
    general_administration: IGeneralAdministration[];
    police_administration: IPoliceAdministration[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Contact sub-schema
const ContactSchema = new Schema<IContact>(
  {
    official_address: { type: String },
    phone: { type: String },
    cug_mobile: { type: String },
    office_phone: { type: String },
    email: { type: String },
    address: { type: String },
    official_type: { type: String },
  },
  { _id: false }
);

// MLA sub-schema
const MLASchema = new Schema<IMLA>(
  {
    constituency_no: { type: String, required: true },
    constituency_name: { type: String, required: true },
    name: { type: String, required: true },
    party: { type: String, required: true },
    status: { type: String, required: true },
    image: { type: String }, // Optional
    contact: { type: ContactSchema },
  },
  { _id: false }
);

// MLC sub-schema
const MLCSchema = new Schema<IMLC>(
  {
    constituency_type: { type: String, required: true },
    name: { type: String, required: true },
    party: { type: String, required: true },
    status: { type: String, required: true },
    image: { type: String }, // Optional
    contact: { type: ContactSchema },
  },
  { _id: false }
);

// Local body head sub-schema
const LocalBodyHeadSchema = new Schema<ILocalBodyHead>(
  {
    designation: { type: String, required: true },
    name: { type: String, required: true },
    party: { type: String, required: true },
    level: { type: String, required: true },
    image: { type: String }, // Optional
    contact: { type: ContactSchema },
  },
  { _id: false }
);

// General administration sub-schema
const GeneralAdministrationSchema = new Schema<IGeneralAdministration>(
  {
    designation: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    image: { type: String }, // Optional
    contact: { type: ContactSchema },
  },
  { _id: false }
);

// Police administration sub-schema
const PoliceAdministrationSchema = new Schema<IPoliceAdministration>(
  {
    designation: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    image: { type: String }, // Optional
    contact: { type: ContactSchema },
  },
  { _id: false }
);

// Main schema
const DistrictAdministrativeHeadSchema =
  new Schema<IDistrictAdministrativeHead>(
    {
      district: {
        type: Schema.Types.ObjectId,
        ref: "District",
        required: true,
        index: true,
      },
      district_profile: {
        name: { type: String, required: true },
        state: { type: String, required: true },
        headquarters: { type: String, required: true },
        official_website: { type: String },
      },
      legislative_authorities: {
        members_of_legislative_assembly_MLA: {
          type: [MLASchema],
          default: [],
        },
        member_of_legislative_council_MLC: {
          type: [MLCSchema],
          default: [],
        },
        local_body_heads: {
          type: [LocalBodyHeadSchema],
          default: [],
        },
      },
      executive_authorities: {
        general_administration: {
          type: [GeneralAdministrationSchema],
          default: [],
        },
        police_administration: {
          type: [PoliceAdministrationSchema],
          default: [],
        },
      },
    },
    {
      timestamps: true,
      collection: "district_administrative_heads",
    }
  );

// Indexes
DistrictAdministrativeHeadSchema.index({ district: 1 }, { unique: true }); // One record per district
DistrictAdministrativeHeadSchema.index({ "district_profile.state": 1 });
DistrictAdministrativeHeadSchema.index({ "district_profile.name": 1 });

export default mongoose.model<IDistrictAdministrativeHead>(
  "DistrictAdministrativeHead",
  DistrictAdministrativeHeadSchema
);
