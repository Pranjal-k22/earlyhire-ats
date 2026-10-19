import mongoose, { Document, Model, Schema } from "mongoose";

export const OFFER_STATUSES = [
  "Draft",
  "PendingApproval",
  "Approved",
  "Extended",
  "Accepted",
  "Declined",
  "Expired",
  "Withdrawn",
] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

export interface IOffer {
  applicationId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  candidateUserId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId | null;
  title: string;
  salary: number;
  currency: string;
  employmentType: "FullTime" | "PartTime" | "Contract" | "Internship";
  location: string;
  startDate?: Date | null;
  expiryDate?: Date | null;
  status: OfferStatus;
  notes?: string;
  candidateResponseNotes?: string;
  respondedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOfferDocument extends IOffer, Document {
  id: string;
}

export type IOfferModel = Model<IOfferDocument>;

const offerSchema = new Schema<IOfferDocument, IOfferModel>(
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
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    candidateUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    salary: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      default: "INR",
      uppercase: true,
    },
    employmentType: {
      type: String,
      enum: ["FullTime", "PartTime", "Contract", "Internship"],
      default: "FullTime",
    },
    location: {
      type: String,
      required: true,
      trim: true,
      default: "Remote",
    },
    startDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: OFFER_STATUSES,
      default: "Draft",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    candidateResponseNotes: {
      type: String,
      trim: true,
      default: "",
    },
    respondedAt: {
      type: Date,
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

offerSchema.index({ applicationId: 1, status: 1 });
offerSchema.index({ candidateUserId: 1, status: 1 });

export const Offer = mongoose.model<IOfferDocument, IOfferModel>("Offer", offerSchema);
