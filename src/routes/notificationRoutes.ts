import express from "express";
import db from "../db";
const router = express.Router();

router.get("/", async (req, res, next) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT * FROM notification WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, Number(limit), Number(offset)]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/seen", async (req, res, next) => {
  const userId = req.user.id;
  const id = req.params.id;
  try {
    const { rows } = await db.query(
      `UPDATE notification SET is_seen = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    const notif = rows[0];
    // Emitir evento socket para actualizar otras pestañas del mismo usuario
    const sockets = (req as any).io?.userSockets?.get(userId);
    if (sockets) {
      sockets.forEach(s => (req as any).io.to(s).emit("notification_seen", notif));
    }
    res.json(notif);
  } catch (err) {
    next(err);
  }
});

export default router;
