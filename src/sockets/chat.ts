import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import * as MessageModel from "../models/messageModel";
import { logger } from "../utils/logger";

type JWTPayload = { id: string };

type SeenPayload =
  | string
  | { to?: string; otherUserId?: string; userId?: string };

const getRoomId = (a: string, b: string) => [a, b].sort().join(":");

export function initChat(io: Server) {
  const onlineUsers: Map<string, Set<string>> = new Map();

  io.on("connection", async (socket: Socket) => {
    try {
      const token = socket.handshake.auth?.token;

      if (token) {
        const secret =
          process.env.SOCKET_SECRET || process.env.JWT_SECRET;

        const payload = jwt.verify(token, secret!) as JWTPayload;

        socket.data.userId = payload.id;

        const set = onlineUsers.get(payload.id) || new Set<string>();
        set.add(socket.id);
        onlineUsers.set(payload.id, set);
      }

      // -------- JOIN ROOM --------
      socket.on("join_dm", (otherUserId: string) => {
        if (!socket.data.userId) return;
        const room = getRoomId(socket.data.userId, otherUserId);
        socket.join(room);
      });

      // -------- SEND MESSAGE --------
      socket.on("dm_message", async ({ to, text }) => {
        const from = socket.data.userId;
        if (!from) return;

        const room = getRoomId(from, to);

        try {
          const created = await MessageModel.createMessage(
            from,
            to,
            text
          );

          const msg = {
            id: created.id,
            from,
            to,
            text,
            created_at: created.created_at,
          };

          socket.to(room).emit("dm_message", msg);

          const recipientSockets = onlineUsers.get(to) || new Set();
          const roomSockets =
            io.sockets.adapter.rooms.get(room) || new Set();

          recipientSockets.forEach((sid) => {
            if (!roomSockets.has(sid)) {
              io.to(sid).emit("dm_message", msg);
            }
          });

          const unread =
            await MessageModel.countUnreadMessages(to);

          recipientSockets.forEach((sid) =>
            io.to(sid).emit("unread_update", unread)
          );
        } catch (err) {
          logger.error("Error sending DM message", err);
        }
      });

      // -------- MARK AS READ --------
      socket.on("dm_seen", async (payload: SeenPayload) => {
        const from = socket.data.userId;
        if (!from) return;

        const otherUserId =
          typeof payload === "string"
            ? payload
            : payload?.to ||
              payload?.otherUserId ||
              payload?.userId;

        if (!otherUserId) {
          logger.warn("dm_seen received without valid user id");
          return;
        }

        try {
          const convId =
            await MessageModel.findConversationBetween(
              from,
              otherUserId
            );

          if (!convId) return;

          await MessageModel.markMessagesAsRead(convId, from);

          const unread =
            await MessageModel.countUnreadMessages(from);

          const sockets = onlineUsers.get(from) || new Set();

          sockets.forEach((sid) =>
            io.to(sid).emit("unread_update", unread)
          );
        } catch (err) {
          logger.error("Error handling dm_seen", err);
        }
      });

      // -------- DISCONNECT --------
      socket.on("disconnect", () => {
        const uid = socket.data.userId;
        if (!uid) return;

        const set = onlineUsers.get(uid);
        if (!set) return;

        set.delete(socket.id);
        if (set.size === 0) onlineUsers.delete(uid);
      });
    } catch (err) {
      logger.error("Socket authentication error", err);
      socket.disconnect();
    }
  });
}

export default initChat;
