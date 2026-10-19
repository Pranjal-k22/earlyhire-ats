import mongoose, { Document, Model, Schema } from "mongoose";

export const NOTIFICATION_TYPES = [
  "application_status",
  "application_received",
  "application_submitted",
  "ats_ready",
  "ats_failed",
  "screening_completed",
  "screening_failed",
  "screening_needs_review",
  "interview_scheduled",
  "interview_rescheduled",
  "interview_cancelled",
  "feedback_submitted",
  "feedback_released",
  "offer_extended",
  "offer_accepted",
  "offer_declined",
  "stage_changed",
  "system",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification {
  recipientUserId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
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
      enum: NOTIFICATION_TYPES,
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
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
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
notificationSchema.index(
  { recipientUserId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

export const Notification = mongoose.model<INotificationDocument, INotificationModel>(
  "Notification",
  notificationSchema
);
