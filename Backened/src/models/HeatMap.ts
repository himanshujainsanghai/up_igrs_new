import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * HEAT MAP MODEL
 * Stores district-wise heat map values and aggregated complaint statistics
 * Used for rendering heat maps and generating charts
 */

// Category types matching Complaint model
type ComplaintCategory = 'roads' | 'water' | 'electricity' | 'documents' | 'health' | 'education';

// Status types matching Complaint model
type ComplaintStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

// Interface for category breakdown with subcategories
interface CategoryBreakdown {
  count: number;
  sub: { [key: string]: number };
}

// Interface for time series data point
interface TimeSeriesPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  count: number;
}

// Interface for normalized values
interface NormalizedValues {
  per100k?: number;
  perKm2?: number;
}

// Interface for top issue
interface TopIssue {
  category: ComplaintCategory;
  sub?: string;
  count: number;
}

// Interface for metadata
interface DistrictMeta {
  population?: number;
  areaKm2?: number;
}

// Interface for status breakdown
interface StatusBreakdown {
  pending?: number;
  in_progress?: number;
  resolved?: number;
  rejected?: number;
}

export interface IHeatMap extends Document {
  // IDENTIFICATION
  id: string;                                    // UUID unique identifier

  // REQUIRED FIELDS
  districtCode: string;                          // Unique district code (matches GeoJSON id, e.g., "Agra", "Aligarh")
  districtName: string;                          // District name (e.g., "Agra")
  heatValue: number;                             // Primary scalar value for map coloring (e.g., total complaints or normalized score)

  // OPTIONAL FIELDS
  state?: string;                                // State name (e.g., "Uttar Pradesh")

  // Raw counts
  totalComplaints?: number;                      // Total number of complaints in this district

  // Status breakdown
  byStatus?: StatusBreakdown;                    // Complaint counts by status

  // Category breakdown
  byCategory?: {
    roads?: CategoryBreakdown;
    water?: CategoryBreakdown;
    electricity?: CategoryBreakdown;
    documents?: CategoryBreakdown;
    health?: CategoryBreakdown;
    education?: CategoryBreakdown;
    other?: CategoryBreakdown;
  };

  // Time series data (recent days for charts)
  timeSeries?: TimeSeriesPoint[];                // Array of daily counts (e.g., last 30 days)

  // Normalized values
  normalized?: NormalizedValues;                 // Values per 100k population, per km2, etc.

  // Top issues
  topIssues?: TopIssue[];                        // Top N categories/subcategories for UI display

  // Metadata
  lastAggregatedAt?: Date;                       // When this document was last computed/updated
  meta?: DistrictMeta;                           // Additional metadata (population, area, etc.)

  // TIMESTAMPS
  created_at: Date;                              // Creation timestamp
  updated_at: Date;                              // Last update timestamp
}

const HeatMapSchema = new Schema<IHeatMap>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
      index: true,
    },
    districtCode: {
      type: String,
      required: [true, 'District code is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'District code cannot exceed 100 characters'],
      index: true,
    },
    districtName: {
      type: String,
      required: [true, 'District name is required'],
      trim: true,
      maxlength: [100, 'District name cannot exceed 100 characters'],
      index: true,
    },
    heatValue: {
      type: Number,
      required: [true, 'Heat value is required'],
      min: [0, 'Heat value cannot be negative'],
      index: true,
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State name cannot exceed 100 characters'],
      default: 'Uttar Pradesh',
    },
    totalComplaints: {
      type: Number,
      min: [0, 'Total complaints cannot be negative'],
      default: 0,
    },
    byStatus: {
      type: Schema.Types.Mixed,
      default: {},
    },
    byCategory: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timeSeries: [
      {
        date: {
          type: String,
          required: true,
          match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
        },
        count: {
          type: Number,
          required: true,
          min: [0, 'Count cannot be negative'],
        },
      },
    ],
    normalized: {
      type: Schema.Types.Mixed,
      default: {},
    },
    topIssues: [
      {
        category: {
          type: String,
          enum: {
            values: ['roads', 'water', 'electricity', 'documents', 'health', 'education'],
            message: '{VALUE} is not a valid category',
          },
          required: true,
        },
        sub: {
          type: String,
          maxlength: [100, 'Sub-category cannot exceed 100 characters'],
        },
        count: {
          type: Number,
          required: true,
          min: [0, 'Count cannot be negative'],
        },
      },
    ],
    lastAggregatedAt: {
      type: Date,
      default: Date.now,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
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
    collection: 'heatmaps',
  }
);

// Performance indexes
HeatMapSchema.index({ districtCode: 1 }, { unique: true });
HeatMapSchema.index({ districtName: 1 });
HeatMapSchema.index({ heatValue: -1 }); // For sorting by heat value
HeatMapSchema.index({ state: 1, heatValue: -1 }); // For filtering by state and sorting
HeatMapSchema.index({ lastAggregatedAt: -1 }); // For finding recently updated records
HeatMapSchema.index({ totalComplaints: -1 }); // For sorting by total complaints

// Compound index for common queries
HeatMapSchema.index({ state: 1, districtCode: 1 });

// Auto-update updated_at before save
HeatMapSchema.pre('save', function (next) {
  this.updated_at = new Date();
  if (!this.lastAggregatedAt) {
    this.lastAggregatedAt = new Date();
  }
  next();
});

export const HeatMap: Model<IHeatMap> = mongoose.model<IHeatMap>('HeatMap', HeatMapSchema);

