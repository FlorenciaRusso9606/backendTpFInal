import axios from "axios";
import bcrypt from "bcrypt";
import crypto from "crypto";
import db from "../src/db";
import { findUserByIdentifier } from "../src/models/authModel";
import { insertUser } from "../src/models/userModel";
import type {  DbUser } from "../src/types/user";

async function seedUsers(count = 10) {
  if (process.env.NODE_ENV !== "development") {
    console.error("This script can only be executed in development environment");
    process.exit(1);
  }

  console.log(`\n🚀 Iniciando seed: ${count} usuarios aleatorios...\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const { data } = await axios.get(`https://randomuser.me/api/?results=${count}`);
    const randomUsers = data.results;

    for (const rUser of randomUsers) {
      const email = rUser.email?.toLowerCase();
      const username = rUser.login.username;

      // evita usuarios con datos incompletos
      if (!email || !username) {
        console.warn(`Invalid User: Without Email or Username -- Skipped`);
        skipped++;
        continue;
      }

      const existing = await findUserByIdentifier(email);
      if (existing) {
        console.log(`User already exists: ${username} (${email})`);
        skipped++;
        continue;
      }

      // genera los datos
      const id = crypto.randomUUID(); 
      const password_hash = await bcrypt.hash("password123", 10);
      const displayname = `${rUser.name.first} ${rUser.name.last}`;
      const bio = "Usuario generado automáticamente para desarrollo";
      const profile_picture_url = rUser.picture.large;
      const city = rUser.location.city;
      const country_iso = rUser.nat;
      const role: "USER" = "USER";
      const status: "ACTIVE" = "ACTIVE";

      // crea el objeto del usuario
      const user: DbUser = {
        id,
        email,
        password_hash,
        username,
        displayname,
        bio,
        profile_picture_url,
        created_at: new Date(),
        updated_at: new Date(),
        role,
        status,
        city,
        country_iso,
      };

      // Inserta el usuario
      try {
        await insertUser(user);
        inserted++;
        console.log(`--> Inserted: ${username}`);
      } catch (err) {
        errors++;
        console.error(`Error inserting ${username}:`, (err as Error).message);
      }
    }

    // Final debugging 
    console.log("\nSEED COMPLETED");
    console.log("---------------------------");
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log("---------------------------\n");
  } catch (err) {
    console.error("❌ Error general del seed:", err);
  } finally {
    if (typeof db.end === "function") await db.end();
    process.exit(0);
  }
}

seedUsers(15);
