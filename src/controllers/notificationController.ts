import { Request, Response } from "express";
import * as NotificationModel from '../models/notificationModel'

export const fetchNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const notifications = await NotificationModel.getNotificationsByUser(userId);
    return res.json(notifications);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "error_fetching_notifications" });
  }
};

export const fetchUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const count = await NotificationModel.getUnreadCount(userId);
    return res.json({ count });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "error_fetching_unread_count" });
  }
};

export const markNotificationsSeen = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    await NotificationModel.markAsSeen(userId);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "error_marking_as_seen" });
  }
};
