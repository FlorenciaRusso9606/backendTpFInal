import db from "../db";

/** Inserta o elimina follow según la acción */
export async function toggleFollow(followerId: string, followedId: string, action: "follow" | "unfollow") {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    if (action === "follow") {
      await client.query(
        `INSERT INTO follow (follower_id, followed_id)
         VALUES ($1, $2)
         ON CONFLICT (follower_id, followed_id) DO NOTHING`,
        [followerId, followedId]
      );

      await client.query(
        `INSERT INTO notification (user_id, type, ref_id)
         VALUES ($1, 'FOLLOW', $2)
         ON CONFLICT DO NOTHING`,
        [followedId, followerId]
      );
    } else {
      await client.query(
        `DELETE FROM follow 
         WHERE follower_id = $1 AND followed_id = $2`,
        [followerId, followedId]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function isFollowing(followerId: string, followedId: string) {
  const { rowCount } = await db.query(
    `SELECT 1 FROM follow WHERE follower_id = $1 AND followed_id = $2`,
    [followerId, followedId]
  );
  return rowCount > 0;
}

export async function getFollowRelations(userId: string, relation: "followers" | "following") {
  const query =
    relation === "followers"
      ? `
        SELECT u.id, u.username, u.displayname, u.profile_picture_url
        FROM follow f
        JOIN users u ON f.follower_id = u.id
        WHERE f.followed_id = $1
      `
      : `
        SELECT u.id, u.username, u.displayname, u.profile_picture_url
        FROM follow f
        JOIN users u ON f.followed_id = u.id
        WHERE f.follower_id = $1
      `;

  const { rows } = await db.query(query, [userId]);
  return rows;
}

export async function getFollowStatus(viewerId: string, targetId: string) {
  const { rows } = await db.query(
    `
    SELECT
      EXISTS (
        SELECT 1 FROM follow WHERE follower_id = $1 AND followed_id = $2
      ) AS "isFollowing",
      EXISTS (
        SELECT 1 FROM follow WHERE follower_id = $2 AND followed_id = $1
      ) AS "isFollowedBy"
    `,
    [viewerId, targetId]
  );
  return rows[0];
}
