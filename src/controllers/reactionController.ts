import { getPostLikesCount, getCommentLikesCount, toggleCommenLikeDB, togglePostLikeDB, getCheckLikedCommentDB, getCheckLikedPostDB} from "../models/reactionModel";
import { Request, Response } from "express";

export const togglePostLike = async (req: Request, res: Response) =>{
    try{
        const user_id = req.user?.id;
    const {postId} =req.params;

    if(!user_id || !postId){
         return res.status(400).json({ message: "Faltan datos (user_id o post_id)" });
    }
     const result = await togglePostLikeDB (user_id, postId);
     return res.status(200).json(result)
    }catch(error: any){
        console.error("Error al dar like al post", error.message, error.stack);
        res.status(500).json({message:"Error del servidor"})
    }

}
export const toggleCommentLike = async (req: Request, res: Response) =>{
    try{
        const user_id = req.user?.id;
    const {commentId} =req.params;
          console.log("togglePostLike:", { user_id, commentId });
    if(!user_id || !commentId){
         return res.status(400).json({ message: "Faltan datos (user_id o comment_id)" });
    }
     const result = await toggleCommenLikeDB (user_id, commentId);
     return res.status(200).json(result)
    }catch(error: any){
        console.error("Error al dar like al post");
        res.status(500).json({message:"Error del servidor"})
    }

}
export const getPostLikes = async (req: Request, res: Response) =>{
    try{
        const { postId} = req.params;
        const count = await getPostLikesCount(postId)
        return res.status(200).json({likes: count})
    }catch(error: any){
        console.error("Error al traer la cantidad de likes")
        res.status(500).json({message: "Error en el servidor"})
    }
}
export const getCommentLikes = async (req: Request, res: Response) =>{
    try{
        const { commentId} = req.params;
        const count = await getCommentLikesCount(commentId)
        return res.status(200).json({likes:count})
    }catch(error: any){
        console.error("Error al traer la cantidad de likes")
        res.status(500).json({message: "Error en el servidor"})
    }
}
export const checkUserCommentLike = async ( req: Request, res:Response) =>{
    try{
        const user_id = req.user?.id
        const {commentId} = req.params
         if (!user_id || !commentId) {
      return res.status(400).json({ liked: false });
    }
        const result = await getCheckLikedCommentDB(user_id, commentId)
        return res.status(200).json({liked: result> 0})
    }catch(error){
        console.error("Error al traer los likes", error)
        res.status(500).json({message: "Error del servidor"})
    }
}  
export const checkUserPostLike = async ( req: Request,res: Response) =>{
    try{
        const user_id = req.user?.id
        const {postId} = req.params
         if (!user_id || !postId) {
      return res.status(400).json({ liked: false });
    }
        const result = await getCheckLikedPostDB(user_id, postId)
        return res.status(200).json({liked: result > 0})
    }catch(error){
        console.error("Error al traer los likes", error)
            res.status(500).json({ liked: false });
    }
}  