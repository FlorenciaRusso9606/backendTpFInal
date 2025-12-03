import { Router } from "express";
import * as MessageController from "../controllers/messageController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/conversations", MessageController.getConversations);
router.get("/unread-count", MessageController.getUnreadCount);
router.post("/mark-read", MessageController.markConversationAsRead);
router.get("/:userId", MessageController.getMessagesWithUser);
router.get("/with/:userId", MessageController.getMessagesWithUser);
router.post("/", MessageController.createMessage);

export default router;
