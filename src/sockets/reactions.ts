import { Server, Socket } from "socket.io";

export default function initReactions(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("join_post", (postId: string) => {
      socket.join(`post_${postId}`);
    });
    socket.on("leave_post", (postId: string) => {
      socket.leave(`post_${postId}`);
    });
  });
}
