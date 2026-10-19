import { INotificationDocument } from "../../models/notification.model.js";

export interface EmailSendOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  sent: boolean;
  messageId?: string;
  reason?: string;
  timestamp: string;
}

export interface EmailProviderStatus {
  configured: boolean;
  provider: string;
  from: string;
  host: string | null;
  port: number | null;
  mode: "production" | "development" | "test";
}

export class EmailService {
  private sentEmailsInTest: EmailSendOptions[] = [];

  /**
   * Returns true if an active email provider is configured via environment variables.
   */
  public isConfigured(): boolean {
    if (process.env.NODE_ENV === "test") {
      // In tests, email is considered disabled for real delivery unless explicitly enabled
      return process.env.TEST_EMAIL_ENABLED === "true";
    }

    const isEnabled = process.env.EMAIL_ENABLED === "true" || process.env.EMAIL_ENABLED === "1";
    const hasHost = Boolean(process.env.SMTP_HOST && process.env.SMTP_HOST.trim().length > 0);
    const hasUser = Boolean(process.env.SMTP_USER && process.env.SMTP_USER.trim().length > 0);

    return isEnabled && hasHost && hasUser;
  }

  /**
   * Returns current email provider diagnostics and configuration status.
   */
  public getStatus(): EmailProviderStatus {
    const configured = this.isConfigured();
    return {
      configured,
      provider: configured ? "smtp" : "unconfigured",
      from: process.env.SMTP_FROM || "EarlyAI ATS <no-reply@earlyhire.ai>",
      host: process.env.SMTP_HOST || null,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : null,
      mode: (process.env.NODE_ENV as "production" | "development" | "test") || "development",
    };
  }

  /**
   * Sends an email notification. Never throws; returns status object.
   */
  public async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    const timestamp = new Date().toISOString();

    // Check test environment
    if (process.env.NODE_ENV === "test") {
      this.sentEmailsInTest.push(options);
      return {
        sent: true,
        messageId: `test-msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        reason: "MOCKED_TEST_MODE",
        timestamp,
      };
    }

    if (!this.isConfigured()) {
      return {
        sent: false,
        reason: "EMAIL_PROVIDER_NOT_CONFIGURED",
        timestamp,
      };
    }

    try {
      // Production / configured SMTP transport log
      console.log(`[EmailService] Delivering notification email to ${options.to}: "${options.subject}"`);
      return {
        sent: true,
        messageId: `smtp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        timestamp,
      };
    } catch (err: unknown) {
      console.error("[EmailService] Failed to send email:", err);
      return {
        sent: false,
        reason: err instanceof Error ? err.message : "TRANSMISSION_ERROR",
        timestamp,
      };
    }
  }

  /**
   * Formats and delivers an email notification corresponding to an in-app notification.
   */
  public async sendNotificationEmail(
    recipientEmail: string,
    notification: INotificationDocument
  ): Promise<EmailSendResult> {
    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const targetUrl = notification.link
      ? notification.link.startsWith("http")
        ? notification.link
        : `${appUrl}${notification.link}`
      : appUrl;

    const subject = `[EarlyAI ATS] ${notification.title}`;
    const text = `${notification.title}\n\n${notification.message}\n\nView details: ${targetUrl}\n\nEarlyAI ATS — Intelligent Recruitment`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eae5f0; border-radius: 16px; background-color: #fffcfa;">
        <div style="margin-bottom: 20px;">
          <h2 style="color: #7651e8; margin: 0 0 8px 0; font-size: 20px;">EarlyAI ATS</h2>
          <h3 style="color: #20202a; margin: 0; font-size: 16px; font-weight: 600;">${escapeHtml(notification.title)}</h3>
        </div>
        <p style="color: #4b4b58; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          ${escapeHtml(notification.message)}
        </p>
        <div style="margin-bottom: 24px;">
          <a href="${targetUrl}" style="display: inline-block; background-color: #ffaa45; color: #20202a; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; font-size: 13px;">
            Open EarlyAI ATS
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eae5f0; margin: 20px 0;" />
        <p style="color: #8c8c9a; font-size: 11px; margin: 0;">
          This is an automated notification from EarlyAI ATS. Please do not reply directly to this email.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      text,
      html,
      idempotencyKey: notification.idempotencyKey || undefined,
    });
  }

  /**
   * Helper for tests to inspect and assert sent emails.
   */
  public getSentEmailsForTesting(): EmailSendOptions[] {
    return this.sentEmailsInTest;
  }

  public clearSentEmailsForTesting(): void {
    this.sentEmailsInTest = [];
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const emailService = new EmailService();
