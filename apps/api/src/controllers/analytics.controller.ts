import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Candidate } from "../models/candidate.model.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { InterviewStageHistory } from "../models/stageHistory.model.js";
import { ResumeFile } from "../models/resume.model.js";
import { AtsAnalysis } from "../models/atsAnalysis.model.js";
import { User, normalizeRole } from "../models/user.model.js";
import { Interview } from "../models/interview.model.js";
import { analyticsQuerySchema, resolveDateRange } from "../schemas/analytics.schema.js";
import { sseEventHub } from "../services/sse/sseEventHub.js";
import { AppError } from "../middleware/errorHandler.js";

const FORWARD_STAGES = ["Applied", "Screening", "Interview", "Offer", "Hired"] as const;
const STAGE_ORDER: Record<string, number> = {
  Applied: 0,
  Screening: 1,
  Interview: 2,
  Offer: 3,
  Hired: 4,
};

interface CohortApplicationDoc {
  _id: unknown;
  currentStage: string;
  source?: string;
  history?: Array<{
    fromStage?: string | null;
    toStage?: string;
  }>;
}

/**
 * Evaluates whether an application has reached or passed a specified hiring stage.
 */
function hasReachedStage(app: CohortApplicationDoc, targetStage: string): boolean {
  if (app.history && app.history.length > 0) {
    for (const h of app.history) {
      if (h.toStage === targetStage || h.fromStage === targetStage) {
        return true;
      }
    }
  }

  const targetIdx = STAGE_ORDER[targetStage];
  const currentIdx = STAGE_ORDER[app.currentStage];
  if (targetIdx !== undefined && currentIdx !== undefined && currentIdx >= targetIdx) {
    return true;
  }

  return false;
}

/**
 * Safe percentage change calculation between current and previous values.
 * Returns null if previous is 0 or undefined, indicating insufficient history.
 */
function calculatePercentageChange(
  current: number,
  previous: number | null | undefined
): {
  percentageChange: number | null;
  direction: "up" | "down" | "neutral";
  previous: number | null;
} {
  if (previous === null || previous === undefined) {
    return { percentageChange: null, direction: "neutral", previous: null };
  }
  if (previous === 0) {
    if (current === 0) {
      return { percentageChange: 0, direction: "neutral", previous: 0 };
    }
    return { percentageChange: null, direction: "up", previous: 0 };
  }

  const diff = current - previous;
  const pct = Number(((diff / previous) * 100).toFixed(1));
  const direction: "up" | "down" | "neutral" =
    pct > 0 ? "up" : pct < 0 ? "down" : "neutral";

  return { percentageChange: pct, direction, previous };
}

/**
 * GET /api/v1/analytics/overview
 * Also aliased at: GET /api/v1/dashboard/metrics
 *
 * Computes high-level recruitment metrics, period-over-period trends, stage distributions,
 * funnel conversions, time-to-hire, job comparisons, top skills, and score distributions.
 */
export const getDashboardOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    const { fromDate, toDate, periodLabel, previousPeriod } = resolveDateRange(query);

    // Filter by specific job if provided
    const jobFilter: Record<string, unknown> = {};
    if (query.jobId) {
      if (!mongoose.Types.ObjectId.isValid(query.jobId)) {
        return next(new AppError("Invalid jobId format", 422, "VALIDATION_ERROR"));
      }
      jobFilter._id = new mongoose.Types.ObjectId(query.jobId);
    }

    // 1. Total Active Candidates & Open Positions
    const [totalCandidates, openPositions] = await Promise.all([
      Candidate.countDocuments({ archivedAt: null }),
      Job.countDocuments({ status: "Open", archivedAt: null, ...jobFilter }),
    ]);

    // Build cohort filter for applications based on appliedAt date range
    const appMatch: Record<string, unknown> = {
      status: { $nin: ["Archived", "Withdrawn"] },
    };

    if (query.jobId) {
      appMatch.jobId = new mongoose.Types.ObjectId(query.jobId);
    }

    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {};
      if (fromDate) dateFilter.$gte = fromDate;
      if (toDate) dateFilter.$lte = toDate;
      appMatch.appliedAt = dateFilter;
    }

    // 3 & 4. Distinct Hired & Rejected Candidates in cohort
    const [hiredCandidateIds, rejectedCandidateIds] = await Promise.all([
      Application.distinct("candidateId", {
        ...appMatch,
        currentStage: "Hired",
      }),
      Application.distinct("candidateId", {
        ...appMatch,
        currentStage: "Rejected",
      }),
    ]);

    const hiredCandidates = hiredCandidateIds.length;
    const rejectedCandidates = rejectedCandidateIds.length;

    // 5. Applications by Current Stage Distribution
    const stageAggregation = await Application.aggregate([
      { $match: appMatch },
      {
        $group: {
          _id: "$currentStage",
          count: { $sum: 1 },
        },
      },
    ]);

    const applicationsByStage: Record<string, number> = {
      Applied: 0,
      Screening: 0,
      Interview: 0,
      Offer: 0,
      Hired: 0,
      Rejected: 0,
    };

    stageAggregation.forEach((item) => {
      if (applicationsByStage[item._id] !== undefined) {
        applicationsByStage[item._id] = item.count;
      }
    });

    // 6. Cohort Applications with History & Sourcing for Funnel Calculation
    const cohortApplications: CohortApplicationDoc[] = await Application.aggregate([
      { $match: appMatch },
      {
        $lookup: {
          from: "stagehistories",
          localField: "_id",
          foreignField: "applicationId",
          as: "history",
        },
      },
      {
        $lookup: {
          from: "candidates",
          localField: "candidateId",
          foreignField: "_id",
          as: "cand",
        },
      },
      {
        $project: {
          _id: 1,
          candidateId: 1,
          currentStage: 1,
          source: {
            $ifNull: [
              "$source",
              { $arrayElemAt: ["$cand.source", 0] },
              "Other",
            ],
          },
          history: {
            $map: {
              input: "$history",
              as: "h",
              in: {
                fromStage: "$$h.fromStage",
                toStage: "$$h.toStage",
              },
            },
          },
        },
      },
    ]);

    const totalCohortApplications = cohortApplications.length;

    // Stage progression counts for conversion rates
    const reachedScreening = cohortApplications.filter((app) =>
      hasReachedStage(app, "Screening")
    ).length;
    const reachedInterview = cohortApplications.filter((app) =>
      hasReachedStage(app, "Interview")
    ).length;

    // Screening Conversion Rate: reachedScreening / totalCohort
    const screeningRate =
      totalCohortApplications > 0
        ? Number((reachedScreening / totalCohortApplications).toFixed(4))
        : null;

    // Interview Conversion Rate: reachedInterview / reachedScreening
    const interviewRate =
      reachedScreening > 0
        ? Number((reachedInterview / reachedScreening).toFixed(4))
        : null;

    // Offer Acceptance Rate:
    // Applications transitioned from Offer to Hired / (transitions Offer->Hired + transitions Offer->Rejected)
    let hiredFromOffer = 0;
    let rejectedFromOffer = 0;

    cohortApplications.forEach((app) => {
      if (app.history && app.history.length > 0) {
        for (const h of app.history) {
          if (h.fromStage === "Offer" && h.toStage === "Hired") {
            hiredFromOffer++;
          } else if (h.fromStage === "Offer" && h.toStage === "Rejected") {
            rejectedFromOffer++;
          }
        }
      }
    });

    const resolvedOffers = hiredFromOffer + rejectedFromOffer;
    const offerAcceptanceRate =
      resolvedOffers > 0
        ? Number((hiredFromOffer / resolvedOffers).toFixed(4))
        : null;

    // 7. Sourcing Distribution
    const sourceCountMap: Record<string, number> = {};
    cohortApplications.forEach((app) => {
      const src = app.source || "Other";
      sourceCountMap[src] = (sourceCountMap[src] || 0) + 1;
    });

    const sourcing = Object.entries(sourceCountMap)
      .map(([source, count]) => ({
        source,
        count,
        percentage:
          totalCohortApplications > 0
            ? Number(((count / totalCohortApplications) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 8. Average Completed Time in Stage (ms)
    const cohortAppIds = cohortApplications.map((app) => app._id);
    const averageTimeInStageMs: Record<string, number | null> = {
      Applied: null,
      Screening: null,
      Interview: null,
      Offer: null,
    };

    if (cohortAppIds.length > 0) {
      const stageDurations = await InterviewStageHistory.aggregate([
        {
          $match: {
            applicationId: { $in: cohortAppIds },
            fromStage: { $in: ["Applied", "Screening", "Interview", "Offer"] },
            durationMsFromPreviousStage: { $ne: null, $gte: 0 },
          },
        },
        {
          $group: {
            _id: "$fromStage",
            avgDuration: { $avg: "$durationMsFromPreviousStage" },
            count: { $sum: 1 },
          },
        },
      ]);

      stageDurations.forEach((sd) => {
        if (averageTimeInStageMs[sd._id] !== undefined && sd.count > 0) {
          averageTimeInStageMs[sd._id] = Math.round(sd.avgDuration);
        }
      });
    }

    // 9. Period-over-Period Trend Comparisons
    let previousPeriodStats: {
      activeApplications: number;
      hiredCandidates: number;
    } | null = null;

    if (previousPeriod) {
      const prevAppMatch: Record<string, unknown> = {
        status: { $nin: ["Archived", "Withdrawn"] },
        appliedAt: {
          $gte: previousPeriod.fromDate,
          $lte: previousPeriod.toDate,
        },
      };
      if (query.jobId) {
        prevAppMatch.jobId = new mongoose.Types.ObjectId(query.jobId);
      }

      const [prevApps, prevHired] = await Promise.all([
        Application.countDocuments(prevAppMatch),
        Application.distinct("candidateId", {
          ...prevAppMatch,
          currentStage: "Hired",
        }),
      ]);

      previousPeriodStats = {
        activeApplications: prevApps,
        hiredCandidates: prevHired.length,
      };
    }

    const trends = {
      activeApplications: calculatePercentageChange(
        totalCohortApplications,
        previousPeriodStats?.activeApplications
      ),
      hiredCandidates: calculatePercentageChange(
        hiredCandidates,
        previousPeriodStats?.hiredCandidates
      ),
    };

    // 10. Average Time to Hire (days & ms from appliedAt to hiredAt)
    const timeToHireAgg = await Application.aggregate([
      {
        $match: {
          ...appMatch,
          currentStage: "Hired",
          hiredAt: { $ne: null },
          appliedAt: { $ne: null },
        },
      },
      {
        $project: {
          durationMs: { $subtract: ["$hiredAt", "$appliedAt"] },
        },
      },
      {
        $match: {
          durationMs: { $gte: 0 },
        },
      },
      {
        $group: {
          _id: null,
          avgDurationMs: { $avg: "$durationMs" },
          count: { $sum: 1 },
        },
      },
    ]);

    const timeToHire = {
      averageMs: timeToHireAgg.length > 0 ? Math.round(timeToHireAgg[0].avgDurationMs) : null,
      averageDays:
        timeToHireAgg.length > 0
          ? Number((timeToHireAgg[0].avgDurationMs / (24 * 60 * 60 * 1000)).toFixed(1))
          : null,
      hiredCount: timeToHireAgg.length > 0 ? timeToHireAgg[0].count : 0,
    };

    // 11. Application Volume Trend Over Time Series (Daily/Weekly/Monthly)
    const isAllTime = query.period === "all" || (!query.from && !query.to && !query.period);
    const intervalFormat = isAllTime ? "%Y-%m" : "%Y-%m-%d";

    const timeSeriesAgg = await Application.aggregate([
      { $match: appMatch },
      {
        $group: {
          _id: { $dateToString: { format: intervalFormat, date: "$appliedAt" } },
          applications: { $sum: 1 },
          screenings: {
            $sum: {
              $cond: [
                { $in: ["$currentStage", ["Screening", "Interview", "Offer", "Hired"]] },
                1,
                0,
              ],
            },
          },
          interviews: {
            $sum: {
              $cond: [
                { $in: ["$currentStage", ["Interview", "Offer", "Hired"]] },
                1,
                0,
              ],
            },
          },
          hires: {
            $sum: { $cond: [{ $eq: ["$currentStage", "Hired"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const applicationTrends = timeSeriesAgg.map((item) => {
      let label = item._id;
      if (item._id && item._id.includes("-")) {
        const parts = item._id.split("-");
        if (parts.length === 3) {
          const d = new Date(item._id);
          label = isNaN(d.getTime()) ? item._id : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        } else if (parts.length === 2) {
          const d = new Date(`${item._id}-01`);
          label = isNaN(d.getTime()) ? item._id : d.toLocaleDateString("en-US", { month: "short" });
        }
      }
      return {
        date: item._id,
        label,
        applications: item.applications,
        screenings: item.screenings,
        interviews: item.interviews,
        hires: item.hires,
      };
    });

    // 12. Top Skills Detected from Candidate Profiles & ATS Analysis
    const cohortCandidateIds = cohortApplications
      .map((a) => (a as unknown as { candidateId?: mongoose.Types.ObjectId }).candidateId)
      .filter(Boolean);

    let topSkills: Array<{ skill: string; count: number; percentage: number }> = [];

    if (cohortCandidateIds.length > 0) {
      const skillsAgg = await Candidate.aggregate([
        { $match: { _id: { $in: cohortCandidateIds }, archivedAt: null } },
        { $unwind: "$skills" },
        {
          $group: {
            _id: { $trim: { input: "$skills" } },
            count: { $sum: 1 },
          },
        },
        { $match: { _id: { $ne: "" } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]);

      const totalSkillOccurrences = skillsAgg.reduce((acc, curr) => acc + curr.count, 0);

      topSkills = skillsAgg.map((item) => ({
        skill: item._id,
        count: item.count,
        percentage:
          totalSkillOccurrences > 0
            ? Number(((item.count / totalSkillOccurrences) * 100).toFixed(1))
            : 0,
      }));
    }

    // Fallback: If candidate skills empty, extract from ATS snapshots
    if (topSkills.length === 0 && cohortAppIds.length > 0) {
      const atsSkillsAgg = await Application.aggregate([
        {
          $match: {
            _id: { $in: cohortAppIds },
            "atsSnapshot.matchedSkills.0": { $exists: true },
          },
        },
        { $unwind: "$atsSnapshot.matchedSkills" },
        {
          $group: {
            _id: { $trim: { input: "$atsSnapshot.matchedSkills" } },
            count: { $sum: 1 },
          },
        },
        { $match: { _id: { $ne: "" } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]);

      const totalSkillOccurrences = atsSkillsAgg.reduce((acc, curr) => acc + curr.count, 0);
      topSkills = atsSkillsAgg.map((item) => ({
        skill: item._id,
        count: item.count,
        percentage:
          totalSkillOccurrences > 0
            ? Number(((item.count / totalSkillOccurrences) * 100).toFixed(1))
            : 0,
      }));
    }

    // 13. Real ATS Score Distribution Histogram (0-40, 41-60, 61-80, 81-100)
    const scoreBuckets = [
      { range: "0-40", min: 0, max: 40, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "81-100", min: 81, max: 100, count: 0 },
    ];

    const scoredApps = await Application.aggregate([
      {
        $match: {
          ...appMatch,
          "atsSnapshot.overallScore": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lte: ["$atsSnapshot.overallScore", 40] }, then: "0-40" },
                { case: { $lte: ["$atsSnapshot.overallScore", 60] }, then: "41-60" },
                { case: { $lte: ["$atsSnapshot.overallScore", 80] }, then: "61-80" },
                { case: { $gte: ["$atsSnapshot.overallScore", 81] }, then: "81-100" },
              ],
              default: "41-60",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const scoredAppsCount = scoredApps.reduce((acc, curr) => acc + curr.count, 0);

    const scoreDistribution = scoreBuckets.map((bucket) => {
      const match = scoredApps.find((s) => s._id === bucket.range);
      const count = match ? match.count : 0;
      return {
        range: bucket.range,
        count,
        percentage:
          scoredAppsCount > 0
            ? Number(((count / scoredAppsCount) * 100).toFixed(1))
            : 0,
      };
    });

    // 14. Job Performance Comparison Breakdown
    const jobPerformanceAgg = await Application.aggregate([
      { $match: appMatch },
      {
        $group: {
          _id: "$jobId",
          applicationsCount: { $sum: 1 },
          screeningCount: {
            $sum: {
              $cond: [
                { $in: ["$currentStage", ["Screening", "Interview", "Offer", "Hired"]] },
                1,
                0,
              ],
            },
          },
          interviewCount: {
            $sum: {
              $cond: [
                { $in: ["$currentStage", ["Interview", "Offer", "Hired"]] },
                1,
                0,
              ],
            },
          },
          hiredCount: {
            $sum: { $cond: [{ $eq: ["$currentStage", "Hired"] }, 1, 0] },
          },
          avgScore: { $avg: "$atsSnapshot.overallScore" },
        },
      },
      {
        $lookup: {
          from: "jobs",
          localField: "_id",
          foreignField: "_id",
          as: "jobInfo",
        },
      },
      { $unwind: { path: "$jobInfo", preserveNullAndEmptyArrays: true } },
      { $sort: { applicationsCount: -1 } },
      { $limit: 8 },
    ]);

    const jobPerformance = jobPerformanceAgg.map((item) => ({
      jobId: item._id?.toString() || "",
      title: item.jobInfo?.title || "General Role",
      department: item.jobInfo?.department || "Operations",
      status: item.jobInfo?.status || "Open",
      applicationsCount: item.applicationsCount,
      screeningCount: item.screeningCount,
      interviewCount: item.interviewCount,
      hiredCount: item.hiredCount,
      avgScore: item.avgScore !== null && item.avgScore !== undefined ? Math.round(item.avgScore) : null,
    }));

    // 15. Real Recent Resumes with verified ATS Scores
    const recentApplications = await Application.find(appMatch)
      .sort({ appliedAt: -1, createdAt: -1 })
      .limit(6)
      .populate("candidateId", "name fullName email resumeUrl")
      .populate("jobId", "title department")
      .populate("resumeId", "originalFilename fileSizeBytes parsingStatus");

    const recentResumes = recentApplications.map((app) => {
      const cand = app.candidateId as unknown as {
        name?: string;
        fullName?: string;
        resumeUrl?: string;
        _id?: { toString(): string };
      };
      const job = app.jobId as unknown as { title?: string };
      const resume = app.resumeId as unknown as {
        originalFilename?: string;
        parsingStatus?: string;
        _id?: { toString(): string };
      };

      const candName = cand?.fullName || cand?.name || "Candidate";
      const resumeFile =
        resume?.originalFilename ||
        `${candName.toLowerCase().replace(/\s+/g, "_")}_resume.pdf`;

      return {
        id: app.id,
        applicationId: app.id,
        candidateId: cand?._id?.toString() || "",
        candidateName: candName,
        jobTitle: job?.title || "Role Opening",
        filename: resumeFile,
        date: app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "Recently",
        score: app.atsSnapshot?.overallScore ?? null,
        status:
          app.atsSnapshot?.status === "completed" || app.atsSnapshot?.status === "dual_complete"
            ? ("completed" as const)
            : ("pending" as const),
        stage: app.currentStage || app.stage || "Applied",
        downloadUrl: cand?.resumeUrl || undefined,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalCandidates,
        openPositions,
        hiredCandidates,
        rejectedCandidates,
        applicationsByStage,
        screeningConversionRate: screeningRate,
        interviewConversionRate: interviewRate,
        offerAcceptanceRate,
        averageTimeInStageMs,
        totals: {
          totalCandidates,
          openPositions,
          hiredCandidates,
          rejectedCandidates,
          activeApplications: totalCohortApplications,
        },
        conversion: {
          screeningRate,
          interviewRate,
          offerAcceptanceRate,
          offerToHireRate: offerAcceptanceRate,
        },
        sourcing,
        period: {
          from: fromDate ? fromDate.toISOString() : null,
          to: toDate ? toDate.toISOString() : null,
          label: periodLabel,
        },
        // Enhanced Analytics Visualization Fields
        trends,
        timeToHire,
        applicationTrends,
        topSkills,
        scoreDistribution,
        jobPerformance,
        recentResumes,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/funnel
 *
 * Returns detailed conversion and dropoff rates across each step of the hiring pipeline.
 */
export const getRecruitmentFunnel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    const { fromDate, toDate, periodLabel } = resolveDateRange(query);

    const appMatch: Record<string, unknown> = {
      status: { $nin: ["Archived", "Withdrawn"] },
    };

    if (query.jobId) {
      if (!mongoose.Types.ObjectId.isValid(query.jobId)) {
        return next(new AppError("Invalid jobId format", 422, "VALIDATION_ERROR"));
      }
      appMatch.jobId = new mongoose.Types.ObjectId(query.jobId);
    }

    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {};
      if (fromDate) dateFilter.$gte = fromDate;
      if (toDate) dateFilter.$lte = toDate;
      appMatch.appliedAt = dateFilter;
    }

    const cohortApplications: CohortApplicationDoc[] = await Application.aggregate([
      { $match: appMatch },
      {
        $lookup: {
          from: "stagehistories",
          localField: "_id",
          foreignField: "applicationId",
          as: "history",
        },
      },
      {
        $project: {
          _id: 1,
          currentStage: 1,
          history: {
            $map: {
              input: "$history",
              as: "h",
              in: {
                fromStage: "$$h.fromStage",
                toStage: "$$h.toStage",
              },
            },
          },
        },
      },
    ]);

    const totalCohortApplications = cohortApplications.length;

    const reachedCounts = {
      Applied: totalCohortApplications,
      Screening: cohortApplications.filter((a) => hasReachedStage(a, "Screening")).length,
      Interview: cohortApplications.filter((a) => hasReachedStage(a, "Interview")).length,
      Offer: cohortApplications.filter((a) => hasReachedStage(a, "Offer")).length,
      Hired: cohortApplications.filter((a) => hasReachedStage(a, "Hired")).length,
    };

    const stages = FORWARD_STAGES.map((stage, idx) => {
      const count = reachedCounts[stage];
      let conversionRate: number | null = null;
      let dropoffRate: number | null = null;

      if (idx === 0) {
        conversionRate = totalCohortApplications > 0 ? 1.0 : null;
        dropoffRate = totalCohortApplications > 0 ? 0.0 : null;
      } else {
        const prevStage = FORWARD_STAGES[idx - 1];
        const prevCount = reachedCounts[prevStage];
        if (prevCount > 0) {
          conversionRate = Number((count / prevCount).toFixed(4));
          dropoffRate = Number((1 - conversionRate).toFixed(4));
        }
      }

      return {
        stage,
        count,
        conversionRate,
        dropoffRate,
      };
    });

    let hiredFromOffer = 0;
    let rejectedFromOffer = 0;

    cohortApplications.forEach((app) => {
      if (app.history) {
        for (const h of app.history) {
          if (h.fromStage === "Offer" && h.toStage === "Hired") hiredFromOffer++;
          else if (h.fromStage === "Offer" && h.toStage === "Rejected") rejectedFromOffer++;
        }
      }
    });

    const resolvedOffers = hiredFromOffer + rejectedFromOffer;
    const offerRate =
      resolvedOffers > 0 ? Number((hiredFromOffer / resolvedOffers).toFixed(4)) : null;

    res.status(200).json({
      success: true,
      data: {
        totalCohortApplications,
        stages,
        offerAcceptance: {
          resolvedOffers,
          accepted: hiredFromOffer,
          rejected: rejectedFromOffer,
          rate: offerRate,
        },
        period: {
          from: fromDate ? fromDate.toISOString() : null,
          to: toDate ? toDate.toISOString() : null,
          label: periodLabel,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/platform
 *
 * Aggregates enterprise platform governance metrics for platform managers.
 * Computes user distribution, resume parsing health, platform-wide ATS scores,
 * and job stage statistics.
 */
export const getPlatformAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      usersByRoleAgg,
      totalUsers,
      resumeHealthAgg,
      atsScoreStats,
      jobsByStatusAgg,
      totalApplications,
    ] = await Promise.all([
      // 1. User roles distribution
      User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ]),
      User.countDocuments({}),
      // 2. Resume parsing status distribution
      ResumeFile.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$parsingStatus",
            count: { $sum: 1 },
          },
        },
      ]),
      // 3. ATS Analysis Platform Metrics
      AtsAnalysis.aggregate([
        {
          $group: {
            _id: null,
            totalAnalyses: { $sum: 1 },
            avgScore: { $avg: "$overallScore" },
            avgLatencyMs: { $avg: "$latencyMs" },
          },
        },
      ]),
      // 4. Jobs by status
      Job.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Application.countDocuments({ status: { $ne: "Archived" } }),
    ]);

    // Roles formatting
    const userRoleCounts: Record<string, number> = {
      candidate: 0,
      hiring_team: 0,
      platform_manager: 0,
      recruiter: 0,
      admin: 0,
    };
    usersByRoleAgg.forEach((r) => {
      userRoleCounts[r._id] = r.count;
    });

    const rolesDistribution = Object.entries(userRoleCounts).map(([role, count]) => ({
      role,
      count,
      percentage: totalUsers > 0 ? Number(((count / totalUsers) * 100).toFixed(1)) : 0,
    }));

    // Resume processing health
    const parsingCounts: Record<string, number> = {
      completed: 0,
      pending: 0,
      failed: 0,
    };
    let totalResumes = 0;
    resumeHealthAgg.forEach((r) => {
      if (parsingCounts[r._id] !== undefined) {
        parsingCounts[r._id] = r.count;
      }
      totalResumes += r.count;
    });

    const resumeSuccessRate =
      totalResumes > 0
        ? Number(((parsingCounts.completed / totalResumes) * 100).toFixed(1))
        : 100;

    // Jobs breakdown
    const jobStatusCounts: Record<string, number> = {
      Open: 0,
      Paused: 0,
      Closed: 0,
      Archived: 0,
    };
    let totalJobs = 0;
    jobsByStatusAgg.forEach((j) => {
      if (jobStatusCounts[j._id] !== undefined) {
        jobStatusCounts[j._id] = j.count;
      }
      totalJobs += j.count;
    });

    const atsStats = atsScoreStats[0] || {
      totalAnalyses: 0,
      avgScore: 0,
      avgLatencyMs: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          distribution: rolesDistribution,
          assignedUsers: totalUsers,
          activeRolesCount: Object.values(userRoleCounts).filter((c) => c > 0).length,
        },
        resumes: {
          total: totalResumes,
          counts: parsingCounts,
          successRate: resumeSuccessRate,
        },
        ats: {
          totalAnalyses: atsStats.totalAnalyses || 0,
          averageScore: Math.round(atsStats.avgScore || 0),
          averageLatencyMs: Math.round(atsStats.avgLatencyMs || 0),
        },
        jobs: {
          total: totalJobs,
          statusCounts: jobStatusCounts,
          openJobs: jobStatusCounts.Open || 0,
        },
        platform: {
          totalApplications,
          activeSseConnections: sseEventHub.getConnectedClientCount(),
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/candidate
 *
 * Returns personal analytics strictly scoped to the authenticated candidate.
 * Guarantees zero data leakage across candidate boundaries.
 */
export const getCandidateAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const candidateUserId = req.user._id;

    // Resolve matching candidate profiles
    const [matchingCandidates, userResumes] = await Promise.all([
      Candidate.find({
        $or: [
          { email: req.user.email.toLowerCase() },
          { createdBy: candidateUserId },
        ],
      }).select("_id"),
      ResumeFile.find({
        candidateUserId,
        isDeleted: false,
      }).select("_id originalFilename parsingStatus createdAt"),
    ]);

    const candidateIds = matchingCandidates.map((c) => c._id);

    // Applications submitted by candidate
    const applications = await Application.find({
      $or: [
        { candidateId: { $in: candidateIds } },
        { createdBy: candidateUserId },
      ],
      status: { $ne: "Archived" },
    })
      .sort({ appliedAt: -1 })
      .populate("jobId", "title department location");

    const totalApplications = applications.length;
    const stageDistribution: Record<string, number> = {
      Applied: 0,
      Screening: 0,
      Interview: 0,
      Offer: 0,
      Hired: 0,
      Rejected: 0,
    };

    applications.forEach((app) => {
      const stage = app.currentStage || app.stage || "Applied";
      if (stageDistribution[stage] !== undefined) {
        stageDistribution[stage]++;
      }
    });

    // Scheduled interviews for this candidate
    const scheduledInterviews = await Interview.countDocuments({
      candidateUserId,
      status: "scheduled",
    });

    // Real ATS match score average
    const scores = applications
      .map((a) => a.atsSnapshot?.overallScore)
      .filter((s): s is number => typeof s === "number" && !isNaN(s));

    const avgAtsScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    res.status(200).json({
      success: true,
      data: {
        totalApplications,
        activeApplications:
          totalApplications - (stageDistribution.Hired + stageDistribution.Rejected),
        stageDistribution,
        scheduledInterviews,
        resumesCount: userResumes.length,
        averageAtsScore: avgAtsScore,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics/events
 *
 * Establishes an authenticated Server-Sent Events (SSE) stream for live dashboard updates.
 */
export const streamAnalyticsEvents = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required for live stream", 401, "UNAUTHENTICATED"));
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.flushHeaders?.();

    const clientId = `${req.user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const canonicalRole = normalizeRole(req.user.role);

    sseEventHub.registerClient({
      id: clientId,
      userId: req.user.id,
      role: req.user.role,
      canonicalRole,
      res,
    });
  } catch (error) {
    next(error);
  }
};
