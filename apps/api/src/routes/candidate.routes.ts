import { Router } from "express";
import {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
} from "../controllers/candidate.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import noteRoutes from "./note.routes.js";

const router = Router();

// Protect all candidate endpoints with authentication
router.use(requireAuth);

// Notes subroute: /api/v1/candidates/:candidateId/notes
router.use("/:candidateId/notes", noteRoutes);

// Candidate Read Endpoints (Listing candidates restricted to hiring team and management)
router.get("/", requireRole("admin", "recruiter", "hiring_manager"), getCandidates);
router.get("/:id", getCandidateById);

// Candidate Mutating Endpoints (Restricted to admin and recruiter roles)
router.post("/", requireRole("admin", "recruiter"), createCandidate);
router.patch("/:id", requireRole("admin", "recruiter"), updateCandidate);
router.delete("/:id", requireRole("admin", "recruiter"), deleteCandidate);

export default router;
