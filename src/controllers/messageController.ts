import { Request, Response } from "express";
import * as MessageModel from "../models/messageModel";

export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId: string = (req as any).user.id;
    const convs = await MessageModel.getConversationsForUser(userId);
    res.json(convs);
  } catch (err) {
    console.error("getConversations error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMessagesWithUser = async (req: Request, res: Response) => {
  try {
    const userId: string = (req as any).user.id;
    const otherId: string = req.params.userId;

    if (!otherId)
      return res.status(400).json({ message: "userId required" });

    const messages = await MessageModel.getMessagesBetween(userId, otherId);
    res.json(messages);
  } catch (err) {
    console.error("getMessagesWithUser error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createMessage = async (req: Request, res: Response) => {
  try {
    const userId: string = (req as any).user.id;
    const { to, text }: { to: string; text: string } = req.body;

    if (!to || !text)
      return res.status(400).json({ message: "to and text required" });

    const created = await MessageModel.createMessage(userId, to, text);

    const io = (req as any).io;

    if (io) {
      const messagePayload = {
        id: created.id,
        from: userId,
        to,
        text,
        created_at: created.created_at,
        conversation_id: created.conversation_id,
      };

      const room = [userId, to].sort().join(":");

      io.to(room).emit("dm_message", messagePayload);

      try {
        const roomSet = io.sockets.adapter.rooms.get(room) || new Set();
        const sockets = Array.from(io.sockets.sockets.values()) as any[];

        for (const s of sockets) {
          if (s.data?.userId !== to) continue;
          if (roomSet.has(s.id)) continue;
          io.to(s.id).emit("dm_message", messagePayload);
        }
      } catch (err) {
        console.warn("Error sending message to recipient sockets:", err);
      }
    }

    res.status(201).json(created);
  } catch (err) {
    console.error("createMessage error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId: string = (req as any).user.id;

    const unread = await MessageModel.countUnreadMessages(userId);

    res.json({ unread });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const markConversationAsRead = async (req: Request, res: Response) => {
  try {
    const { conversationId }: { conversationId: string } = req.body;
    const userId: string = (req as any).user.id;

    if (!conversationId)
      return res.status(400).json({ message: "conversationId required" });

    const unreadRemoved = await MessageModel.markMessagesAsRead(conversationId, userId);


    const io = (req as any).io;

    if (io) {
      io.to(conversationId).emit("dm_seen", {
        conversationId,
        userId,
        unreadRemoved,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("ERROR en mark-read:", err);
     return res.status(500).json({ error: "internal error" });
  }
};
