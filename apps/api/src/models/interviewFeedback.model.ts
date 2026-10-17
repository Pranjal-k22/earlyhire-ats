import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInterviewFeedback {
  interviewId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  interviewerId: mongoose.Types.ObjectId;
  interviewerName: string;
  ratings: {
    technicalRating: number;
    communicationRating: number;
    problemSolvingRating: number;
    cultureAndValuesRating: number;
    overallRating: number;
  };
  strengths: string;
  concerns: string;
  internalNotes: string; // Strictly confidential, hidden from candidates
  candidateReleasableFeedback: string;
  isReleasedToCandidate: boolean;
  releasedAt?: Date | null;
  releasedBy?: mongoose.Types.ObjectId | null;
  recommendation: "strong_hire" | "hire" | "hold" | "no_hire";
  createdAt: Date;
  updatedAt: Date;
}

export interface IInterviewFeedbackDocument extends IInterviewFeedback, Document {
  id: string;
}

export type IInterviewFeedbackModel = Model<IInterviewFeedbackDocument>;

const interviewFeedbackSchema = new Schema<IInterviewFeedbackDocument, IInterviewFeedbackModel>(
  {
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    interviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    interviewerName: {
      type: String,
      required: true,
      trim: true,
    },
    ratings: {
      technicalRating: { type: Number, min: 1, max: 5, required: true },
      communicationRating: { type: Number, min: 1, max: 5, required: true },
      problemSolvingRating: { type: Number, min: 1, max: 5, required: true },
      cultureAndValuesRating: { type: Number, min: 1, max: 5, required: true },
      overallRating: { type: Number, min: 1, max: 5, required: true },
    },
    strengths: {
      type: String,
      default: "",
    },
    concerns: {
      type: String,
      default: "",
    },
    internalNotes: {
      type: String,
      default: "",
    },
    candidateReleasableFeedback: {
      type: String,
      default: "",
    },
    isReleasedToCandidate: {
      type: Boolean,
      default: false,
      index: true,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    releasedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    recommendation: {
      type: String,
      enum: ["strong_hire", "hire", "hold", "no_hire"],
      default: "hold",
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

interviewFeedbackSchema.index({ applicationId: 1, interviewerId: 1 });

export const InterviewFeedback = mongoose.model<IInterviewFeedbackDocument, IInterviewFeedbackModel>(
  "InterviewFeedback",
  interviewFeedbackSchema
);
