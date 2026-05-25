export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const schema = z.object({
  sfFormat:    z.union([z.literal(1), z.literal(3)]),
  finalFormat: z.union([z.literal(1), z.literal(3)]),
  sf1Date:     z.string().datetime(),
  sf2Date:     z.string().datetime(),
});

// POST /api/playoffs/generate — solo admin
// Genera SF1 (1° vs 4°) y SF2 (2° vs 3°) a partir de la tabla de posiciones.
// Solo ejecutable cuando todos los partidos regulares están finalizados.
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  // Verificar que no existan ya playoffs
  const existing = await db.query.matches.findFirst({
    where: ne(matches.phase, "regular"),
  });
  if (existing) return err("Los playoffs ya fueron generados", 400);

  // Verificar que no haya partidos regulares pendientes
  const pending = await db.query.matches.findFirst({
    where: and(eq(matches.phase, "regular"), ne(matches.status, "finished")),
  });
  if (pending) return err("Hay partidos regulares sin finalizar", 400);

  // Calcular standings (misma lógica que /api/standings)
  const allTeams   = await db.query.teams.findMany();
  const allMatches = await db
    .select()
    .from(matches)
    .where(and(eq(matches.status, "finished"), eq(matches.phase, "regular")));

  const stats: Record<string, { teamId: string; pts: number; pf: number; pc: number }> = {};
  for (const t of allTeams) stats[t.id] = { teamId: t.id, pts: 0, pf: 0, pc: 0 };

  for (const m of allMatches) {
    if (m.scoreHome === null || m.scoreAway === null) continue;
    const home = stats[m.homeTeamId];
    const away = stats[m.awayTeamId];
    if (!home || !away) continue;
    home.pf += m.scoreHome; home.pc += m.scoreAway;
    away.pf += m.scoreAway; away.pc += m.scoreHome;
    if (m.scoreHome > m.scoreAway) { home.pts += 2; }
    else if (m.scoreAway > m.scoreHome) { away.pts += 2; }
    else { home.pts++; away.pts++; }
  }

  const ranked = Object.values(stats)
    .filter((s) => s.pts > 0 || allMatches.some((m) => m.homeTeamId === s.teamId || m.awayTeamId === s.teamId))
    .sort((a, b) => b.pts - a.pts || (b.pf - b.pc) - (a.pf - a.pc));

  if (ranked.length < 4) return err("Se necesitan al menos 4 equipos con partidos jugados", 400);

  const [p1, p2, p3, p4] = ranked;
  const { sfFormat, finalFormat, sf1Date, sf2Date } = body.data;

  // SF1: 1° (home) vs 4° (away) — ventaja de local al mejor clasificado
  // SF2: 2° (home) vs 3° (away)
  const toInsert = [
    {
      homeTeamId: p1.teamId, awayTeamId: p4.teamId,
      jornada: 1, scheduledAt: new Date(sf1Date),
      status: "upcoming" as const, phase: "sf1",
      seriesGame: 1, seriesLength: sfFormat,
    },
    {
      homeTeamId: p2.teamId, awayTeamId: p3.teamId,
      jornada: 1, scheduledAt: new Date(sf2Date),
      status: "upcoming" as const, phase: "sf2",
      seriesGame: 1, seriesLength: sfFormat,
    },
  ];

  const created = await db.insert(matches).values(toInsert).returning();
  return ok({ created: created.length, sfFormat, finalFormat }, 201);
}
