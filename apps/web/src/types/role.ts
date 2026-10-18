/**
 * Role Definitions and Normalization for EarlyAI ATS Frontend
 * Exactly matches backend models/user.model.ts
 */

export const CANONICAL_ROLES = ["candidate", "hiring_team", "platform_manager"] as const;
export const LEGACY_ROLES = ["admin", "recruiter", "hiring_manager"] as const;
export const ALL_USER_ROLES = [
  "candidate",
  "hiring_team",
  "platform_manager",
  "admin",
  "recruiter",
  "hiring_manager",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];
export type LegacyRole = (typeof LEGACY_ROLES)[number];
export type UserRole = (typeof ALL_USER_ROLES)[number];

export const normalizeRole = (role?: UserRole | string | null): CanonicalRole => {
  if (!role) return "candidate";
  switch (role) {
    case "admin":
    case "platform_manager":
      return "platform_manager";
    case "recruiter":
    case "hiring_manager":
    case "hiring_team":
      return "hiring_team";
    case "candidate":
    default:
      return "candidate";
  }
};
