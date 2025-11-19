import { Request, Response } from "express";
import * as bcrypt from "bcrypt";
import * as UserModel from "../models/userModel"
import * as BlockModel from "../models/blockModel";
import * as FollowModel from "../models/followModel"
import { getUserById } from "../models/userModel";
import * as AuthModel from "../models/authModel";
import { uploadBufferToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from "../utils/cloudinary";

const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB máximo
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

export const uploadMiddleware = upload.single('profile_picture_url');


export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.getAllUsers();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      displayname: user.displayname,
      role: user.role,
      status: user.status,
      bio: user.bio,
      profile_picture_url: user.profile_picture_url,
      profilePicture: user.profile_picture_url,
      country_iso: user.country_iso,
      city: user.city
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
};

export const editProfile = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const { displayname, bio, profile_picture_url, password, new_password, city, country_iso } = req.body;
  console.log("REQ BODY", req.body)
  try {
    const currentUser = (req as any).user;
    if (currentUser.id !== userId && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: "No tienes permisos para editar este perfil" });
    }

       if (country_iso && country_iso.length !==2) {
    return res.status(400).json({ error: "country_iso debe tener entre 2 caracteres (ISO)" });
  }
  if (city && city.length > 100) {
    return res.status(400).json({ error: "ciudad demasiado larga" });
  }
    // Obtener usuario actual para verificar contraseña
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (displayname !== undefined) {
      if (typeof displayname !== 'string' || displayname.trim().length === 0) {
        return res.status(400).json({ error: "El nombre para mostrar no puede estar vacío" });
      }
      if (displayname.length > 30) {
        return res.status(400).json({ error: "El nombre para mostrar no puede exceder 30 caracteres" });
      }
    }

    if (bio !== undefined && bio.trim() !== '') {
      if (typeof bio !== 'string') {
        return res.status(400).json({ error: "La biografía debe ser texto" });
      }
      if (bio.length > 160) {
        return res.status(400).json({ error: "La biografía no puede exceder 160 caracteres" });
      }
    }

    if (profile_picture_url !== undefined && profile_picture_url !== null && profile_picture_url !== '') {
      if (typeof profile_picture_url !== 'string') {
        return res.status(400).json({ error: "La URL de la imagen debe ser texto" });
      }
      if (profile_picture_url.length > 2048) {
        return res.status(400).json({ error: "La URL de la imagen es demasiado larga" });
      }
    }

    // Validación de contraseñas
    if (new_password && new_password.trim() !== '') {
      if (!password || password.trim() === '') {
        return res.status(400).json({ error: "Debes proporcionar tu contraseña actual para cambiarla" });
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: "La contraseña actual es incorrecta" });
      }

      if (new_password.length < 6) {
        return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
      }
      if (new_password.length > 128) {
        return res.status(400).json({ error: "La nueva contraseña es demasiado larga" });
      }
    }

    let updateData: any = {};
    
  
    if (displayname !== undefined) {
      updateData.displayname = displayname.trim();
    }
    if (bio !== undefined) {
      updateData.bio = bio.trim();
    }
    if (req.file) {
      try {
        const baseFolder = process.env.CLOUDINARY_FOLDER
          ? `${process.env.CLOUDINARY_FOLDER}/user/profilePicture`
          : "user/profilePicture";
        const publicId = `${userId}-${Date.now()}`;
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer, baseFolder, publicId);
        const secureUrl: string | undefined = uploadResult?.secure_url || uploadResult?.url;

        if (!secureUrl) {
          return res.status(503).json({ error: "No se pudo subir la imagen de perfil." });
        }

        if (user.profile_picture_url) {
          const previousPublicId = extractPublicIdFromUrl(user.profile_picture_url);
          if (previousPublicId) {
            try {
              await deleteFromCloudinary(previousPublicId, "image");
            } catch (cleanupErr) {
              console.warn("No se pudo eliminar la foto de perfil anterior", cleanupErr);
            }
          }
        }

        updateData.profile_picture_url = secureUrl;
      } catch (uploadErr) {
        console.error("Error al subir imagen de perfil:", uploadErr);
        return res.status(503).json({ error: "Error al subir la imagen de perfil. Intenta más tarde." });
      }
    }
    if (new_password && new_password.trim() !== '') {
      updateData.password_hash = await bcrypt.hash(new_password, 10);
    }
    if(city !== undefined){
      updateData.city = city.trim();
    }
     if (country_iso !== undefined){
      updateData.country_iso = country_iso.trim().toUpperCase();
     }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }
    const updatedUser = await UserModel.updateUserProfile(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const { password_hash, ...safeUser } = updatedUser;
    
    res.json({ 
      message: "Perfil actualizado exitosamente", 
      user: safeUser 
    });
    
  } catch (err: any) {
    console.error("Error al actualizar perfil:", err);
    
    
    if (err.code === '23505') {
      if (err.constraint?.includes('username')) {
        return res.status(409).json({ error: "Este nombre de usuario ya está en uso" });
      }
      if (err.constraint?.includes('email')) {
        return res.status(409).json({ error: "Este email ya está en uso" });
      }
    }
    
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const searchUsersController = async (req: Request, res: Response) => {
  try {
    const { search } = req.query
    const userId = (req as any).user.id
    if (!search || typeof search !== "string") {
      return res.status(400).json({ message: "Parámetro de búsqueda requerido" })
    }
    const blockedIds = await BlockModel.getBlockedUserIds(userId);
    const excludeIds = [...blockedIds, userId];

    const users = await UserModel.searchUsers(search, excludeIds);

    res.json({ results: users });
  } catch (err) {
    console.error("Error en búsqueda:", err);
    res.status(500).json({ error: "Error al buscar usuarios" });
  }
};

export const getProfileByUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const currentUserId = (req as any).user?.id;

   

    const user = await AuthModel.findUserByIdentifier(username);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const blockedByThem = await BlockModel.hasBlocked(user.id, currentUserId);
    if (blockedByThem) {
      return res.status(403).json({ message: "No puedes ver este perfil" });
    }

    const [followers, following, iFollow, followsMe] = await Promise.all([
      FollowModel.getFollowRelations(user.id, "followers"),
      FollowModel.getFollowRelations(user.id, "following"),
      FollowModel.isFollowing(currentUserId, user.id),
      FollowModel.isFollowing(user.id, currentUserId),
    ]);

    const profileData = {
      ...user,
      followers_count: followers.length,
      following_count: following.length,
      followers,
      following,
      followStatus: {
        iFollow,
        followsMe,
      },
    };

    return res.json(profileData);
  } catch (err) {
    console.error("getProfileByUsername error:", err);
    res.status(500).json({ error: "Error al obtener el perfil" });
  }
};

