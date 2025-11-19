import { Router } from "express";
import { toggleUserStatus } from "../controllers/adminController";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";
import { getUsers } from "../controllers/userController";

const router = Router()
router.patch(
  "/users/:userId/toggle-status",
  authenticateJWT,
  authorizeRoles("ADMIN"),
  toggleUserStatus
);
router.get("/users", authenticateJWT, authorizeRoles("ADMIN"), getUsers);

export default router