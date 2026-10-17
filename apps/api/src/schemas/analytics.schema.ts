import { z } from "zod";

export const analyticsQuerySchema = z
  .object({
    from: z
      .string()
      .trim()
      .refine(
        (val) => !isNaN(new Date(val).getTime()),
        "Invalid 'from' date format. Provide a valid ISO-8601 date string"
      )
      .optional(),
    to: z
      .string()
      .trim()
      .refine(
        (val) => !isNaN(new Date(val).getTime()),
        "Invalid 'to' date format. Provide a valid ISO-8601 date string"
      )
      .optional(),
    period: z.enum(["7d", "30d", "90d", "all"]).optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        const fromDate = new Date(data.from);
        const toDate = new Date(data.to);
        return fromDate.getTime() <= toDate.getTime();
      }
      return true;
    },
    {
      message: "'from' date must be earlier than or equal to 'to' date",
      path: ["from"],
    }
  );

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

/**
 * Resolves date boundaries from query parameters into inclusive UTC Date objects.
 */
export function resolveDateRange(query: AnalyticsQuery): {
  fromDate?: Date;
  toDate?: Date;
  periodLabel: string;
} {
  const now = new Date();

  if (query.period === "7d") {
    const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { fromDate, toDate: now, periodLabel: "Last 7 Days" };
  }

  if (query.period === "30d") {
    const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { fromDate, toDate: now, periodLabel: "Last 30 Days" };
  }

  if (query.period === "90d") {
    const fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { fromDate, toDate: now, periodLabel: "Last 90 Days" };
  }

  if (query.period === "all") {
    return { fromDate: undefined, toDate: undefined, periodLabel: "All Time" };
  }

  if (query.from || query.to) {
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (query.from) {
      fromDate = new Date(query.from);
    }

    if (query.to) {
      toDate = new Date(query.to);
      // If date was specified as YYYY-MM-DD, make 'to' inclusive to the end of that day (23:59:59.999Z)
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
        toDate.setUTCHours(23, 59, 59, 999);
      }
    }

    return {
      fromDate,
      toDate,
      periodLabel: `${query.from || "Start"} to ${query.to || "Now"}`,
    };
  }

  return { fromDate: undefined, toDate: undefined, periodLabel: "All Time" };
}
