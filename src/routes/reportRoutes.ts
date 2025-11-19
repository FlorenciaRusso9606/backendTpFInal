import { Router } from "express";
import { create, updateStatus, getByStatus, revertReport } from "../controllers/reportController";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";

const router = Router();

// Crear un nuevo reporte
router.post("/", authenticateJWT, create);

// Obtener reportes por estado (pending, reviewed, dismissed)
router.get("/:status", authenticateJWT, getByStatus);

// Actualizar estado del reporte
router.patch("/:id", authenticateJWT, updateStatus);
router.patch("/:id/revert", authenticateJWT, authorizeRoles("ADMIN"), (req, res) => require("../controllers/reportController").revertReport(req, res));

export default router;
