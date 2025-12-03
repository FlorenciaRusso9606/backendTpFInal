import { Request, Response, NextFunction } from "express";
import { Server } from "socket.io";
import NotificationService from "../services/notificationService";
import db from "../db";

let notificationService: NotificationService;

export function attachNotificationService(io: Server) {
  notificationService = new NotificationService(db, io);

  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).notificationService = notificationService;
    next();
  };
}
