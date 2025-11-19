import db from "../db";
import { Comment } from "../types/comment";

const MAX_DEPTH = 6;

export const insertCommentDB = async (
  author_id: string,
  post_id: string,
  text: string,
  parent_id?: string | null
): Promise<Comment> => {
   const result = await db.query<Comment>(
    ` INSERT INTO user_comments (author_id, post_id, text, parent_id, author_avatar)
    VALUES ($1, $2, $3, $4, (SELECT profile_picture_url FROM users WHERE id = $1))
    RETURNING id, author_id, post_id, text, parent_id, created_at, updated_at, author_avatar`,
    [author_id, post_id, text, parent_id || null]
  );

  const newComment = result.rows[0];

  // Ahora hacemos el JOIN para traer el username
  const userResult = await db.query<Comment>(
    `SELECT c.id, c.author_id, u.username AS author_username, c.post_id, c.text, c.parent_id, c.created_at, c.updated_at
     FROM user_comments c
     JOIN users u ON c.author_id = u.id
     WHERE c.id = $1`,
    [author_id]
  );

  return {
    ...newComment,
    author_username: userResult.rows[0]?.username || "Unknown",
  } as Comment;

};



export const getCommentDepth = async (commentId: string) => {
  const result = await db.query<{ depth: number }>(
    `
    WITH RECURSIVE comment_ancestors AS (
      SELECT id, parent_id, 1 AS depth
      FROM user_comments
      WHERE id = $1
      UNION ALL
      SELECT parent_comment.id, parent_comment.parent_id, comment_ancestors.depth + 1 AS depth
      FROM user_comments AS parent_comment
      JOIN comment_ancestors ON parent_comment.id = comment_ancestors.parent_id
      WHERE comment_ancestors.depth < $2
    )
    SELECT MAX(depth) AS depth
    FROM comment_ancestors;
    `,
    [commentId, MAX_DEPTH]
  );
  return result.rows[0]?.depth || 1;
};

export const deleteCommentDB = async (commentId: string) => {
    // 1. Buscar el comentario
  const result = await db.query<Comment>(
    `SELECT id, author_id, post_id, text, parent_id, created_at, updated_at
     FROM user_comments
     WHERE id = $1`,
    [commentId]
  );
  const comment = result.rows[0];

  if (!comment) return null;

  // 2. Eliminarlo
  await db.query(`DELETE FROM user_comments WHERE id = $1`, [commentId]);

  // 3. Devolverlo para usar en el controlador
  return comment;
};

export const updateCommentDB = async (commentId: string, text: string) => {
  const result = await db.query<Comment>(
    `UPDATE user_comments
     SET text = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [text, commentId]
  );
  return result.rows[0];
};

export const getCommentsByPostDB = async (postId: string) => {
  const result = await db.query<Comment>(
    `
    SELECT 
     c.id,
      c.author_id,
      u.username AS author_username,
      c.post_id,
      c.text,
      c.created_at,
      c.parent_id
    FROM user_comments c
     JOIN users u ON c.author_id = u.id
    WHERE c.post_id = $1
    ORDER BY c.created_at ASC
    `,
    [postId]
  );
  return result.rows;
};

export const findCommentDB = async (commentId: string) => {
  const result = await db.query<Comment>(
     `
    SELECT 
      c.id,
      c.author_id,
      u.username AS author_username,
      c.post_id,
      c.text,
      c.created_at,
      c.parent_id
    FROM user_comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.id = $1
    `,
    [commentId]
  );
  return result.rows[0];
};
