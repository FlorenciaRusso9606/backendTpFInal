export function getGoogleCallback() {
  const env = process.env.NODE_ENV;
  const backendBase = process.env.BACKEND_URL; // siempre la base

  if (!backendBase) throw new Error("BACKEND_URL faltante");

  return `${backendBase}/auth/google/callback`;
}