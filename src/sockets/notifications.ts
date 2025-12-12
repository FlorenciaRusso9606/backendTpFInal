import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

type SocketMap = Map<string, Set<string>>
const userSockets: SocketMap = new Map()

export function initNotifications(io: Server) {
    (io as any).userSockets = userSockets

    io.on('connection', (socket: Socket) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token
        let userId: string | null = null
        
        const SECRET = process.env.SOCKET_SECRET || process.env.JWT_SECRET
        if (!SECRET) throw new Error('JWT_SECRET is missing')

        // Verificar token
        if (token) {
            try {
                const payload: any = jwt.verify(String(token), SECRET);
                userId = payload.id || payload.userId || null
            } catch (err: any) {
                console.warn("Token inválido en socket:", err.message)
            }
        }

        // Registrar socket del usuario
        if (userId) {
            const sockets = userSockets.get(userId) ?? new Set()
            sockets.add(socket.id)
            userSockets.set(userId, sockets)

        }

        // Manejo desconexión
        socket.on("disconnect", () => {
            if (!userId) return;

            const sockets = userSockets.get(userId)
            if (!sockets) return;

            sockets.delete(socket.id)
            if (sockets.size === 0) userSockets.delete(userId)
        })
    })
}

export function sendNotification(io: Server, userId: string, notification: any) {
    const sockets = (io as any).userSockets.get(userId)
    if (!sockets) return;

    sockets.forEach((socketId: string) => {
        io.to(socketId).emit("notification", notification)
    })
}
