import { Router } from "express";
import * as MessageController from "../controllers/messageController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

router.use(authenticateJWT);

// Obtener conversaciones del usuario
router.get("/conversations", MessageController.getConversations);

// Obtener mensajes con un usuario concreto
router.get("/with/:userId", MessageController.getMessagesWithUser);

// Crear mensaje (body: { to, text })
router.post("/", MessageController.createMessage);

export default router;
