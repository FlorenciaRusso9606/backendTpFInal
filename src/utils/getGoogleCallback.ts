export function getGoogleCallback() {
  const backendBase = process.env.BACKEND_URL;

  if (!backendBase) {
    throw new Error("Falta BACKEND_URL en las variables de entorno");
  }

  return `${backendBase.replace(/\/$/, "")}/auth/google/callback`;
}
