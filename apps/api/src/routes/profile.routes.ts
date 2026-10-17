import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Profile endpoints are accessible to any authenticated user (candidate, hiring_team, platform_manager)
router.use(requireAuth);

router.get("/", getProfile);
router.put("/", updateProfile);

export default router;
