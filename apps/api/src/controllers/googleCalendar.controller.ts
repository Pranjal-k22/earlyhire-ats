import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";
import { googleCalendarService } from "../services/calendar/googleCalendarService.js";
import { GoogleCalendarConnection } from "../models/googleCalendarConnection.model.js";
import { OAuthState } from "../models/oauthState.model.js";
import { encryptToken, decryptToken } from "../utils/crypto.js";

/**
 * Initiates Google Calendar OAuth authorization flow.
 * Generates a cryptographically random, single-use state bound to the user.
 */
export const initiateGoogleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    if (!googleCalendarService.isConfigured()) {
      return next(
        new AppError(
          "Google Calendar integration is not configured with OAuth credentials on this server",
          400,
          "CALENDAR_NOT_CONFIGURED"
        )
      );
    }

    // Generate 32-byte cryptographically secure random state
    const state = crypto.randomBytes(32).toString("hex");

    // Persist state bound strictly to authenticated recruiter with a 10-minute expiry
    await OAuthState.create({
      state,
      userId: req.user.id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      redirectUrl: "/#workspace",
    });

    const authUrl = googleCalendarService.generateAuthUrl(state);

    if (req.query.json === "true" || (req.headers.accept?.includes("application/json") && !req.headers.accept?.includes("text/html"))) {
      res.status(200).json({
        success: true,
        data: {
          url: authUrl,
          state,
        },
      });
      return;
    }

    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
};

/**
 * Handles the Google OAuth callback.
 * Validates and atomically consumes the state, exchanges the authorization code for tokens,
 * encrypts the refresh token using AES-256-GCM, and persists recruiter calendar connection.
 */
export const googleAuthCallback = async (req: Request, res: Response): Promise<void> => {
  const clientBase = env.CLIENT_URL.replace(/\/$/, "");

  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.warn("[GoogleOAuth] Authorization denied or failed:", error, error_description);
      res.redirect(`${clientBase}/#workspace?calendar=error&reason=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code || !state || typeof code !== "string" || typeof state !== "string") {
      res.redirect(`${clientBase}/#workspace?calendar=error&reason=missing_state_or_code`);
      return;
    }

    // Atomically find and consume the OAuth state (single-use replay prevention)
    const oauthState = await OAuthState.findOneAndDelete({ state });
    if (!oauthState) {
      console.warn("[GoogleOAuth] State not found or already consumed:", state);
      res.redirect(`${clientBase}/#workspace?calendar=error&reason=invalid_or_expired_state`);
      return;
    }

    if (oauthState.expiresAt.getTime() < Date.now()) {
      console.warn("[GoogleOAuth] State expired:", state);
      res.redirect(`${clientBase}/#workspace?calendar=error&reason=state_expired`);
      return;
    }

    // Exchange authorization code for access and refresh tokens
    const tokens = await googleCalendarService.exchangeCodeForTokens(code);

    // Retrieve user Google email identity
    const userInfo = await googleCalendarService.getGoogleUserInfo(tokens.accessToken);
    const googleEmail = userInfo.email || "recruiter-calendar@earlyhire.ai";

    let encryptedRefreshToken: string;
    let iv: string;
    let authTag: string;

    if (tokens.refreshToken) {
      // Encrypt refresh token using authenticated AES-256-GCM
      const encrypted = encryptToken(tokens.refreshToken);
      encryptedRefreshToken = encrypted.encrypted;
      iv = encrypted.iv;
      authTag = encrypted.authTag;
    } else {
      // Re-authorization where Google omitted refresh token: preserve existing valid credentials
      const existing = await GoogleCalendarConnection.findOne({ userId: oauthState.userId }).select(
        "+encryptedRefreshToken +iv +authTag"
      );

      if (existing?.encryptedRefreshToken && existing.iv && existing.authTag) {
        encryptedRefreshToken = existing.encryptedRefreshToken;
        iv = existing.iv;
        authTag = existing.authTag;
      } else {
        res.redirect(`${clientBase}/#workspace?calendar=error&reason=no_refresh_token_returned`);
        return;
      }
    }

    // Persist or update the recruiter's connected Google Calendar account
    await GoogleCalendarConnection.findOneAndUpdate(
      { userId: oauthState.userId },
      {
        userId: oauthState.userId,
        googleEmail,
        encryptedRefreshToken,
        iv,
        authTag,
        scope: tokens.scope || "https://www.googleapis.com/auth/calendar.events",
        connectedAt: new Date(),
      },
      { upsert: true, returnDocument: "after" }
    );

    res.redirect(`${clientBase}/#workspace?calendar=connected`);
  } catch (err) {
    console.error("[GoogleOAuth] Exception handling OAuth callback:", err);
    res.redirect(`${clientBase}/#workspace?calendar=error&reason=exchange_failed`);
  }
};

/**
 * Returns the current authenticated recruiter's Google Calendar connection status.
 * Never leaks access tokens, refresh tokens, or client secrets.
 */
export const getGoogleCalendarStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const connection = await GoogleCalendarConnection.findOne({ userId: req.user.id });

    res.status(200).json({
      success: true,
      data: {
        isConfiguredOnServer: googleCalendarService.isConfigured(),
        connected: Boolean(connection),
        email: connection?.googleEmail || null,
        connectedAt: connection?.connectedAt || null,
        scope: connection?.scope || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disconnects the recruiter's Google Calendar account and revokes stored tokens.
 */
export const disconnectGoogleCalendar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const connection = await GoogleCalendarConnection.findOne({ userId: req.user.id }).select(
      "+encryptedRefreshToken +iv +authTag"
    );

    if (connection) {
      try {
        const refreshToken = decryptToken(connection.encryptedRefreshToken, connection.iv, connection.authTag);
        await googleCalendarService.revokeToken(refreshToken);
      } catch (revokeErr) {
        console.warn("[GoogleOAuth] Token revocation notice (proceeding with local cleanup):", revokeErr);
      }

      await GoogleCalendarConnection.deleteOne({ userId: req.user.id });
    }

    res.status(200).json({
      success: true,
      data: {
        disconnected: true,
      },
    });
  } catch (error) {
    next(error);
  }
};
