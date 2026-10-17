import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInterview {
  applicationId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  candidateUserId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  organizerId: mongoose.Types.ObjectId;
  interviewers: Array<{
    userId?: mongoose.Types.ObjectId;
    name: string;
    email: string;
  }>;
  title: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  timezone: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  googleCalendarEventId?: string | null;
  googleMeetLink?: string | null;
  meetingType: "google_meet" | "manual_link" | "in_person";
  manualMeetingLink?: string | null;
  notes?: string;
  cancellationReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInterviewDocument extends IInterview, Document {
  id: string;
}

export type IInterviewModel = Model<IInterviewDocument>;

const interviewSchema = new Schema<IInterviewDocument, IInterviewModel>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    candidateUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    interviewers: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        name: { type: String, required: true },
        email: { type: String, required: true },
      },
    ],
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Candidate Interview",
    },
    scheduledStartTime: {
      type: Date,
      required: true,
      index: true,
    },
    scheduledEndTime: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
      index: true,
    },
    googleCalendarEventId: {
      type: String,
      default: null,
    },
    googleMeetLink: {
      type: String,
      default: null,
    },
    meetingType: {
      type: String,
      enum: ["google_meet", "manual_link", "in_person"],
      default: "google_meet",
    },
    manualMeetingLink: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    cancellationReason: {
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

interviewSchema.index({ candidateUserId: 1, scheduledStartTime: 1 });
interviewSchema.index({ applicationId: 1, status: 1 });

export const Interview = mongoose.model<IInterviewDocument, IInterviewModel>(
  "Interview",
  interviewSchema
);
