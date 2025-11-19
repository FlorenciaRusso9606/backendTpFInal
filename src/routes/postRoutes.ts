import { Router } from "express";
import { 
  createPostController, 
  listPostsController, 
  getPostByIdController,
  sharePostController, isSharedPostController
} from "../controllers/postController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

router.get("/", listPostsController);
router.get("/mine", authenticateJWT, (req, res) => require("../controllers/postController").myPostsController(req, res));
router.get("/following", authenticateJWT, (req, res) => require("../controllers/postController").listFollowingPostsController(req, res));
router.post("/", authenticateJWT, createPostController);
router.post("/:id/share", authenticateJWT, sharePostController);
router.get("/:id/isShared", authenticateJWT, isSharedPostController);
router.get("/:id", authenticateJWT, getPostByIdController);
router.delete("/:id", authenticateJWT, (req, res) => require("../controllers/postController").deletePostController(req, res));
router.patch("/:id", authenticateJWT, (req, res) => require("../controllers/postController").updatePostController(req, res));


export default router;
