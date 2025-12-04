import { Router } from "express";
import {
  togglePostLike,
  toggleCommentLike,
  getPostLikes,
  getCommentLikes,
  checkUserCommentLike,
  checkUserPostLike,
  myLikedPosts,
  getPostLikesUsers
} from "../controllers/reactionController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

router.get("/mine/posts", authenticateJWT, myLikedPosts)
router.get("/post/:postId/likes", getPostLikes);
router.post("/post/:postId", authenticateJWT, togglePostLike);

router.get("/post/:postId/users", authenticateJWT, getPostLikesUsers);
router.post("/comment/:commentId", authenticateJWT, toggleCommentLike);
router.get("/comment/:commentId/likes", getCommentLikes);
router.get("/post/:postId/isLiked", authenticateJWT, checkUserPostLike);
router.get("/comment/:commentId/isLiked", authenticateJWT, checkUserCommentLike);


export default router;
