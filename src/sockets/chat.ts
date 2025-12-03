import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import * as MessageModel from "../models/messageModel";

type JWTPayload = { id: string };

const getRoomId = (a: string, b: string) => [a, b].sort().join(":");

export function initChat(io: Server) {
  const onlineUsers: Map<string, Set<string>> = new Map();

  io.on("connection", async (socket: Socket) => {
    try {
      const token = socket.handshake.auth?.token;
      let userId: string | null = null;

      if (token) {
        const secret = process.env.SOCKET_SECRET || process.env.JWT_SECRET;
        const payload = jwt.verify(token, secret!) as JWTPayload;
        userId = payload.id;
        socket.data.userId = userId;

        const set = onlineUsers.get(userId) || new Set<string>();
        set.add(socket.id);
        onlineUsers.set(userId, set);
        console.log("🟢 Connected:", userId, socket.id);
      }

      // ---------------- JOIN ROOM ----------------
      socket.on("join_dm", async (otherUserId: string) => {
        if (!socket.data.userId) return;
        const room = getRoomId(socket.data.userId, otherUserId);
        socket.join(room);
        console.log(`➡️ ${socket.data.userId} joined room with ${otherUserId} => ${room}`);
      });

      // ---------------- SEND MESSAGE ----------------
      socket.on("dm_message", async ({ to, text }) => {
        const from = socket.data.userId;
        if (!from) return;

        const room = getRoomId(from, to);

        try {
          const created = await MessageModel.createMessage(from, to, text);

          const msg = { from, to, text, created_at: created.created_at, id: created.id };

          socket.to(room).emit("dm_message", msg);

          const recipientSockets = onlineUsers.get(to) || new Set();
          const roomSockets = io.sockets.adapter.rooms.get(room) || new Set();

          recipientSockets.forEach(sid => {
            if (!roomSockets.has(sid)) io.to(sid).emit("dm_message", msg);
          });

          const unread = await MessageModel.countUnreadMessages(to);
          recipientSockets.forEach(sid => io.to(sid).emit("unread_update", unread));

        } catch (err) {
          console.log("❌ Error sending message:", err);
        }
      });

      // ---------------- MARK AS READ ----------------
      socket.on("dm_seen", async (payload: any) => {
        const from = socket.data.userId;
        if (!from) return;

        console.log("\n📥 EVENT: dm_seen recibido");
        console.log("└ payload recibido =", payload);

        // 📌 tolerancia — detecta si mandan string o {to,from} o {otherUserId}
        const otherUserId =
          typeof payload === "string"
            ? payload
            : payload?.to || payload?.otherUserId || payload?.userId;

        console.log("🔎 userId actual:", from);
        console.log("🔎 otherUserId procesado:", otherUserId);

        if (!otherUserId) {
          console.log("⚠ dm_seen recibido sin otherUserId válido");
          return;
        }

        try {
          const convId = await MessageModel.findConversationBetween(from, otherUserId);
          console.log("🗂 conversationId encontrado =", convId);

          if (convId) {
            await MessageModel.markMessagesAsRead(convId, from);
            console.log("✔ Mensajes marcados como leídos");
          } else console.log("❗ No existe conversación entre ambos");

          const unread = await MessageModel.countUnreadMessages(from);
          console.log("📊 Nuevos unread =", unread);

          const sockets = onlineUsers.get(from) || [];
          sockets.forEach(sid => io.to(sid).emit("unread_update", unread));

        } catch (err) {
          console.log("❌ Error en dm_seen:", err);
        }
      });

      // ---------------- DISCONNECT ----------------
      socket.on("disconnect", () => {
        const uid = socket.data.userId;
        if (!uid) return;

        const set = onlineUsers.get(uid);
        if (!set) return;

        set.delete(socket.id);
        if (set.size === 0) onlineUsers.delete(uid);
        else onlineUsers.set(uid, set);

        console.log(`🔴 User ${uid} socket ${socket.id} disconnected`);
      });

    } catch (e) {
      console.log("❌ Error auth socket:", e);
      socket.disconnect();
    }
  });
}

export default initChat;
