import mongoose, { Document, Model, Schema } from "mongoose";

export const HIRING_STAGES = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
] as const;

export type HiringStage = (typeof HIRING_STAGES)[number];

export interface IInterviewStageHistory {
  applicationId: mongoose.Types.ObjectId;
  fromStage: HiringStage | null;
  toStage: HiringStage;
  actorId: mongoose.Types.ObjectId;
  changedAt: Date;
  reason?: string | null;
  durationMsFromPreviousStage?: number | null;
  requestId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInterviewStageHistoryDocument
  extends Document,
    Omit<IInterviewStageHistory, "applicationId" | "actorId"> {
  id: string;
  applicationId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
}

export type IInterviewStageHistoryModel = Model<IInterviewStageHistoryDocument>;

const stageHistorySchema = new Schema<
  IInterviewStageHistoryDocument,
  IInterviewStageHistoryModel
>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: [true, "Application ID reference is required"],
      index: true,
    },
    fromStage: {
      type: String,
      enum: {
        values: [...HIRING_STAGES, null],
        message: "{VALUE} is not a valid fromStage",
      },
      default: null,
    },
    toStage: {
      type: String,
      enum: {
        values: HIRING_STAGES,
        message: "{VALUE} is not a valid toStage",
      },
      required: [true, "toStage is required"],
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Actor user reference is required"],
      index: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, "Reason cannot exceed 1000 characters"],
    },
    durationMsFromPreviousStage: {
      type: Number,
      default: null,
    },
    requestId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "stagehistories",
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

// Indexes per Architecture.md §4.5
stageHistorySchema.index({ applicationId: 1, changedAt: 1 });
stageHistorySchema.index({ actorId: 1, changedAt: -1 });

export const InterviewStageHistory = mongoose.model<
  IInterviewStageHistoryDocument,
  IInterviewStageHistoryModel
>("InterviewStageHistory", stageHistorySchema);
