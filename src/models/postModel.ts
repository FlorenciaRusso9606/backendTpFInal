import db from "../db";
import { randomUUID } from "crypto";

export const createMedia = async (url: string, type: string, size: number, uploaderId?: string, post_id?: string | null) => {
  const id = randomUUID();
  
  const q = `
    INSERT INTO media (id, post_id, url, type, width, height)
    VALUES ($1, $2, $3, $4, NULL, NULL)
    RETURNING *`;
  const r = await db.query(q, [id, post_id, url, type]);
  return r.rows[0];
};

export const createPost = async ({ author_id, text, link_url, media_id, weather }:
  { author_id: string; text: string; link_url?: string | null; media_id?: string | null; weather?: any | null }) => {
  const id = randomUUID();
  const q = `
    INSERT INTO post (id, author_id, text, link_url, weather, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *`;
  const r = await db.query(q, [id, author_id, text, link_url, weather ? JSON.stringify(weather) : null]);
  
  if (media_id) {
    await db.query(`UPDATE media SET post_id = $1 WHERE id = $2`, [r.rows[0].id, media_id]);
  }
  return r.rows[0];
};

export const getPosts = async () => {
  const q = `
    SELECT 
      p.id,
      p.text,
      p.link_url,
  p.created_at,
  p.weather,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'displayname', u.displayname,
        'profile_picture_url', u.profile_picture_url
      ) AS author,

      COALESCE(
        (
          SELECT json_agg(jsonb_build_object('url', m.url, 'type', m.type))
          FROM media m
          WHERE m.post_id = p.id
        ),
        '[]'
      ) AS medias,

      CASE WHEN sp.id IS NOT NULL AND sp.is_blocked = FALSE THEN json_build_object(
        'id', sp.id,
        'text', sp.text,
        'link_url', sp.link_url,
        'created_at', sp.created_at,
        'author', json_build_object(
          'id', spu.id,
          'username', spu.username,
          'displayname', spu.displayname,
          'profile_picture_url', spu.profile_picture_url
        ),
        'medias', COALESCE((
          SELECT json_agg(jsonb_build_object('url', sm.url, 'type', sm.type))
          FROM media sm
          WHERE sm.post_id = sp.id
        ), '[]')
      )
  ELSE NULL END AS shared_post

    FROM post p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN post sp ON p.shared_post_id = sp.id
    LEFT JOIN users spu ON sp.author_id = spu.id
    -- Exclude posts that are shares of a missing or blocked original
    WHERE p.is_blocked = FALSE
      AND (p.shared_post_id IS NULL OR (sp.id IS NOT NULL AND sp.is_blocked = FALSE))
    ORDER BY p.created_at DESC
    LIMIT 50`;
  const r = await db.query(q, []);
  return r.rows.map(row => ({
    id: row.id,
    text: row.text,
    link_url: row.link_url,
    weather: row.weather ? (typeof row.weather === 'string' ? JSON.parse(row.weather) : row.weather) : null,
    created_at: row.created_at,
    author: row.author || null,
    medias: row.medias || [],
    shared_post: row.shared_post || null,
  }));
};

export const getPostsByFollowed = async (userId: string) => {
  const q = `
    SELECT 
      p.id,
      p.text,
      p.link_url,
  p.created_at,
  p.weather,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'displayname', u.displayname,
        'profile_picture_url', u.profile_picture_url
      ) AS author,

      COALESCE(
        (
          SELECT json_agg(jsonb_build_object('url', m.url, 'type', m.type))
          FROM media m
          WHERE m.post_id = p.id
        ),
        '[]'
      ) AS medias,

      CASE WHEN sp.id IS NOT NULL AND sp.is_blocked = FALSE THEN json_build_object(
        'id', sp.id,
        'text', sp.text,
        'link_url', sp.link_url,
        'created_at', sp.created_at,
        'author', json_build_object(
          'id', spu.id,
          'username', spu.username,
          'displayname', spu.displayname,
          'profile_picture_url', spu.profile_picture_url
        ),
        'medias', COALESCE((
          SELECT json_agg(jsonb_build_object('url', sm.url, 'type', sm.type))
          FROM media sm
          WHERE sm.post_id = sp.id
        ), '[]')
      )
  ELSE NULL END AS shared_post

    FROM post p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN post sp ON p.shared_post_id = sp.id
    LEFT JOIN users spu ON sp.author_id = spu.id
    -- Only posts from users that the given user follows
    WHERE p.is_blocked = FALSE
      AND p.author_id IN (SELECT followed_id FROM follow WHERE follower_id = $1)
      AND (p.shared_post_id IS NULL OR (sp.id IS NOT NULL AND sp.is_blocked = FALSE))
    ORDER BY p.created_at DESC
    LIMIT 50`;
  const r = await db.query(q, [userId]);
  return r.rows.map(row => {
    const parsedWeather = row.weather ? (typeof row.weather === 'string' ? JSON.parse(row.weather) : row.weather) : null;
    return {
      id: row.id,
      text: row.text,
      link_url: row.link_url,
      weather: parsedWeather,
      created_at: row.created_at,
      author: row.author || null,
      medias: row.medias || [],
      shared_post: row.shared_post || null,
    };
  });
};

export const getPostsByAuthor = async (authorId: string) => {
  const q = `
    SELECT 
      p.*,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'displayname', u.displayname,
        'profile_picture_url', u.profile_picture_url
      ) AS author,

      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object('url', m.url, 'type', m.type)
        ) FILTER (WHERE m.id IS NOT NULL),
        '[]'
      ) AS medias,

      sp.id AS shared_post_id,
      sp.text AS shared_post_text,
      sp.link_url AS shared_post_link,
      sp.created_at AS shared_post_created_at,
  (sp.is_blocked = FALSE) AS shared_post_id_visible,

      json_build_object(
        'id', spu.id,
        'username', spu.username,
        'displayname', spu.displayname,
        'profile_picture_url', spu.profile_picture_url
      ) AS shared_author,

      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object('url', sm.url, 'type', sm.type)
        ) FILTER (WHERE sm.id IS NOT NULL),
        '[]'
      ) AS shared_medias

    FROM post p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN media m ON m.post_id = p.id
    LEFT JOIN post sp ON p.shared_post_id = sp.id
    LEFT JOIN users spu ON sp.author_id = spu.id
    LEFT JOIN media sm ON sm.post_id = sp.id
  WHERE p.author_id = $1 AND p.is_blocked = FALSE
    AND (p.shared_post_id IS NULL OR (sp.id IS NOT NULL AND sp.is_blocked = FALSE))
    GROUP BY p.id, u.id, sp.id, spu.id
    ORDER BY p.created_at DESC
    LIMIT 100;
  `;

  const r = await db.query(q, [authorId]);

  return r.rows.map(row => ({
    id: row.id,
    text: row.text,
    link_url: row.link_url,
    weather: row.weather ? (typeof row.weather === 'string' ? JSON.parse(row.weather) : row.weather) : null,
    created_at: row.created_at,
    author: row.author,
    medias: row.medias || [],
    shared_post: row.shared_post_id && row.shared_post_id_visible
      ? {
          id: row.shared_post_id,
          text: row.shared_post_text,
          link_url: row.shared_post_link,
          created_at: row.shared_post_created_at,
          author: row.shared_author,
          medias: row.shared_medias || [],
        }
      : null,
  }));
};

export const deletePostById = async (postId: string) => {
  await db.query(`DELETE FROM post WHERE id = $1`, [postId]);
};

export const updatePostText = async (postId: string, text: string) => {
  const q = `UPDATE post SET text = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
  const r = await db.query(q, [text, postId]);
  return r.rows[0];
};

export const getPostById = async (postId: string) => {
  const q = `
    SELECT p.id, p.text, p.link_url, p.created_at, p.weather, p.shared_post_id,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'displayname', u.displayname,
        'profile_picture_url', u.profile_picture_url
      ) AS author,
      COALESCE(json_agg(json_build_object('url', m.url, 'type', m.type) ORDER BY m.id) FILTER (WHERE m.id IS NOT NULL), '[]') as medias
    FROM post p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN media m ON m.post_id = p.id
    WHERE p.id = $1 AND is_blocked = FALSE
    GROUP BY p.id, u.id
    LIMIT 1`;
  const r = await db.query(q, [postId]);
  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  // if this post is a share, ensure the original exists and is not blocked
  if (row.shared_post_id) {
    const check = await db.query(`SELECT 1 FROM post WHERE id = $1 AND is_blocked = FALSE`, [row.shared_post_id]);
    if ((check?.rowCount ?? 0) === 0) return null;
  }
    return {
    id: row.id,
    text: row.text,
    link_url: row.link_url,
    weather: row.weather ? (typeof row.weather === 'string' ? JSON.parse(row.weather) : row.weather) : null,
    created_at: row.created_at,
    author: row.author || null,
    medias: row.medias || [],
  };
};

export const blockPostById = async (postId: string) => {
  const q = `
    UPDATE post
    SET is_blocked = true
    WHERE id = $1 OR shared_post_id = $1
    RETURNING *;
  `;
  const r = await db.query(q, [postId]);
  return r.rows[0];
};

export const unblockPostById = async (postId: string) => {
  const q = `
    UPDATE post
    SET is_blocked = false
    WHERE id = $1 OR shared_post_id = $1
    RETURNING *;
  `;
  const r = await db.query(q, [postId]);
  return r.rows[0];
};

export const sharePost = async (author_id: string, original_post_id: string, text?: string | null) => {
  const id = randomUUID();
  const q = `
    INSERT INTO post (id, author_id, text, shared_post_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING *;
  `;
  const r = await db.query(q, [id, author_id, text || null, original_post_id]);
  return r.rows[0];
};

export const hasUserSharedPost = async (author_id: string, original_post_id: string) => {
  const q = `
    SELECT 1 
    FROM post 
    WHERE author_id = $1 
      AND shared_post_id = $2
      AND is_blocked = FALSE
    LIMIT 1;
  `;
  const r = await db.query(q, [author_id, original_post_id]);
  return (r?.rowCount ?? 0) > 0;
};
