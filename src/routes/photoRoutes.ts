import { Router } from "express";
import * as PhotoController from "../controllers/photoController";

const router = Router();

// GET /api/photo?query=rain
router.get("/", PhotoController.getPhoto);

export default router;
