import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

export type UserRole = "admin" | "recruiter" | "hiring_manager";

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
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
        values: ["admin", "recruiter", "hiring_manager"],
        message: "{VALUE} is not a supported role",
      },
      default: "recruiter",
    },
    isActive: {
      type: Boolean,
      default: true,
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
