import db from "../db";
import { DbUser as User } from "../types/user";

// buscar usuarios
export async function searchUsers(searchTerm: string, excludeIds: string[]): Promise<any[]> {
  const query = `
    SELECT 
      id, 
      username, 
      displayname, 
      role, 
      status, 
      profile_picture_url
    FROM users
    WHERE (username ILIKE $1 OR displayname ILIKE $1)
    AND role = 'USER'
    AND (array_length($2::uuid[], 1) IS NULL OR id <> ALL($2::uuid[]))
    LIMIT 20
  `;

  const values = [`%${searchTerm}%`, excludeIds.length > 0 ? excludeIds : null];
  const { rows } = await db.query(query, values);

  return rows;
}

// encontrar usuario por id
export const findUserById = async (id: string) => {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0];
};

export const getUserById = async (id: string) => {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0];
};

// traer a todos los usuarios
export const getAllUsers = async (): Promise<User[]> => {
  const result = await db.query("SELECT * FROM users");
  return result.rows as User[];
};

export const updateUserProfile = async (
  id: string,
  { username, displayname, bio, profile_picture_url, password_hash, country_iso, city }:
  { username?: string; displayname?: string; bio?: string; profile_picture_url?: string; password_hash?: string; country_iso?:string, city?:string}
) => {
  const fields = [];
  const values: any[] = [id];
  let idx = 2;

  if (username !== undefined) {
    fields.push(`username = COALESCE($${idx++}, username)`);
    values.push(username);
  }
  if (displayname !== undefined) {
    fields.push(`displayname = COALESCE($${idx++}, displayname)`);
    values.push(displayname);
  }
  if (country_iso !== undefined) {
  fields.push(`country_iso = COALESCE($${idx++}, country_iso)`);
  values.push(country_iso);
}
  if (city !== undefined) {
  fields.push(`city = COALESCE($${idx++}, city)`);
  values.push(city);
}
  if (bio !== undefined) {
    fields.push(`bio = COALESCE($${idx++}, bio)`);
    values.push(bio);
  }
  if (profile_picture_url !== undefined) {
    fields.push(`profile_picture_url = COALESCE($${idx++}, profile_picture_url)`);
    values.push(profile_picture_url);
  }
  if (password_hash !== undefined) {
    fields.push(`password_hash = COALESCE($${idx++}, password_hash)`);
    values.push(password_hash);
  }
  fields.push("updated_at = NOW()");

  const result = await db.query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0];
};

//cambiar estado de un usuario
export const updateUserStatus = async (userId: string, status: "ACTIVE" | "SUSPENDED") => {
  const result = await db.query(
    `UPDATE users SET status = $1, updated_at = now()
    WHERE id = $2
    RETURNING id, email, username, displayname, role, status`,
    [status, userId]
  )
  return result.rows[0]
}

export const insertUser = async (user: User): Promise<User> => {
  const query = `
    INSERT INTO users (
      id, email, password_hash, username, displayname, bio,
      profile_picture_url, created_at, updated_at, role, status,
      city, country_iso
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8, $9, $10, $11)
    RETURNING *;
  `;
  const values = [
    user.id,
    user.email,
    user.password_hash,
    user.username,
    user.displayname,
    user.bio,
    user.profile_picture_url,
    user.role,
    user.status,
    user.city,
    user.country_iso,
  ];
  const result = await db.query(query, values);
  return result.rows[0];
};