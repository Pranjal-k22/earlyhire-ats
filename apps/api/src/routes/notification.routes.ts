import { Router } from "express";
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  getEmailStatus,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/my", getMyNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markNotificationRead);
router.patch("/read-all", markAllRead);
router.delete("/:id", deleteNotification);
router.get("/email-status", getEmailStatus);

export default router;
