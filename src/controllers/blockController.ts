import { Request, Response } from "express"
import * as BlockModel from "../models/blockModel"
import { getUserById } from "../models/userModel"

export async function block(req: Request, res: Response) {
    try {
        const blockerId = req.user!.id
        const targetId = req.params.targetId

        if (!targetId) return res.status(400).json({ message: "targetId required" })
        if (blockerId === targetId) return res.status(400).json({ message: "You can't block yourself" })

        const targetUser = getUserById(targetId)
        if (!targetUser) return res.status(404).json({ message: "Target user not found" })

        await BlockModel.blockUser(blockerId, targetId)
        return res.json({ message: "Usuario bloqueado correctamente" })
    } catch (err) {
        console.error("block error:", err)
        return res.status(500).json({ message: "Internal Server Error: Problem blocking user" })
    }
}

export async function unblock(req: Request, res: Response) {
    try {
        const blockerId = req.user!.id
        const targetId = req.params.targetId

        if (!targetId) return res.status(400).json({ message: "targetId requerido" })

        await BlockModel.unblockUser(blockerId, targetId)
        return res.json({ message: "Usuario desbloqueado correctamente" })
    } catch (err) {
        console.error("unblock error:", err)
        return res.status(500).json({ message: "Internal Server Error: Problem unlocking user" })
    }
}

//Devuelve { blockedByYou, blockedByThem } para la UI 
export async function status(req: Request, res: Response) {
    try {
        const viewerId = req.user!.id
        const targetId = req.params.targetId
        if (!targetId) return res.status(400).json({ message: "target ID required" })

        const st = await BlockModel.getBlockStatus(viewerId, targetId)
        return res.json(st)
    } catch (err) {
        console.error("status error:", err)
        return res.status(500).json({ message: "Internal Server Error: Problem obtaining the block status" })
    }
}
