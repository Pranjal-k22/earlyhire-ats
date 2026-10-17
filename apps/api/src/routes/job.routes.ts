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

// Write operations restricted to Admin and Recruiter roles per RBAC matrix
router.post("/", requireRole("admin", "recruiter"), createJob);
router.patch("/:id", requireRole("admin", "recruiter"), updateJob);
router.delete("/:id", requireRole("admin", "recruiter"), deleteJob);

export default router;
