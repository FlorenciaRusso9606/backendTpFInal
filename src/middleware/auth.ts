import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { User } from "../types/user";
import db from "../db";

declare global {
    namespace Express {
        interface Request {
            user?: User
        }
    }
}

// Middleware para validar el token JWT y autenticar al usuario
export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token =
            req.cookies?.token ||
            (req.headers.authorization?.startsWith("Bearer ")
                ? req.headers.authorization.split(" ")[1]
                : null)

        if (!token) return res.status(401).json({ message: "No token provided" })

        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string }

        // Buscar user en la base de datos
        const result = await db.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [payload.id])
        const user: User | undefined = result.rows[0]
        if (!user) return res.status(401).json({ message: "User not found" })

        if (user.status === "SUSPENDED") {
            return res.status(403).json({ message: "Cuenta suspendida. Contacta al administrador." });
        }
        req.user = user
        next()
    } catch (err) {
        return res.status(401).json({ message: "Invalid Token" })
    }
}

// middleware para roles

export const authorizeRoles = (...allowedRoles: User["role"][]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ message: "Not authenticated" })

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: insufficient role" })
        }
        next();
    }
}