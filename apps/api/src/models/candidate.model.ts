import mongoose, { Document, Model, Schema } from "mongoose";

export type CandidateSource =
  | "Referral"
  | "LinkedIn"
  | "CompanyWebsite"
  | "JobBoard"
  | "Agency"
  | "Other";

export interface ICandidate {
  name: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  currentTitle?: string;
  experienceYears: number;
  skills: string[];
  resumeUrl?: string | null;
  source: CandidateSource;
  summary?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICandidateDocument extends Document, Omit<ICandidate, "createdBy" | "updatedBy"> {
  id: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

export type ICandidateModel = Model<ICandidateDocument>;

const candidateSchema = new Schema<ICandidateDocument, ICandidateModel>(
  {
    name: {
      type: String,
      required: [true, "Candidate name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [150, "Name cannot exceed 150 characters"],
    },
    fullName: {
      type: String,
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [150, "Full name cannot exceed 150 characters"],
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "Remote",
    },
    currentTitle: {
      type: String,
      trim: true,
      default: "",
    },
    experienceYears: {
      type: Number,
      min: [0, "Experience years cannot be negative"],
      max: [60, "Experience years cannot exceed 60 years"],
      default: 0,
    },
    skills: {
      type: [String],
      default: [],
    },
    resumeUrl: {
      type: String,
      default: null,
      trim: true,
    },
    source: {
      type: String,
      enum: {
        values: ["Referral", "LinkedIn", "CompanyWebsite", "JobBoard", "Agency", "Other"],
        message: "{VALUE} is not a valid candidate source",
      },
      default: "Other",
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [2000, "Summary cannot exceed 2000 characters"],
      default: "",
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
        if (!ret.fullName && ret.name) ret.fullName = ret.name;
        if (!ret.name && ret.fullName) ret.name = ret.fullName;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Synchronize name and fullName before validation
candidateSchema.pre("validate", function () {
  if (this.name && !this.fullName) {
    this.fullName = this.name;
  } else if (this.fullName && !this.name) {
    this.name = this.fullName;
  }
});

// Indexes for query optimization per Architecture.md §4.2
candidateSchema.index({ email: 1 });
candidateSchema.index({ archivedAt: 1, name: 1 });
candidateSchema.index({ archivedAt: 1, fullName: 1 });
candidateSchema.index({ skills: 1 });
candidateSchema.index({ source: 1, createdAt: -1 });

export const Candidate = mongoose.model<ICandidateDocument, ICandidateModel>("Candidate", candidateSchema);
