export const ENV = {
  isDev: process.env.NODE_ENV !== "production",
  JWT_SECRET: process.env.JWT_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL,
  BACKEND_URL: process.env.BACKEND_URL,
  MOBILE_SCHEME: process.env.MOBILE_SCHEME,
};