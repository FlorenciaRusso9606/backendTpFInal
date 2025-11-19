import { Router } from "express";
import * as UserController from "../controllers/userController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

/* ----------- Protected Routes ----------- */
router.use(authenticateJWT);

router.get("/", UserController.getUsers);
router.get("/search", UserController.searchUsersController);
router.get("/by-id/:id", UserController.getUser);
router.get("/by-username/:username", UserController.getProfileByUsername);
router.put("/:id", UserController.uploadMiddleware, UserController.editProfile);

export default router;
