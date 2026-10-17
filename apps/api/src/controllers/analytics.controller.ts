import { Request, Response, NextFunction } from "express";
import { Candidate } from "../models/candidate.model.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { InterviewStageHistory } from "../models/stageHistory.model.js";
import { analyticsQuerySchema, resolveDateRange } from "../schemas/analytics.schema.js";

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
  // Check explicit stage history transitions
  if (app.history && app.history.length > 0) {
    for (const h of app.history) {
      if (h.toStage === targetStage || h.fromStage === targetStage) {
        return true;
      }
    }
  }

  // Check current stage forward hierarchy
  const targetIdx = STAGE_ORDER[targetStage];
  const currentIdx = STAGE_ORDER[app.currentStage];
  if (targetIdx !== undefined && currentIdx !== undefined && currentIdx >= targetIdx) {
    return true;
  }

  return false;
}

/**
 * GET /api/v1/analytics/overview
 * Also aliased at: GET /api/v1/dashboard/metrics
 *
 * Computes high-level recruitment metrics, stage distributions, funnel conversions,
 * candidate sourcing, and stage durations.
 */
export const getDashboardOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    const { fromDate, toDate, periodLabel } = resolveDateRange(query);

    // 1. Total Active Candidates (overall active talent pool)
    // 2. Open Positions (jobs currently Open and not archived)
    const [totalCandidates, openPositions] = await Promise.all([
      Candidate.countDocuments({ archivedAt: null }),
      Job.countDocuments({ status: "Open", archivedAt: null }),
    ]);

    // Build cohort filter for applications based on appliedAt date range
    const appMatch: Record<string, unknown> = {
      status: { $nin: ["Archived", "Withdrawn"] },
    };

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

    // Calculate stage-by-stage conversions and dropoffs
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

    // Resolved offer acceptance breakdown
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
