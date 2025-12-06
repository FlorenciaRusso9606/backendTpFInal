import db from "../db";
import { Comment } from "../types/comment";

const MAX_DEPTH = 6;

export const getCommentOwner = async (commentId: string) => {
  const result = await db.query("SELECT author_id FROM user_comments WHERE id = $1", [commentId]);
  return result.rows[0]?.author_id;
};

export const insertCommentDB = async (
  author_id: string,
  post_id: string,
  text: string,
  parent_id?: string | null
): Promise<Comment> => {

  // Inserto el comentario
  const result = await db.query<Comment>(
  `
  INSERT INTO user_comments (author_id, post_id, text, parent_id, author_avatar)
  VALUES ($1, $2, $3, $4, (SELECT profile_picture_url FROM users WHERE id = $1))
  RETURNING 
    id,
    author_id,
    post_id,
    text,
    parent_id,
    created_at,
    updated_at,
    author_avatar,
    (SELECT username FROM users WHERE id = $1) AS author_username
  `,
  [author_id, post_id, text, parent_id || null]
);

  return result.rows[0];

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
       u.profile_picture_url AS author_avatar,
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
export const getMyComments = async (user_id: string) => {
  const result = await db.query(`
    SELECT 
        c.id,
        c.text AS content,
        c.created_at,

        -- Autor del comentario
        cu.username AS comment_author,
        cu.profile_picture_url AS comment_author_avatar,

        -- Datos del post
        p.id AS post_id,
        p.text AS post_content,

        -- Autor del post
        pu.username AS post_author,
        pu.profile_picture_url AS post_author_avatar,

        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', media.id,
              'url', media.url,
              'type', media.type
            )
          ) FILTER (WHERE media.id IS NOT NULL),
          '[]'
        ) AS media

    FROM user_comments c
    
    JOIN users cu ON c.author_id = cu.id
    
    JOIN post p ON c.post_id = p.id
    
    LEFT JOIN users pu ON p.author_id = pu.id
    
    LEFT JOIN media ON p.id = media.post_id

    WHERE c.author_id = $1

    GROUP BY 
      c.id,
      cu.username,
      cu.profile_picture_url,
      p.id,
      pu.username,
      pu.profile_picture_url

    ORDER BY c.created_at DESC
  `, [user_id]);

  return result.rows;
};

