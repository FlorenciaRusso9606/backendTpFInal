

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
