import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAIUsageRecord {
  provider: string;
  model: string;
  operation: "ats_analysis" | "screening_review" | "interview_brief" | "feedback_summary";
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string | null;
  userId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

export interface IAIUsageRecordDocument extends Omit<Document, "model">, IAIUsageRecord {
  id: string;
}

export type IAIUsageRecordModel = Model<IAIUsageRecordDocument>;

const aiUsageRecordSchema = new Schema<IAIUsageRecordDocument, IAIUsageRecordModel>(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    operation: {
      type: String,
      required: true,
      enum: ["ats_analysis", "screening_review", "interview_brief", "feedback_summary"],
      index: true,
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
    success: {
      type: Boolean,
      default: true,
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

aiUsageRecordSchema.index({ createdAt: -1 });

export const AIUsageRecord = mongoose.model<IAIUsageRecordDocument, IAIUsageRecordModel>(
  "AIUsageRecord",
  aiUsageRecordSchema
);
