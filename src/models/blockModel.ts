import db from "../db"

/**
 * Inserta bloqueo y elimina follows mutuos
 */
export async function blockUser(blockerId: string, blockedId: string) {
    const client = await db.connect()
    try {
        await client.query("BEGIN")

        await client.query(
            `INSERT INTO blocks (blocker_id, blocked_id)
       VALUES ($1, $2)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
            [blockerId, blockedId]
        )

        // eliminar follows en ambas direcciones
        await client.query(
            `DELETE FROM follow
       WHERE (follower_id = $1 AND followed_id = $2)
          OR (follower_id = $2 AND followed_id = $1)`,
            [blockerId, blockedId]
        )

        await client.query("COMMIT")
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}

export async function unblockUser(blockerId: string, blockedId: string) {
    await db.query(
        `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
        [blockerId, blockedId]
    )
}

/** Devuelve true si blocker_id bloqueó a blocked_id */
export async function hasBlocked(blockerId: string, blockedId: string) {
    const res = await db.query(
        `SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1`,
        [blockerId, blockedId]
    )
    return res.rowCount > 0
}

/** Devuelve true si existe bloqueo en cualquiera de las dos direcciones */
export async function isEitherBlocked(a: string, b: string) {
    const res = await db.query(
        `SELECT 1 FROM blocks 
     WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
        [a, b]
    )
    return res.rowCount > 0
}

/** Estado combinado útil para el frontend */
export async function getBlockStatus(viewerId: string, targetId: string) {
    const blockedByYou = await hasBlocked(viewerId, targetId)  // viewer bloqueó target
    const blockedByThem = await hasBlocked(targetId, viewerId) // target bloqueó viewer
    return { blockedByYou, blockedByThem }
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
    const query = `
    SELECT CASE
      WHEN blocker_id = $1 THEN blocked_id
      WHEN blocked_id = $1 THEN blocker_id
    END as blocked_user
    FROM blocks
    WHERE blocker_id = $1 OR blocked_id = $1
  `
    const { rows } = await db.query(query, [userId])
    return rows.map(r => r.blocked_user)
}