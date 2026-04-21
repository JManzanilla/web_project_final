export const dynamic = "force-dynamic";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { ok } from "@/lib/api";

// GET /api/standings — público
// Calcula la tabla de posiciones a partir de los partidos finalizados
export async function GET() {
  const allTeams   = await db.select().from(teams);
  const allMatches = await db.select().from(matches).where(eq(matches.status, "finished"));

  // Mapa de stats por equipo
  const stats: Record<string, {
    teamId: string; name: string;
    pj: number; pg: number; pe: number; pp: number;
    pf: number; pc: number; pts: number;
  }> = {};

  for (const t of allTeams) {
    stats[t.id] = { teamId: t.id, name: t.name, pj: 0, pg: 0, pe: 0, pp: 0, pf: 0, pc: 0, pts: 0 };
  }

  for (const m of allMatches) {
    if (m.scoreHome === null || m.scoreAway === null) continue;

    const home = stats[m.homeTeamId];
    const away = stats[m.awayTeamId];
    if (!home || !away) continue;

    home.pj++; away.pj++;
    home.pf += m.scoreHome; home.pc += m.scoreAway;
    away.pf += m.scoreAway; away.pc += m.scoreHome;

    if (m.scoreHome > m.scoreAway) {
      home.pg++; home.pts += 2;
      away.pp++;
    } else if (m.scoreAway > m.scoreHome) {
      away.pg++; away.pts += 2;
      home.pp++;
    } else {
      home.pe++; home.pts++;
      away.pe++; away.pts++;
    }
  }

  const table = Object.values(stats)
    .sort((a, b) => b.pts - a.pts || (b.pf - b.pc) - (a.pf - a.pc));

  return ok(table);
}
