import crypto from "node:crypto";
import { env } from "../../config/env.js";

export interface CreateInterviewEventOptions {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  timeZone?: string;
  candidateEmail: string;
  candidateName: string;
  interviewerEmails: string[];
}

export interface CalendarEventResult {
  isConfigured: boolean;
  calendarEventId?: string;
  meetLink?: string;
  status: "confirmed" | "pending_credentials" | "manual_entry_required";
  notes?: string;
}

export class GoogleCalendarService {
  private clientId?: string;
  private clientSecret?: string;
  private redirectUri?: string;

  constructor() {
    this.clientId = env.GOOGLE_CLIENT_ID;
    this.clientSecret = env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = env.GOOGLE_REDIRECT_URI;
  }

  /**
   * Checks whether real Google OAuth2 credentials are configured on the server.
   */
  public isConfigured(): boolean {
    return Boolean(
      this.clientId &&
      this.clientSecret &&
      this.clientId.trim().length > 0 &&
      this.clientSecret.trim().length > 0
    );
  }

  /**
   * Schedules a Google Calendar event with conferenceDataVersion=1 to generate a unique Meet link.
   * If credentials are not configured, gracefully returns status indicating pending credentials.
   */
  public async scheduleMeeting(
    options: CreateInterviewEventOptions,
    accessToken?: string
  ): Promise<CalendarEventResult> {
    if (!this.isConfigured() || !accessToken) {
      return {
        isConfigured: false,
        status: "pending_credentials",
        notes: "Google OAuth credentials or user access token not configured. Manual meeting link entry is supported.",
      };
    }

    try {
      const requestId = crypto.randomUUID();
      const endpoint = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1";

      const eventBody = {
        summary: options.title,
        description: options.description,
        start: {
          dateTime: options.startTime.toISOString(),
          timeZone: options.timeZone || "UTC",
        },
        end: {
          dateTime: options.endTime.toISOString(),
          timeZone: options.timeZone || "UTC",
        },
        attendees: [
          { email: options.candidateEmail, displayName: options.candidateName },
          ...options.interviewerEmails.map((email) => ({ email })),
        ],
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(eventBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[GoogleCalendarService] Failed to create event (${response.status}):`, errorText);
        return {
          isConfigured: true,
          status: "manual_entry_required",
          notes: `Google Calendar API returned error (${response.status}). Meeting link may be entered manually.`,
        };
      }

      const eventData = (await response.json()) as {
        id: string;
        hangoutLink?: string;
        conferenceData?: {
          entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
        };
      };

      let meetLink = eventData.hangoutLink;
      if (!meetLink && eventData.conferenceData?.entryPoints) {
        const videoPoint = eventData.conferenceData.entryPoints.find((ep) => ep.entryPointType === "video");
        if (videoPoint?.uri) {
          meetLink = videoPoint.uri;
        }
      }

      return {
        isConfigured: true,
        calendarEventId: eventData.id,
        meetLink,
        status: meetLink ? "confirmed" : "manual_entry_required",
      };
    } catch (err) {
      console.error("[GoogleCalendarService] Exception creating meeting:", err);
      return {
        isConfigured: true,
        status: "manual_entry_required",
        notes: "Network exception communicating with Google Calendar. Meeting link may be entered manually.",
      };
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
