import db from "../db";

export const getNotificationsByUser = async (user_id: string) => {
  const q = `
    SELECT n.*, 
      json_build_object(
        'id', u.id,
        'username', u.username,
        'displayname', u.displayname,
        'profile_picture_url', u.profile_picture_url
      ) AS sender
    FROM notification n
    LEFT JOIN users u ON n.sender_id = u.id
    WHERE n.user_id = $1
    ORDER BY n.created_at DESC
  `;
  const r = await db.query(q, [user_id]);
  return r.rows;
};

export const getUnreadCount = async (user_id: string) => {
  const q = `SELECT COUNT(*) FROM notification WHERE user_id=$1 AND is_seen=FALSE`;
  const r = await db.query(q, [user_id]);
  return Number(r.rows[0].count);
};

export const markAsSeen = async (user_id: string) => {
  const q = `
    UPDATE notification
    SET is_seen = TRUE
    WHERE user_id=$1 AND is_seen=FALSE
    RETURNING *
  `;
  const r = await db.query(q, [user_id]);
  return r.rows;
};
