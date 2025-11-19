// routes/commentRoutes.ts
import { Router } from "express";
import {
  insertComment,
  updateComment,
  deleteComment,
  findComment,
  getCommentsByPost,
} from "../controllers/commentController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// insertar un comentario
router.post("/", insertComment);
// Obtener comentarios de un post
router.get("/post/:postId", getCommentsByPost);

// Crear un comentario (o respuesta)
router.post("/post/:postId", authenticateJWT, insertComment);

// Obtener un comentario específico
router.get("/:commentId", findComment);

// Actualizar un comentario
router.put("/:commentId", authenticateJWT, updateComment);

// Eliminar un comentario
router.delete("/:commentId", authenticateJWT, deleteComment);

export default router;
