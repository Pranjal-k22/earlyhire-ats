import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import jobRoutes from "./routes/job.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import noteDirectRoutes from "./routes/noteDirect.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { sanitizeMongo } from "./middleware/mongoSanitize.js";
import { verifyOrigin, isAllowedOrigin } from "./middleware/csrf.js";

export const createApp = (): Express => {
  const app = express();

  // Security HTTP headers
  app.use(helmet());

  // CORS configuration with explicit origin allowlist and credential support
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) {
          return callback(null, true);
        }
        if (isAllowedOrigin(requestOrigin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Body parsing and cookies
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  // Security sanitization and CSRF Origin protection
  app.use(sanitizeMongo);
  app.use(verifyOrigin);

  // API Routes
  app.use("/api/v1", healthRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/jobs", jobRoutes);
  app.use("/api/v1/candidates", candidateRoutes);
  app.use("/api/v1/applications", applicationRoutes);
  app.use("/api/v1/notes", noteDirectRoutes);
  app.use("/api/v1/analytics", analyticsRoutes);
  app.use("/api/v1/dashboard", analyticsRoutes);

  // 404 Fallback
  app.use(notFoundHandler);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

export const app = createApp();
