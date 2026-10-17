import mongoose, { Document, Model, Schema } from "mongoose";

export type ResumeParsingStatus = "pending" | "completed" | "failed";

export interface IResumeFile {
  candidateUserId: mongoose.Types.ObjectId;
  candidateId?: mongoose.Types.ObjectId | null;
  originalFilename: string;
  storedFilename: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  contentSha256: string;
  parsedText: string;
  parsingStatus: ResumeParsingStatus;
  parsingError?: string | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResumeFileDocument extends IResumeFile, Document {
  id: string;
}

export type IResumeFileModel = Model<IResumeFileDocument>;

const resumeFileSchema = new Schema<IResumeFileDocument, IResumeFileModel>(
  {
    candidateUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Candidate user ID is required"],
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      default: null,
      index: true,
    },
    originalFilename: {
      type: String,
      required: [true, "Original filename is required"],
      trim: true,
      maxlength: [255, "Filename cannot exceed 255 characters"],
    },
    storedFilename: {
      type: String,
      required: [true, "Stored filename is required"],
      unique: true,
      trim: true,
    },
    storagePath: {
      type: String,
      required: [true, "Storage path is required"],
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, "MIME type is required"],
      trim: true,
    },
    fileSizeBytes: {
      type: Number,
      required: [true, "File size is required"],
      min: [1, "File cannot be empty"],
      max: [5 * 1024 * 1024, "File size cannot exceed 5MB"],
    },
    contentSha256: {
      type: String,
      required: [true, "Content SHA256 is required"],
      index: true,
    },
    parsedText: {
      type: String,
      default: "",
    },
    parsingStatus: {
      type: String,
      enum: {
        values: ["pending", "completed", "failed"],
        message: "{VALUE} is not a valid parsing status",
      },
      default: "pending",
      index: true,
    },
    parsingError: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
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
        // Never expose internal filesystem storage paths to client
        delete ret.storagePath;
        delete ret.storedFilename;
        return ret;
      },
    },
  }
);

resumeFileSchema.index({ candidateUserId: 1, isDeleted: 1, createdAt: -1 });

export const ResumeFile = mongoose.model<IResumeFileDocument, IResumeFileModel>(
  "ResumeFile",
  resumeFileSchema
);
