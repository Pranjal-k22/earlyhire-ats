import mongoose, { Document, Model, Schema } from "mongoose";

export interface INote {
  candidateId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  body: string;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface INoteDocument
  extends Document,
    Omit<INote, "candidateId" | "authorId" | "deletedBy"> {
  id: string;
  candidateId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  deletedBy?: mongoose.Types.ObjectId | null;
}

export type INoteModel = Model<INoteDocument>;

const noteSchema = new Schema<INoteDocument, INoteModel>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: [true, "Candidate reference is required"],
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author user reference is required"],
      index: true,
    },
    body: {
      type: String,
      required: [true, "Note body is required"],
      trim: true,
      minlength: [1, "Note cannot be empty"],
      maxlength: [5000, "Note cannot exceed 5000 characters"],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "notes",
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

// Indexes per Architecture.md §4.6
noteSchema.index({ candidateId: 1, createdAt: -1 });
noteSchema.index({ authorId: 1, createdAt: -1 });

export const Note = mongoose.model<INoteDocument, INoteModel>("Note", noteSchema);
