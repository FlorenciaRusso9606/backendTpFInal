import { Request, Response } from "express";
import { blockPostById } from "../models/postModel";
import * as ReportModel from "../models/reportModel";

export const create = async (req: Request, res: Response) => {
  try {
    const { targetType, targetId, reason } = req.body;
    const reporterId = (req as any).user.id;
    const report = await ReportModel.createReport(
      reporterId,
      targetType,
      targetId,
      reason
    );
    res.status(201).json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear reporte" });
  }
};


export const getByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;

    if (!['pending', 'blocked', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    const reports = await ReportModel.getReportsByStatus(status as 'pending' | 'blocked' | 'dismissed');
    res.json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener reportes" });
  }
};


export const updateStatus = async (req: Request, res: Response) => {
  console.log("🪵 PATCH /reports/:id");
  console.log("Params:", req.params);
  console.log("Body:", req.body);
  console.log("User:", req.user);
  try {
    console.log("Body: ", req.body)
    console.log("Params: ", req.params)
    const { action } = req.body;
    console.log("STATUS", action)
    const { id } = req.params;
    const { target_id } = req.body
    console.log("Target Id", target_id)
    if (!action) {
      return res.status(400).json({ message: "Falta el campo 'status'" });
      console.log("entró aqui")
    }

    if (action === 'blocked') {
      await blockPostById(target_id)
    }
    const report = await ReportModel.updateReportStatus(id, action);

    if (!report) {
      return res.status(404).json({ message: "Reporte no encontrado" });
    }

    res.json(report);
  } catch (error) {
    console.error("Error al actualizar reporte:", error);
    res.status(500).json({ message: "Error interno al actualizar reporte" });
  }
};

export const revertReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { target_id } = req.body;

    if (!target_id) return res.status(400).json({ message: 'Falta target_id' });

  // Only applicable for post targets — if needed, extend for comments
  const { unblockPostById } = require('../models/postModel');
    await unblockPostById(target_id);

    // mark report as dismissed (reverted)
    const report = await ReportModel.updateReportStatus(id, 'dismissed');
    if (!report) return res.status(404).json({ message: 'Reporte no encontrado' });

    res.json({ message: 'Post revertido y reporte actualizado', report });
  } catch (error) {
    console.error('Error al revertir reporte:', error);
    res.status(500).json({ message: 'Error interno al revertir reporte' });
  }
}
