import {z} from "zod";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const editProfilSchema = z.object({
    displayname: z.string().min(2, "El nombre a mostrar es obligatorio"),
    password: z.string().optional(),
    new_password: z.string().optional(), 
    bio: z.string().max(160, "El máximo son 160 caracteres").optional(),
    country_iso: z.string().max(100, "El máximo son 2 caracteres").min(2, "El mínimo son 2 caracteres").toUpperCase(),
    city: z.string().max(100, "El máximo son 100 caracteres"),
    /*profile_picture_url: z
      .instanceof(File, { message: "Se espera un archivo" })
      .refine((file) => file.size <= MAX_FILE_SIZE, `El máximo permitido es ${MAX_FILE_SIZE / (1024 * 1024 *8)}MB.`)
      .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), "Solo se soportan los formatos .jpg, .jpeg, .png and .webp.")*/
    profile_picture_url: z.any()
        .optional()
        .refine((file) => {
            if (!file || 
                file === undefined || 
                file === null || 
                file === "" ||
                (file instanceof FileList && file.length === 0) ||
                (Array.isArray(file) && file.length === 0)) {
                return true;
            }
            
            if (file instanceof File) {
                return file.size <= MAX_FILE_SIZE;
            }
            if (file instanceof FileList && file.length > 0) {
                return file[0].size <= MAX_FILE_SIZE;
            }
            return true;
        }, "La imagen no puede pesar más de 8MB")
        .refine((file) => {
            if (!file || 
                file === undefined || 
                file === null || 
                file === "" ||
                (file instanceof FileList && file.length === 0) ||
                (Array.isArray(file) && file.length === 0)) {
                return true;
            }
            
            
            if (file instanceof File) {
                return ACCEPTED_IMAGE_TYPES.includes(file.type);
            }
            if (file instanceof FileList && file.length > 0) {
                return ACCEPTED_IMAGE_TYPES.includes(file[0].type);
            }
            return true;
        }, "Solo se soportan formatos jpeg, jpg, png y webp")
})
.refine((data) => {
    if (data.new_password && data.new_password.trim() !== '') {
        return data.password && data.password.trim() !== '';
    }
    return true;
}, {
    message: "Debes proporcionar tu contraseña actual para cambiarla",
    path: ["password"]
});

export type ProfileData = z.infer<typeof editProfilSchema>;