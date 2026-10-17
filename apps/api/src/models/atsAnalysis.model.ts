import mongoose, { Document, Model, Schema } from "mongoose";

export type AnalysisStatus = "pending" | "in_progress" | "completed" | "failed";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface IAtsAnalysis {
  candidateUserId: mongoose.Types.ObjectId;
  resumeId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId | null;
  overallScore: number;
  breakdown: {
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    roleRelevanceScore: number;
  };
  requiredSkillsFound: string[];
  missingCriteria: string[];
  experienceEvidence: string[];
  concreteSuggestions: string[];
  suggestedInterviewTopics: string[];
  confidence: ConfidenceLevel;
  summary: string;
  provider: string;
  model: string;
  promptVersion: string;
  rubricVersion: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  status: AnalysisStatus;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAtsAnalysisDocument extends Omit<Document, "model">, IAtsAnalysis {
  id: string;
}

export type IAtsAnalysisModel = Model<IAtsAnalysisDocument>;

const atsAnalysisSchema = new Schema<IAtsAnalysisDocument, IAtsAnalysisModel>(
  {
    candidateUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Candidate user ID is required"],
      index: true,
    },
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "ResumeFile",
      required: [true, "Resume ID is required"],
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      default: null,
      index: true,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    breakdown: {
      skillsScore: { type: Number, min: 0, max: 100, default: 0 },
      experienceScore: { type: Number, min: 0, max: 100, default: 0 },
      educationScore: { type: Number, min: 0, max: 100, default: 0 },
      roleRelevanceScore: { type: Number, min: 0, max: 100, default: 0 },
    },
    requiredSkillsFound: {
      type: [String],
      default: [],
    },
    missingCriteria: {
      type: [String],
      default: [],
    },
    experienceEvidence: {
      type: [String],
      default: [],
    },
    concreteSuggestions: {
      type: [String],
      default: [],
    },
    suggestedInterviewTopics: {
      type: [String],
      default: [],
    },
    confidence: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    summary: {
      type: String,
      default: "",
    },
    provider: {
      type: String,
      default: "unknown",
      trim: true,
    },
    model: {
      type: String,
      default: "unknown",
      trim: true,
    },
    promptVersion: {
      type: String,
      default: "v1.0",
      trim: true,
    },
    rubricVersion: {
      type: String,
      default: "v1.0",
      trim: true,
    },
    inputTokens: {
      type: Number,
      default: 0,
    },
    outputTokens: {
      type: Number,
      default: 0,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "in_progress", "completed", "failed"],
        message: "{VALUE} is not a valid analysis status",
      },
      default: "pending",
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
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

// Deterministic caching and query indexes
atsAnalysisSchema.index({ resumeId: 1, jobId: 1, promptVersion: 1, rubricVersion: 1 });
atsAnalysisSchema.index({ candidateUserId: 1, createdAt: -1 });

export const AtsAnalysis = mongoose.model<IAtsAnalysisDocument, IAtsAnalysisModel>(
  "AtsAnalysis",
  atsAnalysisSchema
);
