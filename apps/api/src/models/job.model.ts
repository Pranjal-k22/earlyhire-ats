import mongoose, { Document, Model, Schema } from "mongoose";

export type JobStatus = "Open" | "Paused" | "Closed" | "Archived";
export type EmploymentType = "FullTime" | "PartTime" | "Contract" | "Internship";

export interface IJob {
  title: string;
  department?: string;
  location?: string;
  employmentType: EmploymentType;
  description: string;
  requirements: string[];
  experienceMin?: number;
  experienceMax?: number;
  status: JobStatus;
  ownerId: mongoose.Types.ObjectId;
  openedAt: Date;
  closesAt?: Date | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobDocument extends Document, Omit<IJob, "ownerId"> {
  id: string;
  ownerId: mongoose.Types.ObjectId;
}

export type IJobModel = Model<IJobDocument>;

const jobSchema = new Schema<IJobDocument, IJobModel>(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    department: {
      type: String,
      trim: true,
      default: "General",
    },
    location: {
      type: String,
      trim: true,
      default: "Remote",
    },
    employmentType: {
      type: String,
      enum: {
        values: ["FullTime", "PartTime", "Contract", "Internship"],
        message: "{VALUE} is not a valid employment type",
      },
      default: "FullTime",
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
      minlength: [2, "Description must be at least 2 characters"],
      maxlength: [10000, "Description cannot exceed 10,000 characters"],
    },
    requirements: {
      type: [String],
      default: [],
    },
    experienceMin: {
      type: Number,
      min: [0, "Minimum experience cannot be negative"],
      max: [50, "Minimum experience cannot exceed 50 years"],
      default: 0,
    },
    experienceMax: {
      type: Number,
      min: [0, "Maximum experience cannot be negative"],
      max: [50, "Maximum experience cannot exceed 50 years"],
    },
    status: {
      type: String,
      enum: {
        values: ["Open", "Paused", "Closed", "Archived"],
        message: "{VALUE} is not a valid job status",
      },
      default: "Open",
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner user reference is required"],
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closesAt: {
      type: Date,
      default: null,
    },
    archivedAt: {
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
        return ret;
      },
    },
  }
);

// Indexes based on Architecture.md §4.3 query patterns
jobSchema.index({ status: 1, archivedAt: 1, openedAt: -1 });
jobSchema.index({ title: 1, status: 1 });
jobSchema.index({ ownerId: 1, status: 1 });

export const Job = mongoose.model<IJobDocument, IJobModel>("Job", jobSchema);
