require('dotenv').config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server: SocketIOServer } = require("socket.io");
const cookieParser = require("cookie-parser");
const session = require("express-session");

import type { Request, Response, NextFunction } from "express";

import translationRoutes from "./routes/translationRoutes";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import adminRoutes from "./routes/adminRoutes";
import blockRoutes from "./routes/blockRoutes";
import { attachIO } from "./middleware/socket";
import postRoutes from "./routes/postRoutes";
import reactionRoutes from "./routes/reactionRoutes";
import commentRoutes from "./routes/commentRoutes";
import followRoutes from "./routes/followRoutes";
import messageRoutes from "./routes/messageRoutes";
import reportRoutes from "./routes/reportRoutes";
import passport from "./config/passport";
import countryRoutes from "./routes/countryRoutes";
import weatherRoutes from "./routes/weatherRoutes";
import photoRoutes from "./routes/photoRoutes";
import debugRoutes from "./routes/debugRoutes";
import "express-session";
import { ENV } from "./config/env";
import initChat from "./sockets/chat";
import { crearJWT } from "./utils/createJWT";

const app = express();

// -------------------------------
// PUERTO
// -------------------------------
const PORT = process.env.PORT || 3001;

// -------------------------------
// BACKEND_URL
// Producción = Railway asigna dominio HTTPS 
// Dev = localhost 
// -------------------------------
const BACKEND_URL =
  process.env.NODE_ENV === "production"
    ? ENV.BACKEND_URL
    : `http://localhost:${PORT}`;

// -------------------------------
// CORS
// -------------------------------
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
             "https://www.bloop.cool",
            "https://bloop.cool",
            "https://api.bloop.cool"
            
          ]
        : [
            "http://localhost:3000",
            "http://localhost:8081",
            ENV.FRONTEND_URL,
          ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders:  ["Content-Type", "content-type", "Authorization", "authorization",  "Set-Cookie"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);

// -------------------------------
// SESIONES
// En prod: secure + sameSite none + domain .bloop.cool  
// En dev: nada 
// -------------------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    proxy: true, 
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: process.env.NODE_ENV === "production" ? ".bloop.cool" : undefined,
      path: "/",
    },
  })
);

// PASSPORT
app.use(passport.initialize());
app.use(passport.session());

// -------------------------------
// AUTH GOOGLE
// -------------------------------
app.get("/auth/google", (req: Request, res: Response, next: NextFunction) => {
  try {
    const mobileRedirect = req.query.redirect as string | undefined;
    if (mobileRedirect) {
      (req.session as any).mobileRedirect = mobileRedirect;
    }

    passport.authenticate("google", { scope: ["profile", "email"] })(
      req,
      res,
      next
    );
  } catch (err) {
    next(err);
  }
});

// CALLBACK GOOGLE
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: process.env.FRONTEND_URL + "/login?error=google",
    session: false,
  }),
  (req: Request, res: Response) => {
    const user = req.user;
    const token = crearJWT(user);

    // Mobile: token en la URL
    if (req.query.redirect === "mobile") {
      const mobileRedirect = `${process.env.MOBILE_SCHEME}://feed?token=${token}`;
      return res.redirect(mobileRedirect);
    }

    // WEB -> cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      domain: process.env.NODE_ENV === "production" ? ".bloop.cool" : undefined,
    });

    return res.redirect(process.env.FRONTEND_URL + "/feed");
  }
);

// -------------------------------
// SOCKET.IO
// -------------------------------
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? [ENV.FRONTEND_URL, "https://bloop.cool"]
        : ["http://localhost:3000", "http://localhost:8081"],
    credentials: true,
  },
});

initChat(io);
app.use(attachIO(io));

// -------------------------------
// Rutas API
// -------------------------------
app.use("/api/auth", authRoutes);
// Alias for legacy/frontend calls that target `/auth` instead of `/api/auth`
app.use("/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/blocks", blockRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/reactions", reactionRoutes);
app.use("/api/translate", translationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/photo", photoRoutes);
app.use("/api/debug", debugRoutes);

// -------------------------------
// SERVER UP
// -------------------------------
server.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en ${BACKEND_URL}`)
);
