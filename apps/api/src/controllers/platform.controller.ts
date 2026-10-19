import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { User, ALL_USER_ROLES, normalizeRole } from "../models/user.model.js";
import { AIUsageRecord } from "../models/aiUsage.model.js";
import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { googleCalendarService } from "../services/calendar/googleCalendarService.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";
import { sseEventHub } from "../services/sse/sseEventHub.js";

const updateRoleSchema = z.object({
  role: z.enum(ALL_USER_ROLES),
});

/**
 * Lists all registered users and roles (Platform Manager only).
 */
export const listPlatformUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments({}),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: users.map((u) => u.toJSON()),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates a user's role (Platform Manager only).
 */
export const updatePlatformUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const validated = updateRoleSchema.parse(req.body);

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return next(new AppError("User not found", 404, "USER_NOT_FOUND"));
    }

    // Prevent demoting the last platform manager
    const currentCanonical = normalizeRole(targetUser.role);
    const targetCanonical = normalizeRole(validated.role);
    if (currentCanonical === "platform_manager" && targetCanonical !== "platform_manager") {
      const platformManagerCount = await User.countDocuments({
        role: { $in: ["admin", "platform_manager"] },
      });
      if (platformManagerCount <= 1) {
        return next(
          new AppError(
            "Cannot remove the last platform manager. Please appoint another platform manager first.",
            400,
            "CANNOT_DEMOTE_LAST_ADMIN"
          )
        );
      }
    }

    targetUser.role = validated.role;
    await targetUser.save();

    sseEventHub.broadcast({
      type: "user:updated",
      entity: "user",
      entityId: targetUser.id,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      data: {
        user: targetUser.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggregates AI provider usage metrics, token consumption, latency, and error rates.
 */
export const getAIUsageMetrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [totalCalls, successfulCalls, failedCalls, tokenStats, latencyStats, providerBreakdown] =
      await Promise.all([
        AIUsageRecord.countDocuments({}),
        AIUsageRecord.countDocuments({ success: true }),
        AIUsageRecord.countDocuments({ success: false }),
        AIUsageRecord.aggregate([
          {
            $group: {
              _id: null,
              totalInputTokens: { $sum: "$inputTokens" },
              totalOutputTokens: { $sum: "$outputTokens" },
            },
          },
        ]),
        AIUsageRecord.aggregate([
          { $match: { success: true } },
          {
            $group: {
              _id: null,
              avgLatencyMs: { $avg: "$latencyMs" },
              maxLatencyMs: { $max: "$latencyMs" },
            },
          },
        ]),
        AIUsageRecord.aggregate([
          {
            $group: {
              _id: "$provider",
              count: { $sum: 1 },
              successCount: {
                $sum: { $cond: ["$success", 1, 0] },
              },
            },
          },
        ]),
      ]);

    res.status(200).json({
      success: true,
      data: {
        totalCalls,
        successfulCalls,
        failedCalls,
        errorRate: totalCalls > 0 ? Number(((failedCalls / totalCalls) * 100).toFixed(2)) : 0,
        totalInputTokens: tokenStats[0]?.totalInputTokens || 0,
        totalOutputTokens: tokenStats[0]?.totalOutputTokens || 0,
        avgLatencyMs: Math.round(latencyStats[0]?.avgLatencyMs || 0),
        maxLatencyMs: latencyStats[0]?.maxLatencyMs || 0,
        providerBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns platform system integrations health and configuration status.
 */
export const getSystemIntegrationsHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isGoogleConfigured = googleCalendarService.isConfigured();
    const isGeminiConfigured = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
    const isGroqConfigured = Boolean(env.GROQ_API_KEY && env.GROQ_API_KEY.trim().length > 0);
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    const [activeJobs, totalApplications] = await Promise.all([
      Job.countDocuments({ status: "Open" }),
      Application.countDocuments({}),
    ]);

    res.status(200).json({
      success: true,
      data: {
        database: {
          status: dbStatus,
          name: mongoose.connection.name,
        },
        aiProviders: {
          primary: env.AI_PROVIDER,
          fallback: env.AI_FALLBACK_PROVIDER,
          gemini: { configured: isGeminiConfigured, model: env.GEMINI_MODEL },
          groq: { configured: isGroqConfigured, model: env.GROQ_MODEL },
          offlineFallback: { configured: true, model: "rule-based-v1" },
        },
        googleCalendar: {
          configured: isGoogleConfigured,
          conferenceIntegration: isGoogleConfigured ? "ready" : "pending_oauth_credentials",
        },
        overview: {
          activeJobs,
          totalApplications,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
