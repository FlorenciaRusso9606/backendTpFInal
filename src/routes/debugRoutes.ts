import { Router } from "express";
import * as DebugController from "../controllers/debugController";

const router = Router();

router.post("/send-test-email", DebugController.sendTestEmail);
router.get("/env", DebugController.showEnv);
router.get("/fetch", DebugController.fetchUrl);

export default router;
