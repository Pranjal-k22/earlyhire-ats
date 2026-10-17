import mongoose, { Document, Model, Schema } from "mongoose";
import { HIRING_STAGES, HiringStage } from "./stageHistory.model.js";

export const APPLICATION_STATUSES = ["Active", "Withdrawn", "Archived"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface IApplication {
  candidateId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  recruiterId: mongoose.Types.ObjectId;
  stage: HiringStage;
  currentStage: HiringStage;
  status: ApplicationStatus;
  appliedAt: Date;
  lastStageChangedAt: Date;
  rejectedAt?: Date | null;
  hiredAt?: Date | null;
  source?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApplicationDocument
  extends Document,
    Omit<IApplication, "candidateId" | "jobId" | "recruiterId" | "createdBy" | "updatedBy"> {
  id: string;
  candidateId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  recruiterId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

export type IApplicationModel = Model<IApplicationDocument>;

const applicationSchema = new Schema<IApplicationDocument, IApplicationModel>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: [true, "Candidate reference is required"],
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job reference is required"],
      index: true,
    },
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recruiter reference is required"],
      index: true,
    },
    stage: {
      type: String,
      enum: {
        values: HIRING_STAGES,
        message: "{VALUE} is not a valid hiring stage",
      },
      default: "Applied",
      required: true,
    },
    currentStage: {
      type: String,
      enum: {
        values: HIRING_STAGES,
        message: "{VALUE} is not a valid currentStage",
      },
      default: "Applied",
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: APPLICATION_STATUSES,
        message: "{VALUE} is not a valid application status",
      },
      default: "Active",
      required: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    lastStageChangedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    hiredAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user reference is required"],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Updated by user reference is required"],
    },
    version: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "applications",
    strict: "throw",
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string })?.toString();
        // Synchronize stage and currentStage in output
        if (!ret.stage && ret.currentStage) ret.stage = ret.currentStage;
        if (!ret.currentStage && ret.stage) ret.currentStage = ret.stage;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Synchronize stage and currentStage before validation
applicationSchema.pre("validate", function () {
  if (this.stage && !this.currentStage) {
    this.currentStage = this.stage;
  } else if (this.currentStage && !this.stage) {
    this.stage = this.currentStage;
  }
});

// Compound unique index: prevent duplicate applications for candidate and job
applicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });

// Query optimization indexes per Architecture.md §4.4
applicationSchema.index({ stage: 1, status: 1, appliedAt: -1 });
applicationSchema.index({ jobId: 1, stage: 1 });
applicationSchema.index({ recruiterId: 1, stage: 1 });
applicationSchema.index({ candidateId: 1, createdAt: -1 });

export const Application = mongoose.model<IApplicationDocument, IApplicationModel>(
  "Application",
  applicationSchema
);
