import { Request, Response } from "express";
import { sendVerificationEmail } from "../utils/mailer";

export const sendTestEmail = async (req: Request, res: Response) => {
  try {
    const to = req.body?.to as string | undefined;
    if (!to) return res.status(400).json({ error: "Missing 'to' in body" });

    console.log("[debug] sendTestEmail to:", to);
    const ok = await sendVerificationEmail(to, "debug-test-token");
    if (ok) return res.json({ ok: true, message: "Email sent (or queued)" });
    return res.status(500).json({ ok: false, error: "Failed to send email" });
  } catch (err) {
    console.error("[debug] sendTestEmail error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
};

export const showEnv = (req: Request, res: Response) => {
  try {
    const env = {
      NODE_ENV: process.env.NODE_ENV,
      FRONTEND_URL: process.env.FRONTEND_URL,
      BACKEND_URL: process.env.BACKEND_URL,
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_USER: process.env.EMAIL_USER,
      SENDGRID: !!process.env.SENDGRID_API_KEY,
    };
    console.log("[debug] env check from origin=", req.headers.origin);
    return res.json({ ok: true, env });
  } catch (err) {
    console.error("[debug] showEnv error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
