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

// Candidate Read Endpoints (Listing candidates restricted to hiring team, hiring manager, and platform manager)
router.get("/", requireRole("hiring_team", "hiring_manager", "platform_manager"), getCandidates);
router.get("/:id", getCandidateById);

// Candidate Mutating Endpoints (Restricted to hiring_team and platform_manager roles)
router.post("/", requireRole("hiring_team", "platform_manager"), createCandidate);
router.patch("/:id", requireRole("hiring_team", "platform_manager"), updateCandidate);
router.delete("/:id", requireRole("hiring_team", "platform_manager"), deleteCandidate);

export default router;
