import {z} from "zod";

export const loginSchema = z.object({
    identifier: z.string().min(3, "Ingrese email o usuario"),
     password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})
export type loginData = z.infer<typeof loginSchema>;