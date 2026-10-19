import { Router } from "express";
import {
  createOffer,
  getOfferForApplication,
  getMyOffers,
  approveOffer,
  extendOffer,
  respondToOffer,
} from "../controllers/offer.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("hiring_team", "platform_manager"), createOffer);
router.get("/my", getMyOffers);
router.get("/application/:applicationId", getOfferForApplication);
router.patch("/:id/approve", requireRole("hiring_team", "platform_manager"), approveOffer);
router.patch("/:id/extend", requireRole("hiring_team", "platform_manager"), extendOffer);
router.patch("/:id/respond", respondToOffer);

export default router;
