// src/services/notificationService.ts
import { Server } from "socket.io";
import { Pool } from "pg";
import { ENV } from "../config/env";
import { NotificationPayload } from "../types/notification";
import { getUser } from "../controllers/userController";

export default class NotificationService {
  db: Pool;
  io: Server;
  userSockets: Map<string, Set<string>> | undefined;

  constructor(db: Pool, io: Server) {
    this.db = db;
    this.io = io;
    this.userSockets = (io as any).userSockets;
  }

  async createNotification(p: NotificationPayload) {
    const { rows } = await this.db.query(
      `INSERT INTO notification (user_id, sender_id, type, ref_id, ref_type, message, metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *,
        (SELECT username FROM users WHERE id = $1) AS recipient_username,
        (SELECT username FROM users WHERE id = $2) AS sender_username,
        (SELECT profile_picture_url FROM users WHERE id = $2) AS avatar_sender_username
      `,
      [
        p.user_id,
        p.sender_id || null,
        p.type,
        p.ref_id || null,
        p.ref_type || null,
        p.message || null,
        p.metadata ? JSON.stringify(p.metadata) : {}
      ]
    );

    const notif = rows[0];
    // Emitir via socket a todos los sockets del user si están online
    try {
      const sockets = this.userSockets?.get(p.user_id);
      if (sockets && sockets.size > 0) {
        sockets.forEach((socketId) => {
          this.io.to(socketId).emit("notification", notif);
        });
      }
    } catch (err) {
      console.error("Error emitting notification:", err);
    }

    return notif;
  }

  // Opcional: marcar como leída
  async markAsSeen(notificationId: string, userId: string) {
    const { rows } = await this.db.query(
      `UPDATE notification SET is_seen = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId]
    );
    const notif = rows[0];
    if (notif) {
      // emitir evento a sockets del usuario para sincronizar UI
      const sockets = this.userSockets?.get(userId);
      if (sockets) {
        sockets.forEach((s) => this.io.to(s).emit("notification_seen", notif));
      }
    }
    return notif;
  }
}
