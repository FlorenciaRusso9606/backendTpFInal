import { Router } from "express";
import { block, unblock, status } from "../controllers/blockController";
import { authenticateJWT } from "../middleware/auth";
const router = Router();

router.post("/:targetId", authenticateJWT, block);
router.delete("/:targetId", authenticateJWT, unblock);
router.get("/:targetId/status", authenticateJWT, status);

export default router;
