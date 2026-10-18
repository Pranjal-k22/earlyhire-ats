import mongoose from "mongoose";
import { env } from "./env.js";

/**
 * Strips user:password credentials from a MongoDB URI for safe logging.
 * Uses greedy match up to the last '@' before host to handle passwords containing '@'.
 */
export const sanitizeMongoUri = (uri: string): string => {
  if (!uri || typeof uri !== "string") return "[REDACTED_URI]";
  try {
    return uri.replace(/\/\/[^/]*@/g, "//***:***@");
  } catch {
    return "[REDACTED_URI]";
  }
};

/**
 * Validates whether a MongoDB URI points strictly to a local test database.
 * Requirement: Host must be localhost/127.0.0.1/::1 AND database name must end in '_test'.
 */
export const isSafeTestUri = (uri: string): boolean => {
  if (!uri || typeof uri !== "string") return false;
  try {
    const withoutProto = uri.replace(/^mongodb(\+srv)?:\/\//, "");
    if (!withoutProto || withoutProto === uri) return false;

    // Remove credentials (take last '@' to handle passwords containing '@')
    const atIndex = withoutProto.lastIndexOf("@");
    const hostAndPath = atIndex !== -1 ? withoutProto.slice(atIndex + 1) : withoutProto;

    const slashIndex = hostAndPath.indexOf("/");
    if (slashIndex === -1) return false;

    const hostPart = hostAndPath.slice(0, slashIndex);
    const pathAndQuery = hostAndPath.slice(slashIndex + 1);

    const qIndex = pathAndQuery.indexOf("?");
    const dbName = qIndex !== -1 ? pathAndQuery.slice(0, qIndex) : pathAndQuery;

    if (!dbName || !dbName.endsWith("_test")) {
      return false;
    }

    const hosts = hostPart.split(",");
    for (const h of hosts) {
      const cleanHost = h.trim().split(":")[0].toLowerCase();
      if (cleanHost !== "localhost" && cleanHost !== "127.0.0.1" && cleanHost !== "::1") {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Checks whether an active mongoose connection is connected to a local test database.
 */
export const isSafeLocalTestDatabase = (host?: string | null, name?: string | null): boolean => {
  const isLocalhost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const isTestDb = Boolean(name && name.endsWith("_test"));
  return isLocalhost && isTestDb;
};

// Install safety guard on mongoose.Connection.prototype.dropDatabase
// Refuses dropDatabase unless host is localhost/127.0.0.1/::1 AND database name ends in '_test'
const originalDropDatabase = mongoose.Connection.prototype.dropDatabase;
mongoose.Connection.prototype.dropDatabase = async function (this: mongoose.Connection): Promise<void> {
  const host = this.host;
  const dbName = this.name;
  if (!isSafeLocalTestDatabase(host, dbName)) {
    const safeHost = host || "[unknown host]";
    const safeName = dbName || "[unknown db]";
    const errorMsg =
      `CRITICAL SAFETY GUARD: Refusing to drop database "${safeName}" on host "${safeHost}". ` +
      `dropDatabase() is strictly restricted to local host (localhost/127.0.0.1) and database names ending with "_test".`;
    console.error(`🚨 ${errorMsg}`);
    throw new Error(errorMsg);
  }
  await originalDropDatabase.apply(this);
};

let isConnected = false;

export const connectDB = async (customUri?: string): Promise<typeof mongoose> => {
  if (customUri === "") {
    const errorMsg = "MongoDB connection failed: MONGODB_URI is undefined";
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const uri = customUri || env.MONGODB_URI;

  if (!uri) {
    const errorMsg = "MongoDB connection failed: MONGODB_URI is undefined";
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Safety Guard: In test mode, reject any non-local or non-test database URI
  if (process.env.NODE_ENV === "test") {
    if (!isSafeTestUri(uri)) {
      const safeUri = sanitizeMongoUri(uri);
      const errorMsg = `SECURITY GUARD: In test mode, database connections must target localhost/127.0.0.1 and end with '_test'. Attempted URI: ${safeUri}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }

  if (!customUri && isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    mongoose.set("strictQuery", true);

    const safeUri = sanitizeMongoUri(uri);
    console.log(`📡 Connecting to MongoDB at ${safeUri}...`);

    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log(`✅ MongoDB connected successfully to database: "${mongoose.connection.name}"`);

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err.message || "Unknown error");
    });

    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      console.warn("⚠️ MongoDB connection disconnected.");
    });

    return connection;
  } catch (error: unknown) {
    isConnected = false;
    const safeError = error instanceof Error ? error.message : "Unknown connection error";
    // Ensure no raw passwords or URIs leak in error logs
    console.error("❌ Failed to connect to MongoDB:", sanitizeMongoUri(safeError));
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log("🔌 MongoDB disconnected gracefully.");
  }
};

export const isDBConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
