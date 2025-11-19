import {
  insertCommentDB,
  getCommentDepth,
  updateCommentDB,
  deleteCommentDB,
  findCommentDB,
  getCommentsByPostDB,
} from "../models/commentModels";
import { Request, Response } from "express";

const MAX_DEPTH = 6;
type CommentRow = {
  id: string;
  author_id: string;
  author_username: string;
  post_id: string;
  text: string;
  parent_id?: string | null;
  created_at: Date;
};
type CommentNode = CommentRow & { children: CommentNode[] };

function buildCommentTree(comments: CommentRow[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach(c => map.set(c.id, { ...c, children: [] }));

  comments.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parent_id) {
      const parent = map.get(c.parent_id);
      if (parent) parent.children.push(node);
      else roots.push(node); 
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export const insertComment = async (req: Request, res: Response) => {
  try {
    const { author_id, post_id, text, parent_id } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: "El texto no puede estar vacío" });
    }

   

    const depth = await getCommentDepth(parent_id);
    if (depth + 1 > MAX_DEPTH) {
      return res.status(400).json({
        message: "Se alcanzó la profundidad máxima de comentarios",
      });
    }

    const newComment = await insertCommentDB(author_id, post_id, text, parent_id);

console.log("📢 Emisión de evento:", `new-comment-${post_id}`);
req.io?.emit(`new-comment-${post_id}`, newComment);

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error al responder comentario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
     if (!text?.trim()) {
      return res.status(400).json({ message: "El texto no puede estar vacío" });
    }
    const updated = await updateCommentDB(commentId, text);

    if (!updated)
      return res.status(404).json({ message: "Comentario no encontrado" });
  req.io?.emit(`update-comment-${updated.post_id}`, updated);
    res.status(200).json(updated);
  } catch (error) {
    console.error("Error al actualizar comentario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
      const deleted = await deleteCommentDB(commentId);
     if (!deleted) {
  return res.status(404).json({ message: "Comentario no encontrado" });
}

// Emitir evento
req.io?.emit(`delete-comment-${deleted.post_id}`, commentId);

// Devuelve 200 en lugar de 204
res.status(200).json({ message: "Comentario eliminado" });

  } catch (error) {
    console.error("Error al eliminar comentario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const findComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const comment = await findCommentDB(commentId);

    if (!comment)
      return res.status(404).json({ message: "Comentario no encontrado" });

    res.status(200).json(comment);
  } catch (error) {
    console.error("Error al buscar comentario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getCommentsByPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const comments = await getCommentsByPostDB(postId);
     const tree = buildCommentTree(comments);
    res.status(200).json(tree);
  } catch (error) {
    console.error("Error al obtener comentarios del post:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
