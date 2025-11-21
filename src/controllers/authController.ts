import { Response, Request } from "express";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { sendVerificationEmail } from "../utils/mailer";
import * as AuthModel from "../models/authModel";
import * as UserModel from "../models/userModel";

// =============================
// JWT SECRET
// =============================
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Falta JWT_SECRET en .env");
}

// =============================
// Registrar usuario
// =============================
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, username, password, displayname } = req.body;
    if (!email || !username || !password || !displayname)
      return res.status(400).json({ error: "Faltan campos obligatorios" });

    const existingEmail = await AuthModel.findUserByIdentifier(email);
    const existingUsername = await AuthModel.findUserByIdentifier(username);
    if (existingEmail)
      return res.status(409).json({ error: "El email ya está registrado" });
    if (existingUsername)
      return res.status(409).json({ error: "El usuario ya está registrado" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await AuthModel.createUserPendingVerification(
      email,
      username,
      hashedPassword,
      displayname
    );

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await AuthModel.createEmailVerification(newUser.id, token, expiresAt);

    try {
      await sendVerificationEmail(newUser.email, token);
    } catch (mailErr) {
      console.error("Error enviando email:", mailErr);
    }

    const { password_hash, ...safeUser } = newUser;
    res.status(201).json({
      user: safeUser,
      message: "Registro exitoso 🎉 Revisa tu correo para activar la cuenta",
    });
  } catch (err) {
    console.error("Error al registrar usuario:", err);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
};

// =============================
// Login usuario
// =============================
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ error: "Faltan credenciales" });

    const user = await AuthModel.findUserByIdentifier(identifier);
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
    if (user.status !== "ACTIVE")
      return res.status(403).json({ error: "Cuenta no verificada" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Cookie segura según entorno
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: process.env.NODE_ENV === "production" ? ".bloop.cool" : undefined,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password_hash, ...safeUser } = user;

    return res.json({ message: "Login exitoso", token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Error al iniciar sesión" });
  }
};

// =============================
// Logout
// =============================
export const logoutUser = (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: process.env.NODE_ENV === "production" ? ".bloop.cool" : undefined,
    path: "/",
  });
  res.json({ message: "Logout exitoso" });
};

// =============================
// Verificar usuario por email
// =============================
export const verifyUser = async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token || req.body.token || "");
    if (!token) return res.status(400).json({ error: "Token faltante" });

    const verification = await AuthModel.findVerificationByToken(token);
    if (!verification) return res.status(400).json({ error: "Token inválido" });
    if (verification.used)
      return res.status(200).json({ success: true, message: "Token ya usado" });
    if (new Date(verification.expires_at) < new Date())
      return res.status(400).json({ error: "Token expirado" });

    await AuthModel.activateUser(verification.user_id);
    await AuthModel.markVerificationUsed(verification.id);

    return res.json({ success: true, message: "Cuenta activada" });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ error: "Error al verificar cuenta" });
  }
};

// =============================
// Obtener usuario actual
// =============================
export const getMe = async (req: Request, res: Response) => {
  try {
    let token = req.cookies.token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) return res.status(401).json({ error: "No autenticado" });

    let decoded: any;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      res.clearCookie("token");
      return res.status(401).json({ error: "Token inválido" });
    }

    const user = await UserModel.findUserById(decoded.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    return res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      displayname: user.displayname,
      role: user.role,
      status: user.status,
      bio: user.bio,
      profilePicture: user.profile_picture_url,
      country_iso: user.country_iso,
      city: user.city,
    });
  } catch (err) {
    console.error("getMe error:", err);
    res.clearCookie("token");
    return res.status(401).json({ error: "Token inválido" });
  }
};

// =============================
// Token para sockets
// =============================
export const getSocketToken = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "No autenticado" });

    const secret =
      process.env.SOCKET_SECRET || process.env.JWT_SECRET;

    const token = jwt.sign({ id: user.id }, secret!, { expiresIn: "2h" });

    return res.json({ token });
  } catch (err) {
    console.error("getSocketToken error:", err);
    return res
      .status(500)
      .json({ error: "Error creando token de socket" });
  }
};
