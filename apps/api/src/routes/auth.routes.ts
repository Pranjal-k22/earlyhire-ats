import { Router } from "express";
import { signup, signupRecruiter, login, logout, getMe } from "../controllers/auth.controller.js";
import {
  initiateGoogleAuth,
  googleAuthCallback,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
} from "../controllers/googleCalendar.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Standard Authentication Routes
router.post("/signup", authLimiter, signup);
router.post("/signup/recruiter", authLimiter, signupRecruiter);
router.post("/register-recruiter", authLimiter, signupRecruiter);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);

// Google Calendar OAuth & Account Management Routes
router.get("/google", requireAuth, initiateGoogleAuth);
router.get("/google/callback", googleAuthCallback);
router.get("/google/status", requireAuth, getGoogleCalendarStatus);
router.post("/google/disconnect", requireAuth, disconnectGoogleCalendar);

export default router;
