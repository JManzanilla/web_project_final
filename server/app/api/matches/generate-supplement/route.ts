export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";
import { inArray, gte, and, ne, desc } from "drizzle-orm";

const schema = z.object({
  newTeamIds:           z.array(z.string().uuid()).min(1).max(4),
  allTeamIds:           z.array(z.string().uuid()).min(3).max(16),
  integrateFromJornada: z.number().int().min(1),
  // Vueltas del torneo — para generar los encuentros de todas las vueltas
  vueltas:              z.number().int().min(1).max(4).default(1),
  gapMinutes:           z.number().int().min(15).max(180).default(90),
});

// ---------------------------------------------------------------------------
function buildRoundRobin(n: number): Array<Array<[number, number]>> {
  const list = Array.from({ length: n }, (_, i) => i);
  if (n % 2 === 1) list.push(-1);
  const m = list.length;
  const rot = [...list];
  const rounds: Array<Array<[number, number]>> = [];
  for (let r = 0; r < m - 1; r++) {
    const round: Array<[number, number]> = [];
    for (let i = 0; i < m / 2; i++) {
      const home = rot[i];
      const away = rot[m - 1 - i];
      if (home !== -1 && away !== -1) round.push([home, away]);
    }
    rounds.push(round);
    const last = rot[m - 1];
    for (let i = m - 1; i > 1; i--) rot[i] = rot[i - 1];
    rot[1] = last;
  }
  return rounds;
}

// POST /api/matches/generate-supplement — solo admin
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const { newTeamIds, allTeamIds, integrateFromJornada, vueltas, gapMinutes } = body.data;

  // Verificar equipos
  const dbTeams = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(inArray(teams.id, allTeamIds));

  if (dbTeams.length !== allTeamIds.length) return err("Uno o más equipos no existen");

  const orderedTeams = allTeamIds.map((id) => dbTeams.find((t) => t.id === id)!);
  const newSet       = new Set(newTeamIds);

  // Construir TODAS las rondas del torneo (todas las vueltas)
  // La vuelta par invierte local/visitante (igual que en generate)
  const baseRounds = buildRoundRobin(orderedTeams.length);
  const allRounds: { jornadaNum: number; pairs: Array<[number, number]> }[] = [];
  for (let v = 0; v < vueltas; v++) {
    const swap = v % 2 === 1;
    for (let r = 0; r < baseRounds.length; r++) {
      const globalIdx = v * baseRounds.length + r;
      const pairs: Array<[number, number]> = swap
        ? baseRounds[r].map(([hi, ai]) => [ai, hi] as [number, number])
        : baseRounds[r];
      allRounds.push({ jornadaNum: globalIdx + 1, pairs });
    }
  }

  // ── Última hora de cada jornada existente (para agregar al final) ──────────
  const existingByJornada = await db
    .select({ jornada: matches.jornada, scheduledAt: matches.scheduledAt })
    .from(matches)
    .where(and(gte(matches.jornada, integrateFromJornada), ne(matches.jornada, 0)));

  const lastTimeMap = new Map<number, Date>();
  for (const m of existingByJornada) {
    const dt  = new Date(m.scheduledAt);
    const cur = lastTimeMap.get(m.jornada);
    if (!cur || dt > cur) lastTimeMap.set(m.jornada, dt);
  }

  // ── Placeholder para partidos pendientes (jornada=0) ──────────────────────
  const lastInCalendar = await db
    .select({ scheduledAt: matches.scheduledAt })
    .from(matches)
    .where(ne(matches.jornada, 0))
    .orderBy(desc(matches.scheduledAt))
    .limit(1);

  const pendingBase = new Date(lastInCalendar[0]?.scheduledAt ?? new Date());
  pendingBase.setDate(pendingBase.getDate() + 7);
  pendingBase.setHours(10, 0, 0, 0);

  // ── Generar partidos ───────────────────────────────────────────────────────
  const toInsert: {
    homeTeamId: string; awayTeamId: string;
    jornada: number; scheduledAt: Date; status: "upcoming";
  }[] = [];

  let pendingOffset = 0;

  for (const { jornadaNum, pairs } of allRounds) {
    const newPairs = pairs.filter(
      ([hi, ai]) => newSet.has(orderedTeams[hi].id) || newSet.has(orderedTeams[ai].id)
    );
    if (newPairs.length === 0) continue;

    if (jornadaNum < integrateFromJornada) {
      // ── Jornadas perdidas → sección "Pendientes" (jornada = 0) ────────────
      newPairs.forEach(([hi, ai]) => {
        const dt = new Date(pendingBase);
        dt.setMinutes(dt.getMinutes() + pendingOffset * gapMinutes);
        pendingOffset++;
        toInsert.push({
          homeTeamId:  orderedTeams[hi].id,
          awayTeamId:  orderedTeams[ai].id,
          jornada:     0,
          scheduledAt: dt,
          status:      "upcoming",
        });
      });
    } else {
      // ── Jornadas existentes → agregar al final ─────────────────────────────
      const lastTime = lastTimeMap.get(jornadaNum);
      if (!lastTime) {
        // Jornada no existe aún (torneo se extendió con más equipos) → pendiente
        newPairs.forEach(([hi, ai]) => {
          const dt = new Date(pendingBase);
          dt.setMinutes(dt.getMinutes() + pendingOffset * gapMinutes);
          pendingOffset++;
          toInsert.push({
            homeTeamId:  orderedTeams[hi].id,
            awayTeamId:  orderedTeams[ai].id,
            jornada:     0,
            scheduledAt: dt,
            status:      "upcoming",
          });
        });
        continue;
      }

      newPairs.forEach(([hi, ai], i) => {
        const dt = new Date(lastTime);
        dt.setMinutes(dt.getMinutes() + gapMinutes * (i + 1));
        toInsert.push({
          homeTeamId:  orderedTeams[hi].id,
          awayTeamId:  orderedTeams[ai].id,
          jornada:     jornadaNum,
          scheduledAt: dt,
          status:      "upcoming",
        });
      });
    }
  }

  if (toInsert.length === 0) {
    return err("No se encontraron jornadas existentes. Verifica que el calendario esté generado.");
  }

  const created = await db.insert(matches).values(toInsert).returning();

  const pendingCount      = created.filter((m) => m.jornada === 0).length;
  const regularCount      = created.filter((m) => m.jornada > 0).length;
  const jornadasAfectadas = [...new Set(created.filter((m) => m.jornada > 0).map((m) => m.jornada))].sort((a, b) => a - b);

  return ok({
    partidosAgregados: created.length,
    pendientes:        pendingCount,
    enJornadas:        regularCount,
    jornadasAfectadas,
  });
}
