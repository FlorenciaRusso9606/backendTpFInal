import { getPostLikesCount, getCommentLikesCount, toggleCommentLikeDB, togglePostLikeDB, getCheckLikedCommentDB, getCheckLikedPostDB, getMyLikedPosts, getPostLikesUsersDB } from "../models/reactionModel";
import NotificationService from "../services/notificationService";
import { Request, Response } from "express";
export const togglePostLike = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    const { postId } = req.params;
    const io = (req as any).io;

    if (!user_id || !postId) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const result = await togglePostLikeDB(user_id, postId);

    const likes = await getPostLikesCount(postId);

    io.to(`post_${postId}`).emit("post_like_updated", {
      postId,
      likes,
      user_id,
      action: result.liked ? "liked" : "unliked"
    });
    const notificationService: NotificationService = (req as any).notificationService;

    if (result.liked) {
      const postOwnerId = result.post_owner;
      if (postOwnerId && postOwnerId !== user_id) {
        await notificationService.createNotification({
          user_id: postOwnerId,
          sender_id: user_id,
          type: "LIKE_POST",
          ref_id: postId,
          ref_type: 'post',
          message: 'le ha dado like a tu post'
        });
      }
    }

    return res.status(200).json({ likes, ...result });

  } catch (error: any) {
    console.error("Error al dar like al post", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const toggleCommentLike = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id;
    const { commentId } = req.params;
    if (!user_id || !commentId) {
      return res.status(400).json({ message: "Faltan datos (user_id o comment_id)" });
    }
    const result = await toggleCommentLikeDB(user_id, commentId);
    return res.status(200).json(result)
  } catch (error: any) {
    console.error("Error al dar like al post");
    res.status(500).json({ message: "Error del servidor" })
  }

}
export const getPostLikes = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const count = await getPostLikesCount(postId)
    return res.status(200).json({ likes: count })
  } catch (error: any) {
    console.error("Error al traer la cantidad de likes")
    res.status(500).json({ message: "Error en el servidor" })
  }
}
export const getCommentLikes = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const count = await getCommentLikesCount(commentId)
    return res.status(200).json({ likes: count })
  } catch (error: any) {
    console.error("Error al traer la cantidad de likes")
    res.status(500).json({ message: "Error en el servidor" })
  }
}
export const checkUserCommentLike = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id
    const { commentId } = req.params
    if (!user_id || !commentId) {
      return res.status(400).json({ liked: false });
    }
    const result = await getCheckLikedCommentDB(user_id, commentId)
    return res.status(200).json({ liked: result ?? 0 })
  } catch (error) {
    console.error("Error al traer los likes", error)
    res.status(500).json({ message: "Error del servidor" })
  }
}
export const checkUserPostLike = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id
    const { postId } = req.params
    if (!user_id || !postId) {
      return res.status(400).json({ liked: false });
    }
    const result = await getCheckLikedPostDB(user_id, postId)
    return res.status(200).json({ liked: result ?? 0 })
  } catch (error) {
    console.error("Error al traer los likes", error)
    res.status(500).json({ liked: false });
  }
}

export const myLikedPosts = async (req: Request, res: Response) => {
  const user_id = (req as any).user?.id;

  try {
    const posts = await getMyLikedPosts(user_id);
    res.json(posts);
  } catch (err) {
    console.error("Error al traer likes:", err);
    res.status(500).json({ message: "Error al traer tus likes" });
  }
};
export const getPostLikesUsers = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const users = await getPostLikesUsersDB(postId)
    return res.status(200).json(users)
  } catch (error) {
    console.error("Error al traer los usuarios que dieron likes al post", error)
    res.status(500).json({ message: "Error del servidor" })
  }
}