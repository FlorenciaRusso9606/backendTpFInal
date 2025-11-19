import { Response, Request } from "express";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { sendVerificationEmail } from "../utils/mailer";
import * as AuthModel from "../models/authModel";
import * as UserModel from "../models/userModel";
const JWT_SECRET = process.env.JWT_SECRET;


// registrar usuario
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, username, password, displayname } = req.body;
    if (!email || !username || !password || !displayname) {
      return res.status(400).json({ error: "Faltan campos obligatorios" })
    }
    const existing = await AuthModel.findUserByIdentifier(email);
    if (existing) {
      return res.status(409).json({ error: "El email ya está registrado" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const newUser = await AuthModel.createUserPendingVerification(email, username, hashed, displayname);

    // token aleatorio
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await AuthModel.createEmailVerification(newUser.id, token, expiresAt);
    await sendVerificationEmail(newUser.email, token);
    const { password_hash, ...safeUser } = newUser;
    res.status(201).json({ user: safeUser, message: "Revisa tu email para verificar la cuenta" });;
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
}


export const loginUser = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body

    if (!password || !identifier) {
      return res.status(400).json({ error: "Faltan credenciales" })
    };


    const user = await AuthModel.findUserByIdentifier(identifier)
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" })
    }
    if (user.status !== "ACTIVE") {
      return res.status(403).json({ error: "Cuenta no verificada. Revisa tu correo." });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Credenciales incorrectas" })

    }
    if (!JWT_SECRET) throw new Error("Falta JWT_SECRET en variables de entorno");

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" })
     res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    // Devolver token y user para mobile
    const { password_hash, ...safeUser } = user;
    return res.json({
      message: "Login exitoso",
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
}

// logout usuario 
export const logoutUser = (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ message: "Logout exitoso" });
};


// verificar usuario
export const verifyUser = async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token || req.body.token || "");
    if (!token) return res.status(400).json({ error: "Token faltante" });

    const verification = await AuthModel.findVerificationByToken(token);
if (!verification) return res.status(400).json({ error: "Token inválido" });

if (verification.used) {
  return res.status(200).json({ success: true, message: "Token ya usado, cuenta ya activada" });
}

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

export const getMe = async (req: Request, res: Response) => {
  try {
    let token = req.cookies.token;

    // también aceptar el header Authorization
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) return res.status(401).json({ error: "No autenticado" });

    const decoded: any = jwt.verify(token, JWT_SECRET!);
    const user = await UserModel.findUserById(decoded.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      displayname: user.displayname,
      role: user.role,
      status: user.status,
      bio: user.bio,
      profilePicture: user.profile_picture_url,
      country_iso: user.country_iso,
      city: user.city
    });
  } catch (err) {
    res.status(401).json({ error: "Token inválido" });
  }
};
