/**
 * EarlyAI ATS — Unified Design Tokens
 * 
 * Core palette and system tokens shared across Candidate, Recruiter,
 * Platform Manager, and Public Landing experiences.
 */

export const DESIGN_TOKENS = {
  colors: {
    primaryBlue: "#315CFF",
    purple: "#8B2BFF",
    lavender: "#F1E9FF",
    lightBlue: "#EEF5FF",
    softWhite: "#FFFFFF",
    background: "#F8FAFC",
    primaryText: "#172033",
    secondaryText: "#667085",
    success: "#16A34A",
    error: "#DC2626",
    border: "#E5E7EB",
  },
  gradients: {
    primaryAction: "linear-gradient(135deg, #315CFF 0%, #8B2BFF 100%)",
    brandPill: "linear-gradient(90deg, #315CFF 0%, #8B2BFF 100%)",
    softAtmosphere: "linear-gradient(180deg, #F8FAFC 0%, #EEF5FF 40%, #F1E9FF 100%)",
    glowViolet: "radial-gradient(circle at 60% 40%, rgba(139, 43, 255, 0.12) 0%, transparent 60%)",
    glowBlue: "radial-gradient(circle at 30% 30%, rgba(49, 92, 255, 0.14) 0%, transparent 55%)",
  },
  shadows: {
    authCard: "0 20px 40px -15px rgba(49, 92, 255, 0.10), 0 0 1px 1px rgba(229, 231, 235, 0.8)",
    buttonGlow: "0 10px 25px -5px rgba(49, 92, 255, 0.35)",
    cardSoft: "0 4px 20px -2px rgba(112, 144, 176, 0.08)",
  },
  radii: {
    card: "1.5rem",      // 24px
    cardLarge: "1.75rem", // 28px
    button: "0.75rem",   // 12px
    input: "0.75rem",    // 12px
    pill: "9999px",
  },
} as const;
