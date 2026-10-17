import { Router } from "express";
import {
  listPlatformUsers,
  updatePlatformUserRole,
  getAIUsageMetrics,
  getSystemIntegrationsHealth,
} from "../controllers/platform.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// All platform endpoints strictly enforce platform_manager canonical authorization
router.use(requireAuth);
router.use(requireRole("platform_manager"));

router.get("/users", listPlatformUsers);
router.patch("/users/:userId/role", updatePlatformUserRole);
router.get("/ai-metrics", getAIUsageMetrics);
router.get("/health", getSystemIntegrationsHealth);

export default router;
