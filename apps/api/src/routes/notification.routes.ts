import { Router } from "express";
import {
  getMyNotifications,
  markNotificationRead,
  markAllRead,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/my", getMyNotifications);
router.patch("/:id/read", markNotificationRead);
router.patch("/read-all", markAllRead);

export default router;
