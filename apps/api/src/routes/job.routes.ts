import { Router } from "express";
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
} from "../controllers/job.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// All job routes require an active authenticated session
router.use(requireAuth);

// Public read access for all authenticated roles (Admin, Recruiter, Hiring Manager)
router.get("/", getJobs);
router.get("/:id", getJobById);

// Write operations restricted to hiring_team and platform_manager roles
router.post("/", requireRole("hiring_team", "platform_manager"), createJob);
router.patch("/:id", requireRole("hiring_team", "platform_manager"), updateJob);
router.delete("/:id", requireRole("hiring_team", "platform_manager"), deleteJob);

export default router;
