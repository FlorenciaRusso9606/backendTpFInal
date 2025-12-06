import { Server } from "socket.io";
import { Pool } from "pg";
import { ENV } from "../config/env";
import { NotificationCreatePayload } from "../types/notification";

export default class NotificationService {
  db: Pool;
  io: Server;
  userSockets: Map<string, Set<string>> | undefined;

  constructor(db: Pool, io: Server) {
    this.db = db;
    this.io = io;
    this.userSockets = (io as any).userSockets;
  }

  async createNotification(p: NotificationCreatePayload) {
    const insert = await this.db.query(
      `
      INSERT INTO notification (user_id, sender_id, type, ref_id, ref_type, message, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
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

    const baseNotif = insert.rows[0];

    const { rows } = await this.db.query(
      `
      SELECT n.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'displayname', u.displayname,
          'profile_picture_url', u.profile_picture_url
        ) AS sender
      FROM notification n
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.id = $1
    `,
      [baseNotif.id]
    );

    let notif = rows[0];

    // 🔥 Cargar el objeto referenciado dinámicamente
    notif.ref = await this.loadReferenceObject(notif.ref_type, notif.ref_id);

    // Emitir por sockets
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
      const sockets = this.userSockets?.get(userId);
      if (sockets) {
        sockets.forEach((s) => this.io.to(s).emit("notification_seen", notif));
      }
    }
    return notif;
  }

  private async loadReferenceObject(refType: string | null, refId: string | null) {
    if (!refId || !refType) return null;

    switch (refType) {
      case "POST": {
        const { rows } = await this.db.query(
          `
          SELECT p.*, 
            json_build_object(
              'id', u.id,
              'username', u.username,
              'displayname', u.displayname,
              'profile_picture_url', u.profile_picture_url
            ) AS author
          FROM posts p
          JOIN users u ON u.id = p.author_id
          WHERE p.id = $1
        `,
          [refId]
        );
        return rows[0] || null;
      }

      case "USER": {
        const { rows } = await this.db.query(
          `
          SELECT id, username, displayname, profile_picture_url
          FROM users
          WHERE id = $1
        `,
          [refId]
        );
        return rows[0] || null;
      }

      case "COMMENT": {
        const { rows } = await this.db.query(
          `
          SELECT c.*, 
            json_build_object(
              'id', u.id,
              'username', u.username,
              'displayname', u.displayname,
              'profile_picture_url', u.profile_picture_url
            ) AS author
          FROM user_comments c
          JOIN users u ON u.id = c.author_id
          WHERE c.id = $1
        `,
          [refId]
        );
        return rows[0] || null;
      }

      default:
        return null;
    }
  }
}
