import { Router } from "express";
import {
  createPostController,
  listPostsController,
  getPostByIdController,
  sharePostController,
  isSharedPostController,
  getMyRepost,
  listUserPostsController,
  myPostsController,
  getFollowingFeed,
  getAllFeed,
  deletePostController,
  updatePostController,
} from "../controllers/postController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// POST ACTIONS
router.post("/", authenticateJWT, createPostController);
router.post("/:id/share", authenticateJWT, sharePostController);

// CHECK SHARE
router.get("/:id/isShared", authenticateJWT, isSharedPostController);

// FEEDS
router.get("/", listPostsController);
router.get("/mine", authenticateJWT, myPostsController);
router.get("/mine/shared", authenticateJWT, getMyRepost);
router.get("/following", authenticateJWT, getFollowingFeed);
router.get("/all", authenticateJWT, getAllFeed);

// USER POSTS
router.get("/user/:username", authenticateJWT, listUserPostsController);

// SINGLE POST
router.get("/:id", authenticateJWT, getPostByIdController);
router.delete("/:id", authenticateJWT, deletePostController);
router.patch("/:id", authenticateJWT, updatePostController);

export default router;
