import { Router } from "express";
import {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
} from "../controllers/candidate.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Protect all candidate endpoints with authentication
router.use(requireAuth);

// Candidate Read Endpoints (All authenticated roles: admin, recruiter, hiring_manager)
router.get("/", getCandidates);
router.get("/:id", getCandidateById);

// Candidate Mutating Endpoints (Restricted to admin and recruiter roles)
router.post("/", requireRole("admin", "recruiter"), createCandidate);
router.patch("/:id", requireRole("admin", "recruiter"), updateCandidate);
router.delete("/:id", requireRole("admin", "recruiter"), deleteCandidate);

export default router;
