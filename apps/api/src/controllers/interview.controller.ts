import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Interview } from "../models/interview.model.js";
import { Application } from "../models/application.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { GoogleCalendarConnection } from "../models/googleCalendarConnection.model.js";
import { googleCalendarService } from "../services/calendar/googleCalendarService.js";
import { decryptToken } from "../utils/crypto.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";
import { normalizeRole } from "../models/user.model.js";
import { sseEventHub } from "../services/sse/sseEventHub.js";
import { notificationService } from "../services/notification/notificationService.js";

const scheduleInterviewSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  title: z.string().trim().min(2, "Title must be at least 2 characters").default("Candidate Interview"),
  scheduledStartTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid start time required"),
  scheduledEndTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid end time required"),
  timezone: z.string().default("UTC"),
  meetingType: z.enum(["google_meet", "manual_link", "in_person"]).default("google_meet"),
  manualMeetingLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
  interviewers: z
    .array(
      z.object({
        userId: z.string().optional(),
        name: z.string().trim().min(1),
        email: z.string().email(),
      })
    )
    .default([]),
});

const rescheduleInterviewSchema = z.object({
  scheduledStartTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid start time required"),
  scheduledEndTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid end time required"),
  timezone: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Resolves a fresh Google OAuth access token for a recruiter user.
 * Decrypts their stored refresh token using AES-256-GCM and calls Google token endpoint.
 */
async function getAccessTokenForUser(userId: string | mongoose.Types.ObjectId): Promise<string | null> {
  try {
    const connection = await GoogleCalendarConnection.findOne({ userId }).select(
      "+encryptedRefreshToken +iv +authTag"
    );

    if (connection && connection.encryptedRefreshToken && connection.iv && connection.authTag) {
      const refreshToken = decryptToken(connection.encryptedRefreshToken, connection.iv, connection.authTag);
      const refreshed = await googleCalendarService.refreshAccessToken(refreshToken);
      return refreshed.accessToken;
    }

    // Optional system-wide fallback token if individual recruiter OAuth is unlinked
    if (env.GOOGLE_CALENDAR_REFRESH_TOKEN && googleCalendarService.isConfigured()) {
      const refreshed = await googleCalendarService.refreshAccessToken(env.GOOGLE_CALENDAR_REFRESH_TOKEN);
      return refreshed.accessToken;
    }

    return null;
  } catch (err) {
    console.warn("[InterviewController] Unable to resolve valid Google access token:", err);
    return null;
  }
}

/**
 * Schedules an interview for a candidate application.
 */
export const scheduleInterview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const validated = scheduleInterviewSchema.parse(req.body);
    const startTime = new Date(validated.scheduledStartTime);
    const endTime = new Date(validated.scheduledEndTime);

    if (endTime <= startTime) {
      return next(new AppError("End time must be after start time", 400, "INVALID_TIME_RANGE"));
    }

    const application = await Application.findById(validated.applicationId);
    if (!application) {
      return next(new AppError("Application not found", 404, "APPLICATION_NOT_FOUND"));
    }

    const candidate = await Candidate.findById(application.candidateId);
    if (!candidate) {
      return next(new AppError("Candidate not found", 404, "CANDIDATE_NOT_FOUND"));
    }

    const job = await Job.findById(application.jobId);
    if (!job) {
      return next(new AppError("Job not found", 404, "JOB_NOT_FOUND"));
    }

    // Attempt to locate candidate's User account by email
    const candidateUser = await User.findOne({ email: candidate.email.toLowerCase() });
    const candidateUserId = candidateUser ? candidateUser.id : req.user.id;

    // Handle Google Calendar Meet creation or manual link
    let googleMeetLink: string | null = null;
    let googleEventId: string | null = null;

    if (validated.meetingType === "google_meet") {
      const accessToken = await getAccessTokenForUser(req.user.id);

      if (accessToken) {
        const calendarResult = await googleCalendarService.scheduleMeeting(
          {
            title: `${validated.title} — ${candidate.name}`,
            description: `EarlyAI ATS Interview for ${job.title}.\nCandidate: ${candidate.name} (${candidate.email})`,
            startTime,
            endTime,
            timeZone: validated.timezone,
            candidateEmail: candidate.email,
            candidateName: candidate.name,
            interviewerEmails: validated.interviewers.map((i) => i.email),
          },
          accessToken
        );

        if (calendarResult.status === "confirmed" && calendarResult.meetLink) {
          googleMeetLink = calendarResult.meetLink;
          googleEventId = calendarResult.calendarEventId || null;
        } else if (validated.manualMeetingLink) {
          googleMeetLink = validated.manualMeetingLink;
        } else {
          return next(
            new AppError(
              calendarResult.notes ||
                "Failed to generate Google Meet conference. Please connect your Google Calendar or provide a manual meeting link.",
              502,
              "GOOGLE_CALENDAR_ERROR"
            )
          );
        }
      } else if (validated.manualMeetingLink) {
        googleMeetLink = validated.manualMeetingLink;
      } else {
        return next(
          new AppError(
            "Google Calendar is not connected for your account. Please authorize Google Calendar in settings or provide a manual meeting link.",
            400,
            "CALENDAR_NOT_CONNECTED"
          )
        );
      }
    } else if (validated.meetingType === "manual_link") {
      googleMeetLink = validated.manualMeetingLink || null;
    }

    const interviewDoc = await Interview.create({
      applicationId: application.id,
      jobId: job.id,
      candidateUserId,
      candidateId: candidate.id,
      organizerId: req.user.id,
      interviewers: validated.interviewers.map((i) => ({
        userId: i.userId ? new mongoose.Types.ObjectId(i.userId) : undefined,
        name: i.name,
        email: i.email,
      })),
      title: validated.title,
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
      timezone: validated.timezone,
      status: "scheduled",
      googleCalendarEventId: googleEventId,
      googleMeetLink,
      meetingType: validated.meetingType,
      manualMeetingLink: validated.manualMeetingLink || null,
      notes: validated.notes || "",
    });

    // Notify candidate if user account exists
    if (candidateUser) {
      await notificationService.createNotification({
        recipientUserId: candidateUser.id,
        title: "Interview Scheduled",
        message: `An interview for ${job.title} has been scheduled for ${startTime.toUTCString()}.`,
        type: "interview_scheduled",
        link: `/candidate/interviews`,
        metadata: { interviewId: interviewDoc.id, jobId: job.id },
      });
    }

    sseEventHub.broadcast({
      type: "interview:scheduled",
      entity: "interview",
      entityId: interviewDoc.id,
      candidateUserId: candidateUserId.toString(),
      jobId: job.id,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        interview: interviewDoc.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves interviews for a specific application.
 * Sanitizes recruiter-only internal notes when accessed by candidates.
 */
export const getInterviewsForApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { applicationId } = req.params;
    const userRole = normalizeRole(req.user.role);

    if (userRole === "candidate") {
      const application = await Application.findById(applicationId);
      if (!application) {
        return next(new AppError("Application not found", 404, "APPLICATION_NOT_FOUND"));
      }
      const candidate = await Candidate.findById(application.candidateId);
      const isOwner =
        (req.user.candidateProfileId && req.user.candidateProfileId.toString() === application.candidateId.toString()) ||
        (candidate && candidate.email.toLowerCase() === req.user.email.toLowerCase()) ||
        (candidate && candidate.createdBy && candidate.createdBy.toString() === req.user.id);

      if (!isOwner) {
        return next(new AppError("You do not have permission to view interviews for this application", 403, "FORBIDDEN"));
      }
    }

    const interviews = await Interview.find({ applicationId }).sort({ scheduledStartTime: 1 });

    const sanitizedInterviews = interviews.map((i) => {
      const item = i.toJSON();
      if (userRole === "candidate") {
        delete item.notes;
        delete item.cancellationReason;
      }
      return item;
    });

    res.status(200).json({
      success: true,
      data: {
        interviews: sanitizedInterviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists the authenticated candidate's scheduled interviews.
 * Excludes recruiter-only notes to protect candidate privacy.
 */
export const getMyInterviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const interviews = await Interview.find({ candidateUserId: req.user.id })
      .populate("jobId", "title department location")
      .sort({ scheduledStartTime: 1 });

    const sanitized = interviews.map((i) => {
      const item = i.toJSON();
      delete item.notes;
      delete item.cancellationReason;
      return item;
    });

    res.status(200).json({
      success: true,
      data: {
        interviews: sanitized,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reschedules an existing interview and updates the synced Google Calendar event.
 */
export const rescheduleInterview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const userRole = normalizeRole(req.user.role);
    if (userRole !== "hiring_team" && userRole !== "platform_manager") {
      return next(new AppError("Only hiring team members can reschedule interviews", 403, "FORBIDDEN"));
    }

    const { id } = req.params;
    const interview = await Interview.findById(id);
    if (!interview) {
      return next(new AppError("Interview not found", 404, "INTERVIEW_NOT_FOUND"));
    }

    const validated = rescheduleInterviewSchema.parse(req.body);
    const startTime = new Date(validated.scheduledStartTime);
    const endTime = new Date(validated.scheduledEndTime);

    if (endTime <= startTime) {
      return next(new AppError("End time must be after start time", 400, "INVALID_TIME_RANGE"));
    }

    // Synchronize update with Google Calendar if event exists
    if (interview.googleCalendarEventId) {
      const accessToken = await getAccessTokenForUser(interview.organizerId);
      if (accessToken) {
        await googleCalendarService.updateMeeting(
          interview.googleCalendarEventId,
          {
            startTime,
            endTime,
            timeZone: validated.timezone || interview.timezone,
          },
          accessToken
        );
      }
    }

    interview.scheduledStartTime = startTime;
    interview.scheduledEndTime = endTime;
    if (validated.timezone) interview.timezone = validated.timezone;
    if (validated.notes) interview.notes = validated.notes;
    interview.status = "rescheduled";
    await interview.save();

    // Notify candidate
    await notificationService.createNotification({
      recipientUserId: interview.candidateUserId,
      title: "Interview Rescheduled",
      message: `Your interview for ${interview.title} has been rescheduled to ${startTime.toUTCString()}.`,
      type: "interview_rescheduled",
      link: `/candidate/interviews`,
      metadata: { interviewId: interview.id },
    });

    sseEventHub.broadcast({
      type: "interview:updated",
      entity: "interview",
      entityId: interview.id,
      candidateUserId: interview.candidateUserId.toString(),
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      data: {
        interview: interview.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancels a scheduled interview and removes/cancels the Google Calendar event.
 */
export const cancelInterview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { id } = req.params;
    const interview = await Interview.findById(id);

    if (!interview) {
      return next(new AppError("Interview not found", 404, "INTERVIEW_NOT_FOUND"));
    }

    const userRole = normalizeRole(req.user.role);
    if (userRole !== "hiring_team" && userRole !== "platform_manager") {
      return next(new AppError("Only hiring team members can cancel interviews", 403, "FORBIDDEN"));
    }

    // Delete or cancel the Google Calendar event if one was created
    if (interview.googleCalendarEventId) {
      const accessToken = await getAccessTokenForUser(interview.organizerId);
      if (accessToken) {
        await googleCalendarService.deleteMeeting(interview.googleCalendarEventId, accessToken);
      }
    }

    interview.status = "cancelled";
    interview.cancellationReason = req.body.reason || "Cancelled by recruiter";
    await interview.save();

    // Notify candidate
    await notificationService.createNotification({
      recipientUserId: interview.candidateUserId,
      title: "Interview Cancelled",
      message: `Your interview scheduled for ${interview.scheduledStartTime.toUTCString()} has been cancelled.`,
      type: "interview_cancelled",
      link: `/candidate/interviews`,
      metadata: { interviewId: interview.id },
    });

    sseEventHub.broadcast({
      type: "interview:updated",
      entity: "interview",
      entityId: interview.id,
      candidateUserId: interview.candidateUserId.toString(),
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      data: {
        interview: interview.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};
