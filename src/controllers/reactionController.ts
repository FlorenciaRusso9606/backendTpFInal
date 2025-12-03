import { 
  getPostLikesCount, 
  getCommentLikesCount, 
  toggleCommentLikeDB, 
  togglePostLikeDB, 
  getCheckLikedCommentDB, 
  getCheckLikedPostDB, 
  getMyLikedPosts, 
  getPostLikesUsersDB 
} from "../models/reactionModel";

import { Request, Response } from "express";
import NotificationService from "../services/notificationService"; // IMPORTANTE


/* ============================================================
   ❤️ LIKE / UNLIKE POST  + crear notificación
============================================================ */
export const togglePostLike = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    const { postId } = req.params;

    if (!user_id || !postId) {
      return res.status(400).json({ message: "Faltan datos (user_id o post_id)" });
    }

    const result = await togglePostLikeDB(user_id, postId);

    // 📌 Crear notificación SOLO cuando se da like (no unlike)
    if (result.liked && result.post_owner && result.post_owner !== user_id) {
      const notificationService: NotificationService = (req as any).notificationService;

      await notificationService.createNotification({
        user_id: result.post_owner,
        sender_id: user_id,
        type: "LIKE_POST",
        ref_id: postId,
        ref_type: "post",
        message: "le dio me gusta a tu publicación"
      });
    }

    return res.status(200).json(result);

  } catch (error: any) {
    console.error("Error al dar like al post", error.message, error.stack);
    return res.status(500).json({ message: "Error del servidor" });
  }
};


/* ============================================================
   👍 LIKE / UNLIKE COMMENT + crear notificación
============================================================ */
export const toggleCommentLike = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    const { commentId } = req.params;

    if (!user_id || !commentId) {
      return res.status(400).json({ message: "Faltan datos (user_id o comment_id)" });
    }

    const result = await toggleCommentLikeDB(user_id, commentId);

    if (result.liked && result.comment_owner && result.comment_owner !== user_id) {
      const notificationService: NotificationService = (req as any).notificationService;

      await notificationService.createNotification({
        user_id: result.comment_owner,
        sender_id: user_id,
        type: "LIKE_COMMENT",
        ref_id: commentId,
        ref_type: "comment",
        message: "le dio me gusta a tu comentario"
      });
    }

    return res.status(200).json(result);

  } catch (error: any) {
    console.error("Error al dar like al comentario", error);
    return res.status(500).json({ message: "Error del servidor" });
  }
};


/* ============================================================
   🔢 CONTADORES
============================================================ */
export const getPostLikes = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const count = await getPostLikesCount(postId);
    return res.status(200).json({ likes: count });

  } catch {
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const getCommentLikes = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const count = await getCommentLikesCount(commentId);
    return res.status(200).json({ likes: count });

  } catch {
    return res.status(500).json({ message: "Error en el servidor" });
  }
};


/* ============================================================
   ✔ CHECK SI EL USER DIO LIKE
============================================================ */
export const checkUserCommentLike = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    const { commentId } = req.params;

    if (!user_id || !commentId) return res.status(400).json({ liked: false });

    const result = await getCheckLikedCommentDB(user_id, commentId);
    return res.status(200).json({ liked: result });

  } catch {
    return res.status(500).json({ liked: false });
  }
};

export const checkUserPostLike = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    const { postId } = req.params;

    if (!user_id || !postId) return res.status(400).json({ liked: false });

    const result = await getCheckLikedPostDB(user_id, postId);
    return res.status(200).json({ liked: result });

  } catch {
    return res.status(500).json({ liked: false });
  }
};


/* ============================================================
   ⭐ POSTS QUE ME GUSTARON
============================================================ */
export const myLikedPosts = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    const posts = await getMyLikedPosts(user_id);
    return res.json(posts);

  } catch {
    return res.status(500).json({ message: "Error al traer tus likes" });
  }
};

export const getPostLikesUsers = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const users = await getPostLikesUsersDB(postId);
    return res.status(200).json(users);

  } catch {
    return res.status(500).json({ message: "Error del servidor" });
  }
};
