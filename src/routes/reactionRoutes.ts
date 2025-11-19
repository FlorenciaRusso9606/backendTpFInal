import { Router } from "express";
import {
  togglePostLike,
  toggleCommentLike,
  getPostLikes,
  getCommentLikes,
  checkUserCommentLike,
  checkUserPostLike
} from "../controllers/reactionController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// Likes en posts
router.post("/post/:postId", authenticateJWT, togglePostLike);
router.get("/post/:postId/likes", getPostLikes);

// Likes en comentarios
router.post("/comment/:commentId", authenticateJWT, toggleCommentLike);
router.get("/comment/:commentId/likes", getCommentLikes);

router.get("/post/:postId/isLiked", authenticateJWT, checkUserPostLike);
router.get("/comment/:commentId/isLiked", authenticateJWT, checkUserCommentLike);

export default router;
