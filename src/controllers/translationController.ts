// controllers/translationController.ts
import { Request, Response } from "express";
import * as TranslationService from "../services/translationService";

export async function translate(req: Request, res: Response) {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) return res.status(400).json({ message: "text and targetLang required" });

    const result = await TranslationService.translateText(text, targetLang);
    return res.json(result);
  } catch (err: any) {
    console.error("Translation error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
