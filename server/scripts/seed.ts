/**
 * Seed inicial — crea el usuario administrador y equipos de ejemplo.
 * Ejecutar una sola vez después de hacer db:push:
 *   npm run db:seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hash } from "bcryptjs";
import * as schema from "../db/schema";

const { users, teams, players, tournamentConfig } = schema;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida en .env.local");
}

const conn = postgres(process.env.DATABASE_URL);
const db   = drizzle(conn, { schema });

async function seed() {
  console.log("🌱 Iniciando seed...");

  // 1. Configuración del torneo
  await db.insert(tournamentConfig).values({
    name:       "Torneo Municipal 2026",
    format:     "liga",
    vueltas:    1,
    totalTeams: 8,
  }).onConflictDoNothing();
  console.log("✅ Configuración del torneo creada");

  // 2. Equipos de ejemplo
  const teamData = [
    { name: "Lakers"   },
    { name: "Bulls"    },
    { name: "Warriors" },
    { name: "Heat"     },
    { name: "Celtics"  },
    { name: "Knicks"   },
    { name: "Suns"     },
    { name: "Mavs"     },
  ];

  const insertedTeams = await db
    .insert(teams)
    .values(teamData)
    .onConflictDoNothing()
    .returning();
  console.log(`✅ ${insertedTeams.length} equipos creados`);

  // 3. Usuario admin
  const adminHash = await hash("Admin2026", 12);
  await db.insert(users).values({
    username:     "admin",
    passwordHash: adminHash,
    name:         "Administrador",
    role:         "admin",
    firstLogin:   false,
    active:       true,
  }).onConflictDoNothing();
  console.log("✅ Usuario admin creado  →  usuario: admin  |  contraseña: Admin2026");

  // 4. Usuario anotador
  const anotadorHash = await hash("Mesa2026", 12);
  await db.insert(users).values({
    username:     "anotador",
    passwordHash: anotadorHash,
    name:         "Mesa Técnica",
    role:         "anotador",
    firstLogin:   true,
    active:       true,
  }).onConflictDoNothing();
  console.log("✅ Usuario anotador creado  →  usuario: anotador  |  contraseña: Mesa2026");

  // 5. Un líder por equipo (usando los primeros 4 equipos como ejemplo)
  const liderTeams = insertedTeams.slice(0, 4);
  for (const team of liderTeams) {
    const liderHash = await hash(`${team.name}2026`, 12);
    await db.insert(users).values({
      username:     team.name.toLowerCase(),
      passwordHash: liderHash,
      name:         `Líder ${team.name}`,
      role:         "lider",
      teamId:       team.id,
      firstLogin:   true,
      active:       true,
    }).onConflictDoNothing();
  }
  console.log(`✅ ${liderTeams.length} líderes de equipo creados`);

  console.log("\n🎉 Seed completado exitosamente");
  console.log("──────────────────────────────");
  console.log("  admin      → Admin2026");
  console.log("  anotador   → Mesa2026");
  console.log("  lakers     → Lakers2026");
  console.log("  bulls      → Bulls2026");
  console.log("  warriors   → Warriors2026");
  console.log("  heat       → Heat2026");
  console.log("──────────────────────────────");

  await conn.end();
}

seed().catch((e) => {
  console.error("❌ Error en seed:", e);
  process.exit(1);
});
