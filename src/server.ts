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
import reportRoutes from "./routes/reportRoutes";
import passport from "./config/passport";
import countryRoutes from "./routes/countryRoutes";
import weatherRoutes from "./routes/weatherRoutes";
import photoRoutes from "./routes/photoRoutes";
import { crearJWT } from "./utils/createJWT";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: [
      "https://www.bloop.cool",
      "https://bloop.cool",
      "http://localhost:3000",
      "http://localhost:8081",
      "http://192.168.0.228:8081",
      "exp://*",
      process.env.FRONTEND_URL,
      process.env.BACKEND_URL,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      domain: ".bloop.cool",
      path: "/",
    },
  })
);

// PASSPORT
app.use(passport.initialize());
app.use(passport.session());

// Google Auth start
app.get("/auth/google", (req: Request, res: Response, next: NextFunction) => {
  try {
    const mobileRedirect = req.query.redirect as string | undefined;
    if (mobileRedirect) {
      (req.session as any).mobileRedirect = mobileRedirect;
    }

    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Google Callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: process.env.FRONTEND_URL + "/login?error=google",
    session: false,
  }),
  (req: Request, res: Response) => {
    const user = req.user;
    const token = crearJWT(user);

    const mobileRedirect = `${process.env.MOBILE_SCHEME}://auth?token=${token}`;
    const webRedirect = `${process.env.FRONTEND_URL}/auth/success?token=${token}`;

    if (req.query.redirect === "mobile") {
      return res.redirect(mobileRedirect);
    }

    return res.redirect(webRedirect);
  }
);

// SOCKET.IO
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: [
      "https://www.bloop.cool",
      "https://bloop.cool",
      "http://localhost:3000",
      process.env.FRONTEND_URL,
    ],
    credentials: true,
  },
});

app.use(attachIO(io));

// Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/blocks", blockRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/reactions", reactionRoutes);
app.use("/api/translate", translationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/photo", photoRoutes);

// Socket.IO conexión
io.on("connection", (socket: any) => {
  console.log("✅ Cliente conectado:", socket.id);
  socket.on("disconnect", (reason: any) => {
    console.log("❌ Cliente desconectado:", socket.id, "Motivo:", reason);
  });
});

// Iniciar servidor
server.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en https://api.bloop.cool:${PORT}`)
);
