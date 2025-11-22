

import * as nodemailer from "nodemailer";
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
    <p>Bienvenido a La Red!</p>
    <p>Para activar tu cuenta haz click en el siguiente enlace:</p>
    <p><a href="${url}">${url}</a></p>
    <p>Si no te registraste, ignorá este mensaje.</p>
  `;

  try {
    await sendMailWithTimeout({
      from: process.env.EMAIL_FROM,
      to,
      subject: "Verifica tu cuenta en La Red",
      html,
    });
    console.log("Verification email sent to", to);
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
    await sendMailWithTimeout({
      from: process.env.EMAIL_FROM,
      to,
      subject:
        newStatus === "SUSPENDED"
          ? "Tu cuenta ha sido suspendida"
          : "Tu cuenta ha sido reactivada",
      html,
    });
    console.log("Status change email sent to", to);
    return true;
  } catch (err) {
    console.error("Error enviando email de cambio de estado a", to, err);
    return false;
  }
}
