import mongoose from "mongoose";
import {
  Notification,
  INotificationDocument,
  NotificationType,
} from "../../models/notification.model.js";
import { User } from "../../models/user.model.js";
import { sseEventHub } from "../sse/sseEventHub.js";
import { emailService } from "../email/emailService.js";

export interface CreateNotificationParams {
  recipientUserId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
}

export class NotificationService {
  /**
   * Creates, persists, and delivers a notification to a specific recipient.
   * Dispatches real-time SSE and optional email delivery.
   * Never throws unhandled errors that could abort callers' business transactions.
   */
  public async createNotification(
    params: CreateNotificationParams
  ): Promise<INotificationDocument | null> {
    try {
      const recipientId =
        typeof params.recipientUserId === "string"
          ? new mongoose.Types.ObjectId(params.recipientUserId)
          : params.recipientUserId;

      // 1. Idempotency Check
      if (params.idempotencyKey) {
        const existing = await Notification.findOne({
          recipientUserId: recipientId,
          idempotencyKey: params.idempotencyKey,
        });
        if (existing) {
          return existing;
        }
      }

      // 2. Persist Notification
      const notification = await Notification.create({
        recipientUserId: recipientId,
        title: params.title.trim(),
        message: params.message.trim(),
        type: params.type,
        link: params.link || null,
        metadata: params.metadata || {},
        idempotencyKey: params.idempotencyKey || null,
        isRead: false,
      });

      // 3. Real-time delivery via SSE to the recipient
      try {
        sseEventHub.sendToUser(recipientId.toString(), {
          type: "notification:created",
          entity: "notification",
          entityId: notification.id,
          recipientUserId: recipientId.toString(),
          notification: notification.toJSON(),
          timestamp: new Date().toISOString(),
        });
      } catch (sseErr) {
        console.warn("[NotificationService] SSE dispatch error:", sseErr);
      }

      // 4. Email delivery if email provider configured
      try {
        if (emailService.isConfigured() || process.env.NODE_ENV === "test") {
          const recipientUser = await User.findById(recipientId).select("email");
          if (recipientUser?.email) {
            await emailService.sendNotificationEmail(recipientUser.email, notification);
          }
        }
      } catch (emailErr) {
        console.warn("[NotificationService] Email delivery error:", emailErr);
      }

      return notification;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: unknown }).code === 11000
      ) {
        // Handled duplicate idempotencyKey gracefully
        if (params.idempotencyKey) {
          return await Notification.findOne({
            recipientUserId: params.recipientUserId,
            idempotencyKey: params.idempotencyKey,
          });
        }
      }
      console.error("[NotificationService] Failed to create notification:", error);
      return null;
    }
  }

  /**
   * Notifies both candidate and recruiter when an application is successfully submitted.
   */
  public async notifyApplicationCreated(params: {
    applicationId: string;
    candidateUserId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    recruiterUserId: string;
  }): Promise<void> {
    const { applicationId, candidateUserId, candidateName, jobId, jobTitle, recruiterUserId } =
      params;

    // 1. Candidate confirmation
    await this.createNotification({
      recipientUserId: candidateUserId,
      title: "Application Submitted",
      message: `Your application for "${jobTitle}" has been received and is being processed.`,
      type: "application_submitted",
      link: "/candidate?tab=applications",
      idempotencyKey: `app-submitted-${applicationId}`,
      metadata: { applicationId, jobId },
    });

    // 2. Recruiter notification
    await this.createNotification({
      recipientUserId: recruiterUserId,
      title: `New Application: ${candidateName}`,
      message: `${candidateName} applied for "${jobTitle}". Automatic ATS screening initiated.`,
      type: "application_received",
      link: `/recruiter?tab=pipeline&jobId=${jobId}&applicationId=${applicationId}`,
      idempotencyKey: `app-received-${applicationId}`,
      metadata: { applicationId, candidateUserId, jobId },
    });
  }

  /**
   * Notifies the recruiter when candidate resume screening finishes.
   */
  public async notifyScreeningResult(params: {
    applicationId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    recruiterUserId: string;
    score: number;
    recommendation: string;
    status: "completed" | "needs_review" | "failed";
  }): Promise<void> {
    const {
      applicationId,
      candidateName,
      jobId,
      jobTitle,
      recruiterUserId,
      score,
      recommendation,
      status,
    } = params;

    if (status === "completed") {
      const recLabel = recommendation.replace(/_/g, " ");
      await this.createNotification({
        recipientUserId: recruiterUserId,
        title: `Screening Completed: ${candidateName}`,
        message: `${candidateName} scored ${score}/100 (${recLabel}) for "${jobTitle}". Review results now.`,
        type: "screening_completed",
        link: `/recruiter?tab=pipeline&jobId=${jobId}&applicationId=${applicationId}`,
        idempotencyKey: `screening-complete-${applicationId}`,
        metadata: { applicationId, jobId, score, recommendation },
      });
    } else {
      await this.createNotification({
        recipientUserId: recruiterUserId,
        title: `Screening Needs Review: ${candidateName}`,
        message: `Automatic screening for ${candidateName} on "${jobTitle}" requires manual review.`,
        type: "screening_needs_review",
        link: `/recruiter?tab=pipeline&jobId=${jobId}&applicationId=${applicationId}`,
        idempotencyKey: `screening-review-${applicationId}`,
        metadata: { applicationId, jobId, status },
      });
    }
  }

  /**
   * Notifies candidate, recruiter, and interviewer when an interview is scheduled.
   */
  public async notifyInterviewScheduled(params: {
    interviewId: string;
    applicationId: string;
    candidateUserId: string;
    interviewerUserId?: string;
    recruiterUserId: string;
    jobTitle: string;
    scheduledAt: Date;
    meetingLink?: string | null;
  }): Promise<void> {
    const formattedDate = new Date(params.scheduledAt).toLocaleString();

    // 1. Candidate notification
    await this.createNotification({
      recipientUserId: params.candidateUserId,
      title: "Interview Scheduled",
      message: `Your interview for "${params.jobTitle}" has been scheduled for ${formattedDate}.`,
      type: "interview_scheduled",
      link: "/candidate?tab=interviews",
      metadata: { interviewId: params.interviewId, applicationId: params.applicationId },
    });

    // 2. Recruiter notification
    await this.createNotification({
      recipientUserId: params.recruiterUserId,
      title: "Interview Scheduled",
      message: `Interview scheduled for "${params.jobTitle}" on ${formattedDate}.`,
      type: "interview_scheduled",
      link: `/interviews?id=${params.interviewId}`,
      metadata: { interviewId: params.interviewId, applicationId: params.applicationId },
    });

    // 3. Interviewer notification (if different from recruiter)
    if (params.interviewerUserId && params.interviewerUserId !== params.recruiterUserId) {
      await this.createNotification({
        recipientUserId: params.interviewerUserId,
        title: "Interview Assignment",
        message: `You have been assigned to conduct an interview for "${params.jobTitle}" on ${formattedDate}.`,
        type: "interview_scheduled",
        link: `/interviews?id=${params.interviewId}`,
        metadata: { interviewId: params.interviewId, applicationId: params.applicationId },
      });
    }
  }

  /**
   * Notifies relevant parties when an application stage transitions.
   */
  public async notifyStageChanged(params: {
    applicationId: string;
    candidateUserId?: string;
    candidateName: string;
    recruiterUserId: string;
    jobTitle: string;
    fromStage: string;
    toStage: string;
  }): Promise<void> {
    const { applicationId, candidateUserId, jobTitle, toStage } = params;

    // Disclose milestone status updates to candidate when appropriate
    if (candidateUserId && (toStage === "Offer" || toStage === "Interview")) {
      await this.createNotification({
        recipientUserId: candidateUserId,
        title: `Application Update: ${toStage} Stage`,
        message: `Great news! Your application for "${jobTitle}" has advanced to the ${toStage} stage.`,
        type: "application_status",
        link: "/candidate?tab=applications",
        metadata: { applicationId, stage: toStage },
      });
    }
  }
}

export const notificationService = new NotificationService();
