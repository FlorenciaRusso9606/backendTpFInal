// src/controllers/followController.ts
import { Request, Response } from "express";
import * as FollowModel from "../models/followModel";
import { getUserById } from "../models/userModel";
import { isEitherBlocked } from "../models/blockModel";
import NotificationService from "../services/notificationService";

async function validateFollowAction(followerId: string, targetId: string) {
  if (!targetId) return { error: "targetId required", code: 400 };
  if (followerId === targetId) return { error: "You can't follow yourself", code: 400 };

  const targetUser = await getUserById(targetId);
  if (!targetUser) return { error: "Target user not found", code: 404 };

  if (await isEitherBlocked(followerId, targetId)) {
    return { error: "You cannot follow this user", code: 403 };
  }

  return { error: null, code: 200 };
}

export async function follow(req: Request, res: Response) {
  try {
    const followerId = (req as any).user.id;
    const targetId = req.params.targetId;

    const validation = await validateFollowAction(followerId, targetId);
    if (validation.error) {
      return res.status(validation.code).json({ message: validation.error });
    }

    await FollowModel.toggleFollow(followerId, targetId, "follow");

    const notificationService: NotificationService = (req as any).notificationService;

    await notificationService.createNotification({
      user_id: targetId,
      sender_id: followerId,
      type: "FOLLOW",
      ref_id: followerId,
      ref_type: "USER",
      message: "ha comenzado a seguirte"
    });
    return res.json({ message: "Followed successfully" });

  } catch (err) {
    console.error("follow error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function unfollow(req: Request, res: Response) {
  try {
    const followerId = (req as any).user.id;
    const targetId = req.params.targetId;

    const validation = await validateFollowAction(followerId, targetId);

    // solo bloquear si es error grave (no bloquear por 403 o 400)
    if (validation.error && validation.code >= 404) {
      return res.status(validation.code).json({ message: validation.error });
    }

    await FollowModel.toggleFollow(followerId, targetId, "unfollow");

    return res.json({ message: "User unfollowed successfully" });

  } catch (err) {
    console.error("unfollow error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFollowers(req: Request, res: Response) {
  try {
    const userId = req.params.userId || (req as any).user.id;
    const followers = await FollowModel.getFollowRelations(userId, "followers");

    return res.json(followers);

  } catch (err) {
    console.error("Error fetching followers:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFollowing(req: Request, res: Response) {
  try {
    const userId = req.params.userId || (req as any).user.id;
    const following = await FollowModel.getFollowRelations(userId, "following");

    return res.json(following);

  } catch (err) {
    console.error("Error fetching following:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function status(req: Request, res: Response) {
  try {
    const viewerId = (req as any).user.id;
    const targetId = req.params.userId;

    if (!targetId) return res.status(400).json({ message: "targetId required" });
    if (viewerId === targetId)
      return res.status(400).json({ message: "Cannot check status with yourself" });

    const targetUser = await getUserById(targetId);
    if (!targetUser) return res.status(404).json({ message: "Target user not found" });

    const status = await FollowModel.getFollowStatus(viewerId, targetId);

    return res.json(status);

  } catch (err) {
    console.error("status error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}