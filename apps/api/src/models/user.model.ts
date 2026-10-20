import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

export const CANONICAL_ROLES = ["candidate", "hiring_team", "platform_manager"] as const;
export const LEGACY_ROLES = ["admin", "recruiter", "hiring_manager"] as const;
export const ALL_USER_ROLES = [
  "candidate",
  "hiring_team",
  "platform_manager",
  "admin",
  "recruiter",
  "hiring_manager",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];
export type LegacyRole = (typeof LEGACY_ROLES)[number];
export type UserRole = (typeof ALL_USER_ROLES)[number];

export const normalizeRole = (role: UserRole | string): CanonicalRole => {
  switch (role) {
    case "admin":
    case "platform_manager":
      return "platform_manager";
    case "recruiter":
    case "hiring_manager":
    case "hiring_team":
      return "hiring_team";
    case "candidate":
    default:
      return "candidate";
  }
};

export const USER_APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type UserApprovalStatus = (typeof USER_APPROVAL_STATUSES)[number];

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  approvalStatus: UserApprovalStatus;
  company?: string;
  department?: string;
  approvedAt?: Date | null;
  approvedBy?: mongoose.Types.ObjectId | null;
  headline?: string;
  phone?: string;
  bio?: string;
  skills?: string[];
  resumeId?: mongoose.Types.ObjectId;
  candidateProfileId?: mongoose.Types.ObjectId;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends Document, Omit<IUser, "passwordHash"> {
  passwordHash: string;
  id: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUserDocument> {
  hashPassword(password: string): Promise<string>;
}

const userSchema = new Schema<IUserDocument, IUserModel>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false, // Excluded from default queries
    },
    role: {
      type: String,
      enum: {
        values: ALL_USER_ROLES,
        message: "{VALUE} is not a supported role",
      },
      default: "candidate",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    approvalStatus: {
      type: String,
      enum: {
        values: USER_APPROVAL_STATUSES,
        message: "{VALUE} is not a supported approval status",
      },
      default: "approved",
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
      default: "",
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, "Department cannot exceed 100 characters"],
      default: "",
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: [150, "Headline cannot exceed 150 characters"],
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, "Phone cannot exceed 30 characters"],
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [2000, "Bio cannot exceed 2000 characters"],
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "ResumeFile",
      default: null,
    },
    candidateProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: "throw",
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string })?.toString();
        ret.canonicalRole = normalizeRole(ret.role as UserRole);
        ret.approvalStatus = ret.approvalStatus || "approved";
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// Instance method to compare password securely
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash passwords using bcrypt
userSchema.statics.hashPassword = async function (password: string): Promise<string> {
  const saltRounds = env.NODE_ENV === "test" ? 6 : 12;
  return bcrypt.hash(password, saltRounds);
};

export const User = mongoose.model<IUserDocument, IUserModel>("User", userSchema);
