import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import * as MessageModel from "../models/messageModel";

type JWTPayload = { id: string };

const getRoomId = (a: string, b: string) => {
  return [a, b].sort().join(":");
};

export function initChat(io: Server) {
  const onlineUsers: Map<string, Set<string>> = new Map(); 

  io.on("connection", async (socket: Socket) => {
    try {
      const token = socket.handshake.auth?.token;
      let userId: string | null = null;
      if (token) {
        const secret = process.env.SOCKET_SECRET || process.env.JWT_SECRET;
        if (!secret) throw new Error("Missing SOCKET_SECRET/JWT_SECRET");
        const payload = jwt.verify(token, secret) as JWTPayload;
        userId = payload.id;
        socket.data.userId = userId;
        const set = onlineUsers.get(userId) || new Set<string>();
        set.add(socket.id);
        onlineUsers.set(userId, set);
        console.log("🟢 Socket authenticated for user:", userId, "socketId:", socket.id);
      } else {
        console.log("🟡 Socket connected without token:", socket.id);
      }

      socket.on("join_dm", (otherUserId: string) => {
        if (!socket.data.userId) return;
        const room = getRoomId(socket.data.userId, otherUserId);
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
      });

      socket.on("dm_message", (payload: { to: string; text: string }) => {
        if (!socket.data.userId) return;
        const from = socket.data.userId as string;
        const room = getRoomId(from, payload.to);
        (async () => {
          try {
            const created = await MessageModel.createMessage(from, payload.to, payload.text);
            const message = {
              from,
              to: payload.to,
              text: payload.text,
              created_at: created.created_at,
              id: created.id,
            };
            socket.to(room).emit("dm_message", message);

            const recipientSockets = Array.from(onlineUsers.get(payload.to) || []) as string[];

            const roomSet = io.sockets.adapter.rooms.get(room) || new Set<string>();
            for (const sid of recipientSockets) {
              if (roomSet.has(sid)) continue;
              io.to(sid).emit("dm_message", message);
            }
          } catch (err) {
            console.error("Error persisting/sending dm_message:", err);
          }
        })();
      });

      socket.on("disconnect", (reason) => {
        const uid = socket.data.userId as string | undefined;
        if (uid) {
          const set = onlineUsers.get(uid);
          if (set) {
            set.delete(socket.id);
            if (set.size === 0) onlineUsers.delete(uid);
            else onlineUsers.set(uid, set);
          }
        }
        console.log("🔴 Socket disconnected", socket.id, "reason:", reason);
      });
    } catch (err) {
      console.error("Socket auth/error:", err);
      socket.disconnect();
    }
  });
}

export default initChat;
