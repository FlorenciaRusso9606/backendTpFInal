import "express";
import type { User } from "./user";
import type { Server as SocketIOServer } from "socket.io";
import type { File as MulterFile } from "multer";

declare global {
  namespace Express {
    interface SessionData {
      mobileRedirect?: string;
    }

    interface Request {
      user?: User | null;
      session?: Session & Partial<SessionData>;
      io?: SocketIOServer;

      // Multer
      file?: MulterFile;
      files?: MulterFile[];
    }
  }
}

export {};
