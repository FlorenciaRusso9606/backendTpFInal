import { Router } from "express"
import * as FollowController from "../controllers/followController"
import { authenticateJWT } from "../middleware/auth"

const router = Router()

router.use(authenticateJWT)

// --- Rutas protegidas ---
router.post("/:targetId", FollowController.follow) 
router.delete("/:targetId", FollowController.unfollow) 
router.get("/:userId/followers", FollowController.getFollowers) 
router.get("/:userId/following", FollowController.getFollowing)
router.get("/:userId/status", FollowController.status)

export default router
