import db from "../db";
import { DbUser as User } from "../types/user";

export const createUser = async (
  email: string,
  username: string,
  passwordHash: string,
  displayname: string
): Promise<User> => { //agrego la promesa de tipo ya que si no, es 'any', lo que no es común en typescript
  const result = await db.query(
    `INSERT INTO users (email, username, password_hash, displayname) 
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, username, displayname, role, status`,
    [email, username, passwordHash, displayname]
  );
  return result.rows[0] as User; // casteo a User para asegurar el tipo
}

export const createUserPendingVerification = async (
  email: string,
  username: string,
  passwordHash: string,
  displayname: string
): Promise<User> => {
  const result = await db.query(
    `INSERT INTO users (email, username, password_hash, displayname, status)
     VALUES ($1, $2, $3, $4, 'SUSPENDED')
     RETURNING id, email, username, displayname, role, status`,
    [email, username, passwordHash, displayname]
  );
  return result.rows[0] as User;
};

// verificar email
export const createEmailVerification = async (
  userId: string,
  token: string,
  expiresAt: Date
) => {
  await db.query(
    `INSERT INTO email_verifications (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );
};

// encontrar la verificación del token
export const findVerificationByToken = async (token: string) => {
  const result = await db.query(
    `SELECT * FROM email_verifications WHERE token = $1`,
    [token]
  );
  return result.rows[0];
};

// actualizar token a verificado
export const markVerificationUsed = async (id: string) => {
  await db.query(`UPDATE email_verifications SET used = TRUE WHERE id = $1`, [
    id,
  ]);
};

// actualizar el usuario a 'activo'
export const activateUser = async (userId: string) => {
  const result = await db.query(
    `UPDATE users SET status = 'ACTIVE', updated_at = now() WHERE id = $1 RETURNING id, email, username, displayname, status`,
    [userId]
  );
  return result.rows[0];
};

export const findUserByIdentifier = async (identifier: string): Promise<User | null> => {
  const result = await db.query(
    `SELECT * FROM users WHERE email = $1 OR username = $1 LIMIT 1`,
    [identifier]
  );
  return result.rows[0] || null;
};

