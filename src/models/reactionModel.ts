import db from "../db";

interface Reaction{
    user_id: string;
    post_id: string | null;
    comment_id: string | null ;
    created_at: Date;
}

export const togglePostLikeDB = async (user_id: string, post_id: string) : Promise<{liked: boolean}> =>{
    const existing = await db.query<Reaction>(`
        SELECT 1 FROM reaction WHERE user_id = $1 and post_id = $2
        `, [user_id, post_id]);

 if ((existing.rowCount ?? 0) > 0) {
        await db.query<Reaction>(`DELETE FROM reaction WHERE user_id = $1 AND post_id = $2`, [user_id, post_id]);
         return {liked: false}
    }else{
        await db.query<Reaction>(
            `INSERT INTO reaction (user_id, post_id) VALUES ($1, $2)`, [user_id, post_id]
        )
        return {liked: true}
    }   
}

export const toggleCommenLikeDB = async (user_id: string, comment_id: string) : Promise<{liked: boolean}>=>{
    const existing = await db.query<Reaction>(`
        SELECT 1 FROM reaction WHERE user_id = $1 and comment_id = $2
        `, [user_id, comment_id]);
    if ((existing.rowCount ?? 0) > 0) {
        await db.query<Reaction>(`DELETE FROM reaction WHERE user_id = $1 AND comment_id = $2`, [user_id, comment_id]);
         return {liked: false}
    }else{
        await db.query<Reaction>(
            `INSERT INTO reaction (user_id, comment_id) VALUES ($1, $2)`, [user_id, comment_id]
        )
        return {liked: true}
    }   
}

export const getPostLikesCount = async (post_id:string) : Promise<number> =>{
    const res = await db.query(
        `SELECT COUNT(*) AS likes_count FROM reaction WHERE post_id = $1`, [post_id]
    )
    return parseInt(res.rows[0].likes_count, 10)
}

export const getCommentLikesCount  = async (comment_id :string) : Promise<number>=>{
    const res = await db.query(
        `SELECT COUNT(*) AS likes_count FROM reaction WHERE comment_id  = $1`, [comment_id]
    )
    return parseInt(res.rows[0].likes_count, 10)
}
export const getCheckLikedPostDB = async (user_id:string | undefined, postId: string) =>{
    const result = await db.query(`SELECT 1 FROM reaction WHERE user_id= $1 AND post_id = $2`, [user_id, postId]);
    return result.rowCount
}
export const getCheckLikedCommentDB = async (user_id:string | undefined, commentId: string) =>{
    const result = await db.query(`SELECT 1 FROM reaction WHERE user_id= $1 AND comment_id = $2`, [user_id, commentId])
    return result.rowCount
}
export const getMyLikedPosts = async (user_id: string) => {
    const result = await db.query(`
        SELECT
            p.id,
            p.text AS content,
            p.created_at,
            
            u.id AS author_id,
            u.username AS author_username,
             u.profile_picture_url AS post_author_avatar,

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

        FROM reaction r
        JOIN post p       ON r.post_id = p.id
        JOIN users u      ON p.author_id = u.id
        LEFT JOIN media ON p.id = media.post_id

        WHERE r.user_id = $1

         GROUP BY p.id, u.id, u.username, u.profile_picture_url

    ORDER BY MAX(r.created_at) DESC
    `, [user_id]);
    return result.rows;
};
export const getPostLikesUsersDB = async (postId: string) =>{
    const result = await db.query(`SELECT 
        u.id,
        u.username,
        u.displayname,
        u.profile_picture_url
     FROM reaction r
     JOIN users u ON u.id = r.user_id
     WHERE r.post_id = $1
     ORDER BY r.created_at DESC`, [postId])
        return result.rows
}