/**
 * Role Migration Script
 * 
 * Maps legacy roles to canonical roles:
 * - admin -> platform_manager
 * - recruiter -> hiring_team
 * - hiring_manager -> hiring_team
 * 
 * Supports --dry-run (default mode) and --execute.
 * Never silently executes in production without explicit --execute flag.
 */

import mongoose from "mongoose";
import { User, normalizeRole } from "../models/user.model.js";
import { env } from "../config/env.js";

export interface MigrationSummary {
  totalUsers: number;
  usersToMigrate: number;
  alreadyCanonical: number;
  breakdown: Record<string, number>;
  dryRun: boolean;
}

export async function runRoleMigration(isDryRun = true): Promise<MigrationSummary> {
  const users = await User.find({});
  const summary: MigrationSummary = {
    totalUsers: users.length,
    usersToMigrate: 0,
    alreadyCanonical: 0,
    breakdown: {},
    dryRun: isDryRun,
  };

  for (const user of users) {
    const currentRole = user.role;
    const targetCanonical = normalizeRole(currentRole);

    summary.breakdown[currentRole] = (summary.breakdown[currentRole] || 0) + 1;

    if (currentRole === targetCanonical) {
      summary.alreadyCanonical++;
      continue;
    }

    summary.usersToMigrate++;

    if (!isDryRun) {
      user.role = targetCanonical;
      await user.save();
    }
  }

  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");
  const isDryRun = !isExecute;

  console.log(`[Role Migration] Running in ${isDryRun ? "DRY RUN (Preview)" : "EXECUTE"} mode...`);

  await mongoose.connect(env.MONGODB_URI);
  console.log("[Role Migration] Connected to MongoDB.");

  try {
    const summary = await runRoleMigration(isDryRun);
    console.log("[Role Migration] Result Summary:", JSON.stringify(summary, null, 2));

    if (isDryRun) {
      console.log("[Role Migration] Dry run completed safely. No database records were modified.");
      console.log("[Role Migration] To execute changes, run with: npm run migrate:roles -- --execute");
    } else {
      console.log("[Role Migration] Migration executed successfully.");
    }
  } finally {
    await mongoose.disconnect();
    console.log("[Role Migration] Disconnected from MongoDB.");
  }
}

// Only execute directly when run as CLI script
if (process.argv[1]?.endsWith("migrateRoles.ts") || process.argv[1]?.endsWith("migrateRoles.js")) {
  main().catch((err) => {
    console.error("[Role Migration Error]:", err);
    process.exit(1);
  });
}
