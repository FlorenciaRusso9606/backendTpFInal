import { Router } from "express";
import * as NotificationController from "../controllers/notificationController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/", NotificationController.fetchNotifications)
router.get("/unread/count", NotificationController.fetchUnreadCount)
router.put("/mark-seen", NotificationController.markNotificationsSeen)

export default router;
