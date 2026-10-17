import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Interview } from "../models/interview.model.js";
import { Application } from "../models/application.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { googleCalendarService } from "../services/calendar/googleCalendarService.js";
import { AppError } from "../middleware/errorHandler.js";
import { normalizeRole } from "../models/user.model.js";

const scheduleInterviewSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  title: z.string().trim().min(2, "Title must be at least 2 characters").default("Candidate Interview"),
  scheduledStartTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid start time required"),
  scheduledEndTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid end time required"),
  timezone: z.string().default("UTC"),
  meetingType: z.enum(["google_meet", "manual_link", "in_person"]).default("google_meet"),
  manualMeetingLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
  interviewers: z.array(
    z.object({
      userId: z.string().optional(),
      name: z.string().trim().min(1),
      email: z.string().email(),
    })
  ).default([]),
});

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
    const candidateUserId = candidateUser ? candidateUser.id : req.user.id; // fallback if candidate not registered as user

    // Handle Google Calendar Meet creation or manual link
    let googleMeetLink: string | null = null;
    let googleEventId: string | null = null;

    if (validated.meetingType === "google_meet") {
      const calendarResult = await googleCalendarService.scheduleMeeting({
        title: `${validated.title} — ${candidate.name}`,
        description: `EarlyAI ATS Interview for ${job.title}.\nNotes: ${validated.notes || "None"}`,
        startTime,
        endTime,
        timeZone: validated.timezone,
        candidateEmail: candidate.email,
        candidateName: candidate.name,
        interviewerEmails: validated.interviewers.map((i) => i.email),
      });

      if (calendarResult.status === "confirmed" && calendarResult.meetLink) {
        googleMeetLink = calendarResult.meetLink;
        googleEventId = calendarResult.calendarEventId || null;
      } else if (validated.manualMeetingLink) {
        googleMeetLink = validated.manualMeetingLink;
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
      await Notification.create({
        recipientUserId: candidateUser.id,
        title: "Interview Scheduled",
        message: `An interview for ${job.title} has been scheduled for ${startTime.toUTCString()}.`,
        type: "interview_scheduled",
        link: `/candidate/interviews`,
        metadata: { interviewId: interviewDoc.id, jobId: job.id },
      });
    }

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
 */
export const getInterviewsForApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { applicationId } = req.params;
    const interviews = await Interview.find({ applicationId }).sort({ scheduledStartTime: 1 });

    res.status(200).json({
      success: true,
      data: {
        interviews: interviews.map((i) => i.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists the authenticated candidate's scheduled interviews.
 */
export const getMyInterviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const interviews = await Interview.find({ candidateUserId: req.user.id })
      .populate("jobId", "title department location")
      .sort({ scheduledStartTime: 1 });

    res.status(200).json({
      success: true,
      data: {
        interviews: interviews.map((i) => i.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancels a scheduled interview.
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

    interview.status = "cancelled";
    interview.cancellationReason = req.body.reason || "Cancelled by recruiter";
    await interview.save();

    // Notify candidate
    await Notification.create({
      recipientUserId: interview.candidateUserId,
      title: "Interview Cancelled",
      message: `Your interview scheduled for ${interview.scheduledStartTime.toUTCString()} has been cancelled.`,
      type: "interview_scheduled",
      link: `/candidate/interviews`,
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
