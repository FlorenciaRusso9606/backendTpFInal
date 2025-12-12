import { logger } from "./utils/logger";
import { Pool } from "pg";
import { config } from "dotenv";
config();

const db = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false, 
  },
});


db.on("connect", () => {
  logger.info("Conectado a la base de datos con SSL");
});

db.on("error", (err) => {
  console.error("❌ Error en la conexión con la DB:", err);
});

export default db;
