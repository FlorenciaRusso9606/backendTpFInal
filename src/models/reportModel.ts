import db from "../db";

export const createReport = async (reporterId: number, targetType: 'post' | 'comment', targetId: number, reason: string) => {
  const query = `
    INSERT INTO reports (reporter_id, target_type, target_id, reason)
    VALUES ($1, $2, $3, $4) RETURNING *;
  `;
  const values = [reporterId, targetType, targetId, reason];
  const { rows } = await db.query(query, values);
  return rows[0];
};

export const getReportsByStatus = async (status: 'pending' | 'blocked' | 'dismissed') => {
  const query = `
    SELECT r.*, u.username AS reporter_username
    FROM reports r
    JOIN users u ON u.id = r.reporter_id
    WHERE r.status = $1
    ORDER BY r.created_at DESC;
  `;
  const { rows } = await db.query(query, [status]);
  return rows;
};

export const updateReportStatus = async (reportId: string, action: 'blocked' | 'dismissed') => {
  const query = `
    UPDATE reports
    SET status = $2
    WHERE id = $1
    RETURNING *;
  `;
  const values = [reportId, action];
  const { rows } = await db.query(query, values);
  return rows[0];
};
