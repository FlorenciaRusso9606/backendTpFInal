import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { crearJWT } from '../utils/createJWT'
import { ENV } from '../config/env'

type ScoketMap = Map<string, Set<string>>

const userSockets: ScoketMap = new Map()

export function initNotifications(io: Server) {
    (io as any).userSockets = userSockets

    io.on('connection', (socket: Socket) => {
        const token = (socket.handshake.auth && socket.handshake.auth.token) || socket.handshake.query?.token

        let userId: string | null = null

        const SECRET = process.env.SOCKET_SECRET || process.env.JWT_SECRET
        if (!SECRET) throw new Error('JWT_SECRET is missing');

        if (token) {
            try {
                const payload: any = jwt.verify(String(token), SECRET);
                userId = payload.id ?? payload.userId ?? null
            } catch (err: unknown) {
                if (err instanceof Error) {
                    console.warn('Socket JWT invalid: ', err.message)
                } else {
                    console.error('An unknown error occurred', err)
                }
            }
        }

        if (userId) {
            const sockets = userSockets.get(userId) || new Set<string>
            sockets.add(socket.id)
            userSockets.set(userId, sockets)

            socket.emit('request_pending')
        }

        socket.on('disconnect', (reason) => {
            if (userId) {
                const sockets = userSockets.get(userId)
                if (sockets) {
                    sockets.delete(socket.id)
                    if (sockets.size === 0) userSockets.delete(userId)
                    else userSockets.set(userId, sockets)
                }
            }
        })

        socket.on('register', (data) => {

        })
    })
}