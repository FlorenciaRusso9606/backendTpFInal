import { Router } from "express";
import { translate } from "../controllers/translationController";

const router = Router();

router.post("/", translate);

export default router;
