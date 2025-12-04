require('dotenv').config();
import express, { Request, Response, NextFunction } from "express";
const cors = require("cors");
import http from "http";
import cookieParser from "cookie-parser";
const session = require("express-session");
import passport from "./config/passport";

// routes
import translationRoutes from "./routes/translationRoutes";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import adminRoutes from "./routes/adminRoutes";
import blockRoutes from "./routes/blockRoutes";
import postRoutes from "./routes/postRoutes";
import reactionRoutes from "./routes/reactionRoutes";
import commentRoutes from "./routes/commentRoutes";
import followRoutes from "./routes/followRoutes";
import messageRoutes from "./routes/messageRoutes";
import reportRoutes from "./routes/reportRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import countryRoutes from "./routes/countryRoutes";
import weatherRoutes from "./routes/weatherRoutes";
import photoRoutes from "./routes/photoRoutes";
import debugRoutes from "./routes/debugRoutes";

// Sockets
const { Server: SocketIOServer } = require("socket.io");
import initChat from "./sockets/chat";
import { initNotifications } from "./sockets/notifications";
import { attachIO } from "./middleware/socket";
import "express-session";
import { attachNotificationService } from "./middleware/notification";

// Utils
import { ENV } from "./config/env";
import { crearJWT } from "./utils/createJWT";
import db from "./db";
import NotificationService from "./services/notificationService";

import 'express-session'

const app = express();
const PORT = process.env.PORT || 3001;

// Backend URL
const BACKEND_URL =
  process.env.NODE_ENV === "production"
    ? ENV.BACKEND_URL
    : `http://localhost:${PORT}`;

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
          "http://localhost:4000",
          "http://localhost:8081",
          ENV.FRONTEND_URL,
        ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "content-type", "Authorization", "authorization", "Set-Cookie"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);


// SESSION
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === "production" ? ".bloop.cool" : undefined);

const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  domain: COOKIE_DOMAIN,
  path: "/",
};

console.log("Session cookie options:", sessionCookieOptions);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: sessionCookieOptions,
  })
);

// PASSPORT
app.use(passport.initialize());
app.use(passport.session());

// GOOGLE LOGIN
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

// GOOGLE CALLBACK
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
    const cookieDomain = process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === "production" ? ".bloop.cool" : undefined);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      domain: cookieDomain,
    } as any;
    console.log("Setting auth cookie (google callback) with options:", {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      domain: cookieOptions.domain,
      path: cookieOptions.path,
    });

    res.cookie("token", token, cookieOptions);

    return res.redirect(process.env.FRONTEND_URL + "/feed");
  }
);

// HTTP + SOCKET.IO
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

// Services
const notificationService = new NotificationService(db, io);

// Socket Handlers
initChat(io);
initNotifications(io)

// Middleware
app.use(attachIO(io));
app.use(attachNotificationService(io))

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/blocks", blockRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/reactions", reactionRoutes);
app.use("/api/translate", translationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/photo", photoRoutes);
app.use("/api/debug", debugRoutes);

// INICIAR
server.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en ${BACKEND_URL}`)
);
