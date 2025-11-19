import { z } from "zod";

export const commentSchema = z.object({
  text: z.string().min(1, "El comentario no puede estar vacío").max(280, "Máximo 280 caracteres"),
});
export type CommentFormData = z.infer<typeof commentSchema>;
