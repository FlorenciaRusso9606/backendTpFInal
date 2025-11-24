import { Router } from "express";
import {
  insertComment,
  updateComment,
  deleteComment,
  findComment,
  getCommentsByPost,
  myComments
} from "../controllers/commentController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();


// Obtener comentarios de un post
router.get("/post/:postId", getCommentsByPost);

//obtener todos los comentarios de un usuario
router.get("/mine", authenticateJWT,  myComments)
// Crear un comentario (o respuesta)
// Crear un comentario (o respuesta)
// POST /api/comments/post/:postId  (path param)
router.post("/post/:postId", authenticateJWT, insertComment);
// Backwards-compatible: allow POST /api/comments with body { post_id, text, parent_id }
router.post("/", authenticateJWT, insertComment);

// Obtener un comentario específico
router.get("/:commentId", findComment);

// Actualizar un comentario
router.put("/:commentId", authenticateJWT, updateComment);

// Eliminar un comentario
router.delete("/:commentId", authenticateJWT, deleteComment);

export default router;
