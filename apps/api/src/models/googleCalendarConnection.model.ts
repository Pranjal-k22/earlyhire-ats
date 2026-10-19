import mongoose, { Document, Model, Schema } from "mongoose";

export interface IGoogleCalendarConnection {
  userId: mongoose.Types.ObjectId;
  googleEmail: string;
  encryptedRefreshToken: string;
  iv: string;
  authTag: string;
  scope: string;
  connectedAt: Date;
  updatedAt: Date;
}

export interface IGoogleCalendarConnectionDocument extends IGoogleCalendarConnection, Document {
  id: string;
}

export type IGoogleCalendarConnectionModel = Model<IGoogleCalendarConnectionDocument>;

const googleCalendarConnectionSchema = new Schema<
  IGoogleCalendarConnectionDocument,
  IGoogleCalendarConnectionModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    googleEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    encryptedRefreshToken: {
      type: String,
      required: true,
      select: false, // Ensure encrypted secret is never returned by default queries
    },
    iv: {
      type: String,
      required: true,
      select: false,
    },
    authTag: {
      type: String,
      required: true,
      select: false,
    },
    scope: {
      type: String,
      default: "https://www.googleapis.com/auth/calendar.events",
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string })?.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.encryptedRefreshToken;
        delete ret.iv;
        delete ret.authTag;
        return ret;
      },
    },
  }
);

export const GoogleCalendarConnection = mongoose.model<
  IGoogleCalendarConnectionDocument,
  IGoogleCalendarConnectionModel
>("GoogleCalendarConnection", googleCalendarConnectionSchema);
