import { Request, Response } from "express"
import { createMedia, createPost, getPosts, getPostsByAuthor, getPostById, blockPostById, sharePost, hasUserSharedPost } from "../models/postModel"
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../utils/cloudinary"
import db from '../db'

const multer = require("multer")

const ALLOWED_MIMETYPES = new Set([
  'image/jpeg','image/jpg','image/png','image/webp','image/gif',
  'video/mp4','video/webm','video/x-matroska','video/ogg','video/mpeg','video/x-ms-wmv','video/x-msvideo',
  'audio/mpeg','audio/ogg','audio/wav','audio/flac','audio/aac'
])

const storage = multer.memoryStorage()
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por archivo
  fileFilter: (req: any, file: any, cb: any) => {
    if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'), false)
    }
    cb(null, true)
  }
})

export const myPostsController = async (req: Request, res: Response) => {
  try {
    const authorId = (req as any).user?.id
    if (!authorId) return res.status(401).json({ error: 'No autenticado' })
    // Use dedicated model query to fetch posts by this author
    const posts = await getPostsByAuthor(authorId)
    res.json({ data: posts })
  } catch (err) {
    console.error('myPosts error', err)
    res.status(500).json({ error: 'Error al obtener tus posts' })
  }
}

export const createPostController = [
  // aceptar hasta 4 archivos
  upload.array("files", 4),
  async (req: Request, res: Response) => {
    try {
      const authorId = (req as any).user?.id
      if (!authorId) return res.status(401).json({ error: "No autenticado" })

      const { text, link_url } = req.body

      const files = (req as any).files as any[] | undefined
      const folder = process.env.CLOUDINARY_FOLDER ? `${process.env.CLOUDINARY_FOLDER}/posts` : "posts"

    
      // parse weather from request (if present)
      let weatherObj = null;
      try {
        if (req.body.weather) weatherObj = typeof req.body.weather === 'string' ? JSON.parse(req.body.weather) : req.body.weather;
      } catch (e) { weatherObj = null; }

      let post: any = null;
      try {
        post = await createPost({
          author_id: authorId,
          text: text || "",
          link_url: link_url || null,
          weather: weatherObj,
        });
      } catch (postErr) {
        console.error('createPost: failed to create post', postErr)
        return res.status(500).json({ error: 'Error al crear el post' })
      }

      const uploadedMedias: Array<{ id: string, public_id?: string, url: string, type: string, resource_type?: string }> = []
      if (files && files.length > 0) {
        try {
          for (let i = 0 ; i < files.length ; i++) {
            const f = files[i]
            const result = await uploadBufferToCloudinary(f.buffer, folder)
            const mediaUrl = result?.secure_url || null
            const resultResourceType = result?.resource_type

            let resourceType = (result?.resource_type || "image").toUpperCase()
            let mappedType = "IMAGE"
            if (resourceType.startsWith("VIDEO")) mappedType = "VIDEO"
            else if (resourceType.startsWith("AUDIO")) mappedType = "AUDIO"
            else if (resourceType === "IMAGE" && f.mimetype === 'image/gif') mappedType = "GIF"

            const media = await createMedia(mediaUrl || "", mappedType, f.size, authorId, post.id)
            uploadedMedias.push({ id: media.id, public_id: result.public_id, url: media.url, type: media.type, resource_type: resultResourceType })
          }
        } catch (uploadErr) {
          console.error('createPost: upload failed after creating post', uploadErr)
          
          try {
            for (const m of uploadedMedias) {
              if (m.public_id) {
                try { await deleteFromCloudinary(m.public_id, m.resource_type) } catch (e) { console.warn('cleanup cloudinary failed', e) }
              }
            }
          } catch (cleanupErr) { console.warn('cleanup cloudinary failed', cleanupErr) }
          try {
            const ids = uploadedMedias.map(m => m.id)
            if (ids.length > 0) await db.query(`DELETE FROM media WHERE id = ANY($1::uuid[])`, [ids])
          } catch (dbCleanupErr) { console.warn('db cleanup failed', dbCleanupErr) }
          // delete the created post
          try { await db.query(`DELETE FROM post WHERE id = $1`, [post.id]) } catch (e) { console.warn('failed to delete post during cleanup', e) }

          return res.status(503).json({ error: 'Error al subir archivos. Intenta más tarde.' })
        }
      }

      return res.status(201).json({ message: 'Post creado', post, medias: uploadedMedias });
    } catch (err) {
      console.error("createPost error:", err)
      return res.status(500).json({ error: "Error al crear el post" })
    }
  },
]

export const listPostsController = async (req: Request, res: Response) => {
  try {
    const posts = await getPosts()
    res.json({ data: posts })
  } catch (err) {
    console.error("listPosts error:", err)
    res.status(500).json({ error: "Error al obtener posts" })
  }
}

export const listFollowingPostsController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    if (!userId) return res.status(401).json({ error: 'No autenticado' })
    const posts = await (require('../models/postModel') as any).getPostsByFollowed(userId)
    res.json({ data: posts })
  } catch (err) {
    console.error('listFollowingPosts error', err)
    res.status(500).json({ error: 'Error al obtener posts de seguidos' })
  }
}

export const deletePostController = async (req: Request, res: Response) => {
  try {
    const authorId = (req as any).user?.id
    if (!authorId) return res.status(401).json({ error: 'No autenticado' })
    const postId = req.params.id
    
    const { getPostById } = require('../models/postModel')
    const post = await getPostById(postId)
    if (!post) return res.status(404).json({ error: 'Post no encontrado' })
    if (post.author?.username !== (req as any).user?.username && post.author?.id !== authorId) {
      return res.status(403).json({ error: 'No autorizado para eliminar este post' })
    }
    
    // First, remove any posts that shared this post (and their media assets)
    try {
      const sharesRes = await db.query(`SELECT id FROM post WHERE shared_post_id = $1`, [postId])
      const shares = sharesRes.rows || []
      for (const s of shares) {
        const shareId = s.id
        try {
          const mediasRes2 = await db.query(`SELECT id, url, type FROM media WHERE post_id = $1`, [shareId])
          const medias2 = mediasRes2.rows || []
          for (const m of medias2) {
            try {
              const publicId = require('../utils/cloudinary').extractPublicIdFromUrl(m.url)
              const resourceType = (m.type || '').toLowerCase()
              if (publicId) {
                try {
                  await require('../utils/cloudinary').deleteFromCloudinary(publicId, resourceType || undefined)
                } catch (e) {
                  try { await require('../utils/cloudinary').deleteFromCloudinary(publicId) } catch (e2) { console.warn('failed to delete cloudinary asset', e2) }
                }
              }
            } catch (e) {
              console.warn('error deleting cloud asset for share', e)
            }
          }
        } catch (err) {
          console.warn('error fetching medias for share', err)
        }

        try {
          const { deletePostById } = require('../models/postModel')
          await deletePostById(shareId)
        } catch (err) {
          console.warn('error deleting share post', err)
        }
      }
    } catch (err) {
      console.warn('error fetching shares', err)
    }

    // Now remove media for the original post
    const mediasRes = await db.query(`SELECT id, url, type FROM media WHERE post_id = $1`, [postId])
    const medias = mediasRes.rows || []
    
    for (const m of medias) {
      try {
        const publicId = require('../utils/cloudinary').extractPublicIdFromUrl(m.url)
        const resourceType = (m.type || '').toLowerCase()
        if (publicId) {
          try {
            await require('../utils/cloudinary').deleteFromCloudinary(publicId, resourceType || undefined)
          } catch (e) {
            try { await require('../utils/cloudinary').deleteFromCloudinary(publicId) } catch (e2) { console.warn('failed to delete cloudinary asset', e2) }
          }
        }
      } catch (e) {
        console.warn('error deleting cloud asset', e)
      }
    }

    const { deletePostById } = require('../models/postModel')
    await deletePostById(postId)
    res.json({ message: 'Post eliminado' })
  } catch (err) {
    console.error('deletePost error', err)
    res.status(500).json({ error: 'Error al eliminar post' })
  }
}

export const updatePostController = async (req: Request, res: Response) => {
  try {
    const authorId = (req as any).user?.id
    if (!authorId) return res.status(401).json({ error: 'No autenticado' })
    const postId = req.params.id
    const { text } = req.body
    const { getPostById } = require('../models/postModel')
    const post = await getPostById(postId)
    if (!post) return res.status(404).json({ error: 'Post no encontrado' })
    if (post.author?.username !== (req as any).user?.username && post.author?.id !== authorId) {
      return res.status(403).json({ error: 'No autorizado para editar este post' })
    }
    const { updatePostText } = require('../models/postModel')
    const updated = await updatePostText(postId, text || '')
    res.json({ message: 'Post actualizado', post: updated })
  } catch (err) {
    console.error('updatePost error', err)
    res.status(500).json({ error: 'Error al actualizar post' })
  }
}


export const getPostByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const post = await getPostById(id)

    if (!post) {
      return res.status(404).json({ message: "Post no encontrado" })
    }

    res.json({ data: post })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error al obtener el post" })
  }
}

export const blockPostController = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id

    // opcional: verificar que el post existe antes
    const post = await getPostById(postId)
    if (!post) return res.status(404).json({ error: "Post no encontrado" })

    const blockedPost = await blockPostById(postId)

    res.json({ message: "Post bloqueado", post: blockedPost })
  } catch (err) {
    console.error("blockPostController error:", err)
    res.status(500).json({ error: "Error al bloquear el post" })
  }
}

export const sharePostController = async (req: Request, res: Response) => {
  try {
    const authorId = (req as any).user?.id;
    if (!authorId) return res.status(401).json({ error: "No autenticado" });

    const { id: originalPostId } = req.params;
    const { text } = req.body;

    const original = await getPostById(originalPostId);
    if (!original) return res.status(404).json({ error: "Post original no encontrado" });

    // ✅ Evitar compartir más de una vez
    const alreadyShared = await hasUserSharedPost(authorId, originalPostId);
    if (alreadyShared) {
      return res.status(400).json({ error: "Ya compartiste este post" });
    }

    const newPost = await sharePost(authorId, originalPostId, text);
    res.status(201).json({ message: "Post compartido", post: newPost });
  } catch (err) {
    console.error("sharePost error:", err);
    res.status(500).json({ error: "Error al compartir el post" });
  }
};

export const isSharedPostController = async (req: Request, res: Response) => {
  try {
    const authorId = (req as any).user?.id;
    if (!authorId) return res.status(401).json({ error: "No autenticado" });

    const { id: originalPostId } = req.params;

    const alreadyShared = await hasUserSharedPost(authorId, originalPostId);
    res.json({ shared: alreadyShared });
  } catch (err) {
    console.error("isSharedPost error:", err);
    res.status(500).json({ error: "Error al verificar si el post fue compartido" });
  }
};