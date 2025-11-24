import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { VerifyCallback } from "passport-oauth2";
import dotenv from "dotenv";
import db from "../db";
import crypto from "crypto";
import bcrypt from "bcrypt";
import type { User } from "../types/user";
import { getGoogleCallback } from "../utils/getGoogleCallback";
dotenv.config();

// Verificación de variables de entorno
const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallBackURL = process.env.GOOGLE_CALLBACK_URL
if (!clientID || !clientSecret) {
  throw new Error("Faltan las variables de entorno de Google OAuth");
}

passport.use(
  new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL: googleCallBackURL,
    },
    async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
   

      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const picture = profile.photos?.[0]?.value;

        if (!email) {
          return done(new Error("No se recibió email desde Google"), undefined);
        }

        //  Verificar si el usuario ya existe
        const existing = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
          return done(null, existing.rows[0]);
        }


        // Generar username único
        const baseUsername = email.split("@")[0].slice(0, 30);
        let i = 0;
        let candidate = baseUsername;

        while (true) {
          const { rows } = await db.query("SELECT 1 FROM users WHERE username = $1", [candidate]);
          if (rows.length === 0) break;
          i++;
          candidate = `${baseUsername}${i}`.slice(0, 30);
        }


        // Generar contraseña aleatoria (no usable)
        const randomPassword = crypto.randomBytes(20).toString("hex");
        const passwordHash = await bcrypt.hash(randomPassword, 10);

        // Insertar usuario nuevo
        const newUser = await db.query(
          `INSERT INTO users (email, username, displayname, profile_picture_url, password_hash)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [email, candidate, name, picture, passwordHash]
        );

        return done(null, newUser.rows[0]);
      } catch (err) {
        console.error("Error en GoogleStrategy:", err);
        return done(err as Error, undefined);
      }
    }
  )
);

// Serialización y deserialización
passport.serializeUser((user: any, done) => {
  console.log(" Serialize user:", user?.id);
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  console.log(" Deserialize user id:", id);
  try {
    const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    console.log(" Usuario deserializado:", rows[0]?.email || "(no encontrado)");
    done(null, rows[0] || null);
  } catch (err) {
    console.error("❌ Error en deserializeUser:", err);
    done(err, null);
  }
});

export default passport;
