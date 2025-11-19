import { User } from "./user";

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?: Express.Multer.File[];
      session?: any;
      user?: User | null;
    }
  }
}

export {};
