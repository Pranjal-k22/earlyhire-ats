/**
 * Platform Manager Bootstrap Script
 * 
 * Secure, audited CLI utility for initial platform_manager provisioning.
 * - Defaults strictly to dry-run mode. Requires --execute to write.
 * - Prevents password exposure in shell history and process tables.
 * - Supports BOOTSTRAP_PLATFORM_MANAGER_PASSWORD env var and interactive non-echoing input.
 * - Enforces email formatting, password complexity, role integrity, and target database verification.
 * - NEVER logs passwords, hashes, or sensitive credentials.
 */

import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { env } from "../config/env.js";
import { connectDB, disconnectDB, sanitizeMongoUri } from "../config/db.js";

export interface BootstrapOptions {
  name: string;
  email: string;
  password?: string;
  isExecute: boolean;
  allowRoleUpgrade?: boolean;
  confirmProduction?: boolean;
  customUri?: string;
}

export interface BootstrapResult {
  status: "CREATED" | "UPGRADED" | "ALREADY_PLATFORM_MANAGER" | "DRY_RUN_CREATE" | "DRY_RUN_UPGRADE";
  email: string;
  userId?: string;
  role: string;
  targetDatabase: string;
}

export function isStagingDatabase(dbName?: string | null): boolean {
  if (!dbName) return false;
  const normalized = dbName.toLowerCase().trim();
  return normalized === "earlyai_ats_staging" || normalized.endsWith("_staging");
}

export function isProductionDatabase(dbName?: string | null): boolean {
  if (!dbName) return false;
  const normalized = dbName.toLowerCase().trim();
  return normalized === "earlyai_ats_prod" || normalized.endsWith("_prod") || normalized === "production";
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 12) {
    return { valid: false, reason: "Password must be at least 12 characters long" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one lowercase letter" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one uppercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one digit" };
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one special character" };
  }
  if (/\s/.test(password)) {
    return { valid: false, reason: "Password must not contain whitespace" };
  }
  return { valid: true };
}

export async function readPasswordInteractively(promptText = "Enter platform_manager password: "): Promise<string> {
  const isTTY = Boolean(process.stdin.isTTY && typeof process.stdin.setRawMode === "function");
  if (!isTTY) {
    throw new Error(
      "Interactive masked password input requires an active TTY. For non-interactive environments, supply BOOTSTRAP_PLATFORM_MANAGER_PASSWORD from a secure secret store."
    );
  }

  return new Promise((resolve, reject) => {
    process.stdout.write(promptText);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let password = "";
    const onData = (char: string) => {
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(password);
      } else if (char === "\u0003") {
        // Ctrl+C
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        reject(new Error("Password input cancelled by user (SIGINT)"));
      } else if (char === "\b" || char === "\x7f") {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        password += char;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}

export async function bootstrapPlatformManager(options: BootstrapOptions): Promise<BootstrapResult> {
  const {
    name,
    email,
    password,
    isExecute,
    allowRoleUpgrade = false,
    confirmProduction = false,
    customUri,
  } = options;

  // 1. Email format validation
  if (!validateEmail(email)) {
    throw new Error(`Invalid email address format: "${email}". A valid email format is required.`);
  }

  // 2. Name validation
  if (!name || name.trim().length < 2) {
    throw new Error("A valid full name (minimum 2 characters) is required.");
  }

  // 3. Password validation (if provided or if in execute mode for new user)
  if (password !== undefined && password !== "") {
    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid) {
      throw new Error(`Password strength requirement not met: ${pwCheck.reason}`);
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  // 4. Connect to database using safe connection helper
  const targetUri = customUri || env.MONGODB_URI;
  if (mongoose.connection.readyState === 0) {
    await connectDB(targetUri);
  }

  const dbName = mongoose.connection.name || "unknown";
  const sanitizedUri = sanitizeMongoUri(targetUri);

  console.log(`🎯 Target database: "${dbName}" at ${sanitizedUri}`);

  // 5. Environment & Database Classification Safeguards
  const isStaging = isStagingDatabase(dbName);
  const isTest = dbName.endsWith("_test") || env.NODE_ENV === "test";
  const isDev = dbName.endsWith("_dev") || dbName === "earlyai_ats_dev";
  const isRealProduction = isProductionDatabase(dbName) || (env.NODE_ENV === "production" && !isStaging && !isTest && !isDev);

  if (isExecute && isRealProduction && !confirmProduction) {
    throw new Error(
      `CRITICAL PRODUCTION SAFEGUARD: Target database "${dbName}" is identified as a production database. Refusing execution without explicit confirmation flag (--confirm-production).`
    );
  }

  if (isStaging) {
    console.log(`ℹ️ Staging deployment verified: target database is explicitly staging ("${dbName}").`);
  }

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (existingUser.role === "platform_manager") {
        if (isExecute) {
          let updated = false;
          if (password) {
            existingUser.passwordHash = await User.hashPassword(password);
            updated = true;
          }
          if (normalizedName && existingUser.name !== normalizedName) {
            existingUser.name = normalizedName;
            updated = true;
          }
          if (updated) {
            await existingUser.save();
            console.log(`✅ Existing platform_manager ${normalizedEmail} credentials/name updated.`);
          }
        }
        console.log(`ℹ️ Account ${normalizedEmail} already exists and is already a platform_manager.`);
        return {
          status: "ALREADY_PLATFORM_MANAGER",
          email: normalizedEmail,
          userId: existingUser.id,
          role: "platform_manager",
          targetDatabase: dbName,
        };
      }

      console.log(`⚠️ User ${normalizedEmail} exists with existing role "${existingUser.role}".`);

      if (!allowRoleUpgrade) {
        throw new Error(
          `User ${normalizedEmail} already exists with role "${existingUser.role}". To upgrade this user to platform_manager, supply --allow-role-upgrade.`
        );
      }

      if (isExecute) {
        existingUser.role = "platform_manager";
        if (password) {
          existingUser.passwordHash = await User.hashPassword(password);
        }
        if (normalizedName) {
          existingUser.name = normalizedName;
        }
        await existingUser.save();
        console.log(`✅ User ${normalizedEmail} successfully upgraded to platform_manager.`);
        return {
          status: "UPGRADED",
          email: normalizedEmail,
          userId: existingUser.id,
          role: "platform_manager",
          targetDatabase: dbName,
        };
      } else {
        console.log(`[DRY RUN] Would upgrade existing user ${normalizedEmail} from "${existingUser.role}" to "platform_manager".`);
        return {
          status: "DRY_RUN_UPGRADE",
          email: normalizedEmail,
          userId: existingUser.id,
          role: "platform_manager",
          targetDatabase: dbName,
        };
      }
    }

    // New user path
    if (isExecute) {
      if (!password) {
        throw new Error("A strong password is required to create a new platform_manager account in execute mode.");
      }

      const passwordHash = await User.hashPassword(password);
      const newUser = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: "platform_manager",
        isActive: true,
        lastLoginAt: new Date(),
      });

      console.log(`✅ New platform_manager account created successfully (ID: ${newUser.id})`);
      return {
        status: "CREATED",
        email: normalizedEmail,
        userId: newUser.id,
        role: "platform_manager",
        targetDatabase: dbName,
      };
    } else {
      console.log(`[DRY RUN] Would create new platform_manager account for: ${normalizedEmail} (Role: platform_manager)`);
      return {
        status: "DRY_RUN_CREATE",
        email: normalizedEmail,
        role: "platform_manager",
        targetDatabase: dbName,
      };
    }
  } finally {
    // Only disconnect if invoked as CLI script directly
    if (process.argv[1]?.includes("bootstrapPlatformManager") && mongoose.connection.readyState !== 0) {
      await disconnectDB();
    }
  }
}

export async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");
  const allowRoleUpgrade = args.includes("--allow-role-upgrade");
  const confirmProduction = args.includes("--confirm-production");

  const nameArg = args.find((a) => a.startsWith("--name="))?.replace(/^--name=/, "");
  const emailArg = args.find((a) => a.startsWith("--email="))?.replace(/^--email=/, "");
  const passArg = args.find((a) => a.startsWith("--password="))?.replace(/^--password=/, "");

  if (!emailArg || !nameArg) {
    console.log("================================================================================");
    console.log(" EarlyAI ATS — Secure Platform Manager Bootstrap");
    console.log("================================================================================");
    console.log("Usage:");
    console.log("  # Step 1: Dry-run verification (Default, zero database writes):");
    console.log("  npm run bootstrap:platform-manager -- --name='Admin User' --email='admin@example.com'");
    console.log("  (Or in production container: node apps/api/dist/scripts/bootstrapPlatformManager.js --name='...' --email='...')");
    console.log("");
    console.log("  # Step 2: Execute with interactive masked password entry (Recommended):");
    console.log("  npm run bootstrap:platform-manager -- --name='Admin User' --email='admin@example.com' --execute");
    console.log("  (Or in production container: node apps/api/dist/scripts/bootstrapPlatformManager.js --name='...' --email='...' --execute)");
    console.log("");
    console.log("Options:");
    console.log("  --name=<name>             Full name (min 2 characters) [Required]");
    console.log("  --email=<email>           Valid email address [Required]");
    console.log("  --execute                 Execute database write (Default: dry-run only)");
    console.log("  --allow-role-upgrade      Permit upgrading an existing non-platform_manager user");
    console.log("  --confirm-production      Required safeguard only if targeting a production database");
    console.log("================================================================================");
    console.log("Interactive masked input ensures credentials never touch process tables or history.");
    console.log("================================================================================");
    process.exit(0);
  }

  // Determine password source with security warnings
  let password = process.env.BOOTSTRAP_PLATFORM_MANAGER_PASSWORD;

  if (passArg) {
    console.warn(
      "⚠️ SECURITY WARNING: Passing passwords via --password=<pass> exposes credentials in shell history and system process listings. Use BOOTSTRAP_PLATFORM_MANAGER_PASSWORD env var or interactive prompt instead."
    );
    password = passArg;
  }

  if (isExecute && !password) {
    if (process.stdin.isTTY) {
      console.log("🔒 Secure Interactive Credential Entry:");
      const p1 = await readPasswordInteractively("Enter platform_manager password: ");
      const p2 = await readPasswordInteractively("Confirm platform_manager password: ");
      if (p1 !== p2) {
        console.error("❌ Passwords do not match. Aborting.");
        process.exit(1);
      }
      password = p1;
    } else {
      console.error(
        "❌ Error: Password is required for --execute. Please provide BOOTSTRAP_PLATFORM_MANAGER_PASSWORD in environment."
      );
      process.exit(1);
    }
  }

  try {
    await bootstrapPlatformManager({
      name: nameArg,
      email: emailArg,
      password,
      isExecute,
      allowRoleUpgrade,
      confirmProduction,
    });
  } catch (err: unknown) {
    console.error("❌ Bootstrap failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

if (process.argv[1]?.includes("bootstrapPlatformManager")) {
  main();
}
