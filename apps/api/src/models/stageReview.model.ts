import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStageReview {
  applicationId: mongoose.Types.ObjectId;
  stage: string;
  jobId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  reviewType: "screening_review" | "interview_brief" | "offer_checklist";
  suitabilityScore?: number;
  aiSummary: string;
  suggestedQuestions: Array<{
    question: string;
    purpose: string;
    expectedSignal?: string;
  }>;
  rubricCriteria: string[];
  strengths: string[];
  gapsOrRisks: string[];
  recommendedDecision: "advance" | "hold" | "reject_suggested";
  status: "pending" | "completed" | "failed";
  provider: string;
  model: string;
  latencyMs: number;
  humanDecision?: {
    decision: "advance" | "hold" | "reject";
    actorId: mongoose.Types.ObjectId;
    actorName: string;
    notes: string;
    decidedAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStageReviewDocument extends Omit<Document, "model">, IStageReview {
  id: string;
}

export type IStageReviewModel = Model<IStageReviewDocument>;

const stageReviewSchema = new Schema<IStageReviewDocument, IStageReviewModel>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    stage: {
      type: String,
      required: true,
      trim: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    reviewType: {
      type: String,
      required: true,
      enum: ["screening_review", "interview_brief", "offer_checklist"],
    },
    suitabilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    aiSummary: {
      type: String,
      default: "",
    },
    suggestedQuestions: [
      {
        question: { type: String, required: true },
        purpose: { type: String, default: "" },
        expectedSignal: { type: String, default: "" },
      },
    ],
    rubricCriteria: {
      type: [String],
      default: [],
    },
    strengths: {
      type: [String],
      default: [],
    },
    gapsOrRisks: {
      type: [String],
      default: [],
    },
    recommendedDecision: {
      type: String,
      enum: ["advance", "hold", "reject_suggested"],
      default: "hold",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    provider: {
      type: String,
      default: "unknown",
    },
    model: {
      type: String,
      default: "unknown",
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    humanDecision: {
      decision: { type: String, enum: ["advance", "hold", "reject"] },
      actorId: { type: Schema.Types.ObjectId, ref: "User" },
      actorName: { type: String },
      notes: { type: String, default: "" },
      decidedAt: { type: Date },
    },
  },
  {
    timestamps: true,
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

stageReviewSchema.index({ applicationId: 1, stage: 1 });

export const ApplicationStageReview = mongoose.model<IStageReviewDocument, IStageReviewModel>(
  "ApplicationStageReview",
  stageReviewSchema
);
