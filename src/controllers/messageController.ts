import { Request, Response } from "express";
import * as MessageModel from "../models/messageModel";

export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const convs = await MessageModel.getConversationsForUser(userId);
    res.json(convs);
  } catch (err) {
    console.error("getConversations error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMessagesWithUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const otherId = req.params.userId;
    if (!otherId) return res.status(400).json({ message: "userId required" });
    const messages = await MessageModel.getMessagesBetween(userId, otherId);
    res.json(messages);
  } catch (err) {
    console.error("getMessagesWithUser error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { to, text } = req.body;
    if (!to || !text) return res.status(400).json({ message: "to and text required" });
    const created = await MessageModel.createMessage(userId, to, text);

    try {
      const io = (req as any).io as any | undefined;
      const message = {
        from: userId,
        to,
        text,
        created_at: created.created_at,
        id: created.id,
      };

      if (io) {
        const room = [userId, to].sort().join(":");
        io.to(room).emit("dm_message", message);

        try {
          const roomSet = io.sockets.adapter.rooms.get(room) || new Set();
          const sockets = Array.from(io.sockets.sockets.values()) as any[];
          for (const s of sockets) {
            if (s.data?.userId !== to) continue;
            if (roomSet.has(s.id)) continue;
            io.to(s.id).emit("dm_message", message);
          }
        } catch (emitErr) {
          console.warn("Error emitting to recipient sockets:", emitErr);
        }
      }

    } catch (emitErr) {
      console.warn("createMessage: socket emit failed:", emitErr);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error("createMessage error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
