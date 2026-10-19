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

export interface UpdateInterviewEventOptions {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  timeZone?: string;
  candidateEmail?: string;
  candidateName?: string;
  interviewerEmails?: string[];
}

export interface CalendarEventResult {
  isConfigured: boolean;
  calendarEventId?: string;
  meetLink?: string;
  status: "confirmed" | "pending_credentials" | "manual_entry_required";
  notes?: string;
}

export class GoogleCalendarService {
  public get clientId(): string | undefined {
    return env.GOOGLE_CLIENT_ID;
  }

  public get clientSecret(): string | undefined {
    return env.GOOGLE_CLIENT_SECRET;
  }

  public get redirectUri(): string | undefined {
    return env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/v1/auth/google/callback";
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
   * Generates the Google OAuth 2.0 authorization URL for calendar events scope.
   */
  public generateAuthUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new Error("Google OAuth credentials are not configured on this server");
    }

    const redirectUri = this.redirectUri || "http://localhost:5000/api/v1/auth/google/callback";
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges an authorization code for access and refresh tokens.
   */
  public async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    scope?: string;
    expiresIn: number;
    idToken?: string;
  }> {
    if (!this.isConfigured()) {
      throw new Error("Google OAuth credentials are not configured on this server");
    }

    const redirectUri = this.redirectUri || "http://localhost:5000/api/v1/auth/google/callback";
    const body = new URLSearchParams({
      code,
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google token exchange failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      scope?: string;
      expires_in: number;
      id_token?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scope: data.scope,
      expiresIn: data.expires_in,
      idToken: data.id_token,
    };
  }

  /**
   * Refreshes an expired access token using the stored refresh token.
   */
  public async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
    scope?: string;
  }> {
    if (!this.isConfigured()) {
      throw new Error("Google OAuth credentials are not configured on this server");
    }

    const body = new URLSearchParams({
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google token refresh failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      scope: data.scope,
    };
  }

  /**
   * Fetches Google profile information (email) using an active access token.
   */
  public async getGoogleUserInfo(accessToken: string): Promise<{ email?: string; name?: string }> {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return {};
      const data = (await response.json()) as { email?: string; name?: string };
      return { email: data.email, name: data.name };
    } catch {
      return {};
    }
  }

  /**
   * Revokes an access or refresh token when a recruiter disconnects their Google account.
   */
  public async revokeToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Schedules a Google Calendar event with conferenceDataVersion=1 to generate a unique Meet link.
   * If credentials or access token are missing, gracefully returns status indicating pending credentials.
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

      const validInterviewers = (options.interviewerEmails || []).filter(
        (email) => typeof email === "string" && email.includes("@")
      );

      const attendees = [
        ...(options.candidateEmail && options.candidateEmail.includes("@")
          ? [{ email: options.candidateEmail, displayName: options.candidateName }]
          : []),
        ...validInterviewers.map((email) => ({ email })),
      ];

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
        attendees,
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
          createRequest?: {
            status?: { statusCode?: string };
          };
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
        notes: meetLink ? undefined : "Calendar event created, but Meet conference details were not generated by Google.",
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

  /**
   * Updates an existing Google Calendar event for rescheduling without creating duplicate events.
   */
  public async updateMeeting(
    calendarEventId: string,
    options: UpdateInterviewEventOptions,
    accessToken?: string
  ): Promise<CalendarEventResult> {
    if (!this.isConfigured() || !accessToken) {
      return {
        isConfigured: false,
        status: "pending_credentials",
        notes: "Google OAuth credentials or user access token not configured.",
      };
    }

    try {
      const endpoint = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
        calendarEventId
      )}?conferenceDataVersion=1`;

      const patchBody: Record<string, unknown> = {};
      if (options.title) patchBody.summary = options.title;
      if (options.description) patchBody.description = options.description;
      if (options.startTime) {
        patchBody.start = {
          dateTime: options.startTime.toISOString(),
          timeZone: options.timeZone || "UTC",
        };
      }
      if (options.endTime) {
        patchBody.end = {
          dateTime: options.endTime.toISOString(),
          timeZone: options.timeZone || "UTC",
        };
      }

      if (options.interviewerEmails || options.candidateEmail) {
        const validInterviewers = (options.interviewerEmails || []).filter(
          (email) => typeof email === "string" && email.includes("@")
        );
        patchBody.attendees = [
          ...(options.candidateEmail && options.candidateEmail.includes("@")
            ? [{ email: options.candidateEmail, displayName: options.candidateName }]
            : []),
          ...validInterviewers.map((email) => ({ email })),
        ];
      }

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(patchBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[GoogleCalendarService] Failed to update event (${response.status}):`, errorText);
        return {
          isConfigured: true,
          status: "manual_entry_required",
          notes: `Google Calendar update returned error (${response.status}).`,
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
        status: "confirmed",
      };
    } catch (err) {
      console.error("[GoogleCalendarService] Exception updating meeting:", err);
      return {
        isConfigured: true,
        status: "manual_entry_required",
        notes: "Network exception updating Google Calendar event.",
      };
    }
  }

  /**
   * Deletes / cancels an event from Google Calendar.
   */
  public async deleteMeeting(
    calendarEventId: string,
    accessToken?: string
  ): Promise<{ success: boolean; notes?: string }> {
    if (!this.isConfigured() || !accessToken) {
      return { success: false, notes: "Not configured or missing access token" };
    }

    try {
      const endpoint = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
        calendarEventId
      )}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // 204 No Content, 200 OK, or 410 Gone (already deleted) indicate successful removal
      if (response.status === 204 || response.status === 200 || response.status === 410) {
        return { success: true };
      }

      const errorText = await response.text();
      console.warn(`[GoogleCalendarService] Failed to delete event (${response.status}):`, errorText);
      return { success: false, notes: `Google API returned status ${response.status}` };
    } catch (err) {
      console.error("[GoogleCalendarService] Exception deleting meeting:", err);
      return { success: false, notes: "Network exception deleting event" };
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
