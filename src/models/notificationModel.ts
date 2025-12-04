// src/models/notificationModel.ts
import { Pool } from "pg";

export default class NotificationModel {
  db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async createNotification(data: any) {
    const { user_id, sender_id, type, ref_id, ref_type, message, metadata } = data;

    const { rows } = await this.db.query(
      `INSERT INTO notification 
        (user_id, sender_id, type, ref_id, ref_type, message, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        user_id,
        sender_id || null,
        type,
        ref_id || null,
        ref_type || null,
        message || null,
        metadata ? JSON.stringify(metadata) : {}
      ]
    );

    return rows[0];
  }

  async markAsSeen(notificationId: string, userId: string) {
    const { rows } = await this.db.query(
      `UPDATE notification 
         SET is_seen = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    return rows[0];
  }
}
