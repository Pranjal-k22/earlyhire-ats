import { Router, Request, Response } from "express";

import mongoose from "mongoose";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "earlyai-ats-api",
  });
});

router.get("/health/ready", (_req: Request, res: Response) => {
  const isDbReady = mongoose.connection.readyState === 1;
  const statusCode = isDbReady ? 200 : 503;
  res.status(statusCode).json({
    status: isDbReady ? "ready" : "not_ready",
    service: "earlyai-ats-api",
    database: isDbReady ? "connected" : "disconnected",
  });
});

export default router;
