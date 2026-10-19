import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotification {
  recipientUserId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type:
    | "application_status"
    | "ats_ready"
    | "interview_scheduled"
    | "feedback_released"
    | "offer_extended"
    | "offer_accepted"
    | "offer_declined"
    | "system";
  link?: string | null;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

export interface INotificationDocument extends INotification, Document {
  id: string;
}

export type INotificationModel = Model<INotificationDocument>;

const notificationSchema = new Schema<INotificationDocument, INotificationModel>(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "application_status",
        "ats_ready",
        "interview_scheduled",
        "feedback_released",
        "offer_extended",
        "offer_accepted",
        "offer_declined",
        "system",
      ],
      index: true,
    },
    link: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
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

notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotificationDocument, INotificationModel>(
  "Notification",
  notificationSchema
);
