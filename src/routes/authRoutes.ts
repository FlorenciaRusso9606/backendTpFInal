import { Router } from "express";
import * as AuthController from "../controllers/authController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

/* ----------- Public Routes ----------- */
router.post("/register", AuthController.registerUser);
router.post("/login", AuthController.loginUser);
router.get("/verify", AuthController.verifyUser);

router.post("/forgotPassword", AuthController.forgotPassword);
router.put("/updatePassword", AuthController.updatePassword);

/* ----------- Protected Routes ----------- */
router.use(authenticateJWT);

router.get("/me", AuthController.getMe);
router.post("/logout", AuthController.logoutUser);
router.get("/socket-token", AuthController.getSocketToken);

export default router;
