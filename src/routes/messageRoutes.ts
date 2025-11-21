import { Router } from "express";
import * as MessageController from "../controllers/messageController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

router.use(authenticateJWT);

// Obtener conversaciones del usuario
router.get("/conversations", MessageController.getConversations);

// Obtener mensajes con un usuario concreto
// Soporta dos formatos usados por diferentes clientes:
// - GET /api/messages/:userId
// - GET /api/messages/with/:userId
router.get("/:userId", MessageController.getMessagesWithUser);
router.get("/with/:userId", MessageController.getMessagesWithUser);

// Crear mensaje (body: { to, text })
router.post("/", MessageController.createMessage);

export default router;
