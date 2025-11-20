

import * as nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true", // true para 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.FRONTEND_URL}/verify?token=${token}`;
  const html = `
    <p>Bienvenido a La Red!</p>
    <p>Para activar tu cuenta haz click en el siguiente enlace:</p>
    <p><a href="${url}">${url}</a></p>
    <p>Si no te registraste, ignorá este mensaje.</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: "Verifica tu cuenta en La Red",
      html,
    });
  } catch (err) {
    console.error("Error enviando email a", to, err);
  }
}
export async function sendStatusChangeEmail(to: string, newStatus: string) {
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
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject:
        newStatus === "SUSPENDED"
          ? "Tu cuenta ha sido suspendida"
          : "Tu cuenta ha sido reactivada",
      html,
    });

    console.log(`Email de estado "${newStatus}" enviado a ${to}`);
  } catch (err) {
    console.error("Error enviando email de cambio de estado a", to, err);
  }
}
