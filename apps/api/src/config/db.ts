import mongoose from "mongoose";
import { env } from "./env.js";

/**
 * Strips user:password credentials from a MongoDB URI for safe logging.
 */
export const sanitizeMongoUri = (uri: string): string => {
  try {
    return uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
  } catch {
    return "[REDACTED_URI]";
  }
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
