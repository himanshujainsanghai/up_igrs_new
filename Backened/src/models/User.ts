import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * USER MODEL
 * Admin users for authentication and officer portal access
 */

export interface IUser extends Document {
  id: string;                                    // UUID unique identifier
  email: string;                                 // Email address (unique)
  password: string;                              // Hashed password
  role: 'admin' | 'officer' | 'user';           // User role
  name?: string;                                 // User name
  officerId?: mongoose.Types.ObjectId;           // Reference to Officer model (for officer role)
  isActive: boolean;                             // Account status
  lastLogin?: Date;                              // Last login timestamp
  created_at: Date;                              // Creation timestamp
  updated_at: Date;                              // Last update timestamp
}

const UserSchema = new Schema<IUser>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default - use .select('+password') to include
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'officer', 'user'],
      default: 'user',
    },
    name: {
      type: String,
      maxlength: [100, 'Name cannot exceed 100 characters'],
      trim: true,
    },
    officerId: {
      type: Schema.Types.ObjectId,
      ref: 'Officer',
      required: false,
      index: true,
      unique: true,
      sparse: true, // Allows multiple nulls
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
    collection: 'users',
  }
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ officerId: 1 });

// Auto-update updated_at
UserSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

