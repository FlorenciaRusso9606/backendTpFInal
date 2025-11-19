import jwt from "jsonwebtoken";

export function crearJWT(user: any) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET faltante");

  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role
  };

  return jwt.sign(payload, secret, {
    expiresIn: "7d",
  });
}
