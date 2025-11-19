import { Request, Response } from "express";
import { updateUserStatus, findUserById } from "../models/userModel";
import { sendStatusChangeEmail } from "../utils/mailer";

export const toggleUserStatus = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params
        console.log("ID en adminController: ", userId)
        //buscar usuario
        const user = await findUserById(userId)
        console.log("User en adminController: ", user)
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" })

        const newStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"
        const updatedUser = await updateUserStatus(user.id, newStatus)

        await sendStatusChangeEmail(updatedUser.email, newStatus)

        res.json({ message: `Usuario ${newStatus}`, user: updatedUser })
    } catch( err ) {
        console.error("Toggle status error:", err)
        res.status(500).json({ error: "Error al cambiar el estado del usuario" })
    }
}