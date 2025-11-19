import db from "../db";

export const findConversationBetween = async (a: string, b: string) => {
  const result = await db.query(
    `SELECT c.id
     FROM conversation c
     JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $1
     JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $2
     WHERE c.is_group = FALSE
     LIMIT 1`,
    [a, b]
  );
  return result.rows[0]?.id || null;
};

export const createConversationBetween = async (a: string, b: string) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(`INSERT INTO conversation (is_group, created_at) VALUES (FALSE, now()) RETURNING id`, []);
    const convId = r.rows[0].id;
    await client.query(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`, [convId, a, b]);
    await client.query("COMMIT");
    return convId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const createMessage = async (fromUserId: string, toUserId: string, text: string) => {
  
  let convId = await findConversationBetween(fromUserId, toUserId);
  if (!convId) convId = await createConversationBetween(fromUserId, toUserId);

  const result = await db.query(
    `INSERT INTO messages (conversation_id, sender_id, text, created_at)
     VALUES ($1, $2, $3, now()) RETURNING id, conversation_id, sender_id, text, created_at`,
    [convId, fromUserId, text]
  );
  return result.rows[0];
};

export const getMessagesBetween = async (a: string, b: string) => {
  const convId = await findConversationBetween(a, b);
  if (!convId) return [];
  const result = await db.query(`SELECT id, conversation_id, sender_id, text, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`, [convId]);
  return result.rows;
};

export const getConversationsForUser = async (userId: string) => {
  const result = await db.query(
    `SELECT DISTINCT ON (m.conversation_id) m.conversation_id, m.text, m.sender_id, m.created_at,
            other.user_id AS other_user_id, u.username, u.displayname, u.profile_picture_url
     FROM (
       SELECT c.id AS conversation_id,
         (SELECT user_id FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id <> $1 LIMIT 1) AS user_id
       FROM conversation c
       JOIN conversation_participants cp ON cp.conversation_id = c.id
       WHERE cp.user_id = $1
     ) other
     JOIN messages m ON m.conversation_id = other.conversation_id
     JOIN users u ON u.id = other.user_id
     ORDER BY m.conversation_id, m.created_at DESC`,
    [userId]
  );

  return result.rows.map((r: any) => ({
    otherUser: { id: r.other_user_id, username: r.username, displayname: r.displayname, profile_picture_url: r.profile_picture_url },
    lastMessage: { text: r.text, from: r.sender_id, created_at: r.created_at }
  }));
};
