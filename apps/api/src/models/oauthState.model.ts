import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOAuthState {
  state: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  redirectUrl: string;
  createdAt: Date;
}

export interface IOAuthStateDocument extends IOAuthState, Document {
  id: string;
}

export type IOAuthStateModel = Model<IOAuthStateDocument>;

const oauthStateSchema = new Schema<IOAuthStateDocument, IOAuthStateModel>(
  {
    state: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index to automatically purge expired states
    },
    redirectUrl: {
      type: String,
      default: "/#workspace",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const OAuthState = mongoose.model<IOAuthStateDocument, IOAuthStateModel>(
  "OAuthState",
  oauthStateSchema
);
