import axios from "axios";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 60 * 60 * 24 }); // cache 24h por defecto

const DEEPL_BASE = "https://api-free.deepl.com/v2";

const getCacheKey = (text: string, targetLang: string) =>
  `tr:${targetLang}:${Buffer.from(text).toString("base64")}`;

export async function translateText(text: string, targetLang: string) {
  if (!text || !targetLang) throw new Error("text and targetLang required");

  const key = getCacheKey(text, targetLang);
  const cached = cache.get<string>(key);
  if (cached) return { translatedText: cached, detectedSourceLang: null, cached: true };

  const params = new URLSearchParams();
  params.append("text", text);
  params.append("target_lang", targetLang.toUpperCase());
  const authKey = process.env.TRANSLATION_KEY;
  if (!authKey) throw new Error("TRANSLATION_KEY not set");

  try {
    const res = await axios.post(
      `${DEEPL_BASE}/translate`,
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `DeepL-Auth-Key ${authKey}`,
        },
      }
    );
    const translation = res.data?.translations?.[0];
    if (!translation) throw new Error("No translation from provider");

    const detectedSourceLang = translation.detected_source_language || null;
    const translatedText = translation.text;

    cache.set(key, translatedText);
    return { translatedText, detectedSourceLang, cached: false };
  } catch (err: any) {
    // enviar info mínima para debugging
    throw new Error(err.response?.data?.message || err.message || "Translation error");
  }
}
