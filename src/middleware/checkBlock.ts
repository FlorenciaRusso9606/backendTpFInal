// middlewares/checkBlock.ts
import { Request, Response, NextFunction } from "express";
import * as BlockModel from "../models/blockModel";

export default async function checkBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const viewerId = (req as any).user?.id;
    const targetId = req.params.targetId 

    if (!viewerId) return res.status(401).json({ message: "No autenticado" });
    if (!targetId) return res.status(400).json({ message: "targetId requerido" });

    const targetBlockedViewer = await BlockModel.hasBlocked(targetId, viewerId);
    if (targetBlockedViewer) {
      return res.status(403).json({ message: "No puedes ver este perfil" });
    }
    next();
  } catch (err) {
    console.error("checkBlock middleware error:", err);
    return res.status(500).json({ message: "Error al verificar bloqueos" });
  }
}
