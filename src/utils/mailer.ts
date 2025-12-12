

import * as nodemailer from "nodemailer";
// Prefer Resend (API) if configured; otherwise use SMTP via nodemailer
let useResend = false;
let resendClient: any = null;
if (process.env.RESEND_API_KEY) {
  try {
    // import dynamically to avoid runtime errors when dependency not installed locally
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Resend } = require("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY);
    useResend = true;
  } catch (err) {
    console.warn("Resend client not available, falling back to SMTP", err);
    useResend = false;
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: Number(process.env.EMAIL_TIMEOUT_MS) || 10000,
  greetingTimeout: Number(process.env.EMAIL_TIMEOUT_MS) || 10000,
  socketTimeout: Number(process.env.EMAIL_TIMEOUT_MS) || 10000,
});



function normalizeFrom(fromRaw?: string) {
  if (!fromRaw) return undefined;
  const from = fromRaw.trim();
  // If already in `Name <email@domain>` format, return as-is
  if (/^.+<.+@.+>$/i.test(from)) return from;
  // If it's just an email, return it
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) return from;
  // Try to extract email part and display name
  const emailMatch = from.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (emailMatch) {
    const email = emailMatch[0];
    const display = from.replace(email, "").replace(/["<>]/g, "").trim();
    if (display) return `${display} <${email}>`;
    return email;
  }
  // Fallback to raw
  return from;
}

const FROM = normalizeFrom(process.env.EMAIL_FROM);


async function sendMailWithTimeout(mailOptions: nodemailer.SendMailOptions) {
  const timeoutMs = Number(process.env.EMAIL_TIMEOUT_MS) || 10000;
  const sendPromise = transporter.sendMail(mailOptions);

  return Promise.race([
    sendPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Mail send timeout")), timeoutMs)
    ),
  ]);
}

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<boolean> {
  const url = `${process.env.FRONTEND_URL}/verify?token=${token}`;
  const html = `
    <p>Bienvenido a Bloop!</p>
    <p>Para activar tu cuenta haz click en el siguiente enlace:</p>
    <p><a href="${url}">${url}</a></p>
    <p>Si no te registraste, ignorá este mensaje.</p>
  `;

  try {
    if (useResend && resendClient) {
      const resp = await resendClient.emails.send({
        from: FROM,
        to,
        subject: "Verifica tu cuenta en La Red",
        html,
      });
      if (resp && resp.error) {
        console.error("Resend error sending verification email to", to, resp.error);
        return false;
      }
      return true;
    }

    await sendMailWithTimeout({
      from: process.env.EMAIL_FROM,
      to,
      subject: "Verifica tu cuenta de Bloop",
      html,
    });
    return true;
  } catch (err) {
    console.error("Error enviando email a", to, err);
    return false;
  }
}

export async function sendStatusChangeEmail(
  to: string,
  newStatus: string
): Promise<boolean> {
  const statusText =
    newStatus === "SUSPENDED"
      ? "Tu cuenta ha sido suspendida temporalmente."
      : "Tu cuenta ha sido reactivada y ya podés ingresar nuevamente.";

  const html = `
    <p>Hola,</p>
    <p>${statusText}</p>
    <p>Si creés que se trata de un error, contactá a soporte.</p>
  `;

  try {
    if (useResend && resendClient) {
      const resp = await resendClient.emails.send({
        from: FROM,
        to,
        subject:
          newStatus === "SUSPENDED"
            ? "Tu cuenta ha sido suspendida"
            : "Tu cuenta ha sido reactivada",
        html,
      });
      if (resp && resp.error) {
        console.error("Resend error sending status-change email to", to, resp.error);
        return false;
      }
      return true;
    }

    await sendMailWithTimeout({
      from: process.env.EMAIL_FROM,
      to,
      subject:
        newStatus === "SUSPENDED"
          ? "Tu cuenta ha sido suspendida"
          : "Tu cuenta ha sido reactivada",
      html,
    });
    return true;
  } catch (err) {
    console.error("Error enviando email de cambio de estado a", to, err);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const html = `
    <p>Solicitaste recuperar tu contraseña.</p>
    <p>Hacé click acá para crear una nueva:</p>
    <p><a href="${url}">${url}</a></p>
    <p>Si no fuiste vos, ignorá este mensaje.</p>
  `;

  try {
    if (useResend && resendClient) {
      const resp = await resendClient.emails.send({
        from: FROM,
        to,
        subject: "Restablecer contraseña",
        html,
      });
      if (resp?.error) return false;
      return true;
    }

    await sendMailWithTimeout({
      from: process.env.EMAIL_FROM,
      to,
      subject: "Restablecer contraseña",
      html,
    });

    return true;
  } catch (err) {
    console.error("Error enviando email a", to, err);
    return false;
  }
}
