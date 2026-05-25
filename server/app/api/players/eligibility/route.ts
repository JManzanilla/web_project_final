export const dynamic = "force-dynamic";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { matches, playerMatchStats, players, tournamentConfig } from "@/db/schema";
import { ok } from "@/lib/api";

// GET /api/players/eligibility — público (cualquiera puede ver quién está elegible)
export async function GET() {
  const config = await db.query.tournamentConfig.findFirst();
  const minPct      = config?.minAttendancePct  ?? 50;
  const minJornadas = config?.playoffMinJornadas ?? 1;

  // Partidos regulares finalizados
  const regularMatches = await db
    .select({ id: matches.id, jornada: matches.jornada, homeTeamId: matches.homeTeamId, awayTeamId: matches.awayTeamId })
    .from(matches)
    .where(and(eq(matches.status, "finished"), eq(matches.phase, "regular")));

  if (regularMatches.length === 0) {
    return ok([]);
  }

  const matchIds = regularMatches.map((m) => m.id);

  // Stats de asistencia de todos esos partidos
  const stats = await db
    .select({ matchId: playerMatchStats.matchId, playerId: playerMatchStats.playerId, attended: playerMatchStats.attended })
    .from(playerMatchStats)
    .where(inArray(playerMatchStats.matchId, matchIds));

  // Jugadores con su equipo
  const allPlayers = await db.query.players.findMany({ with: { team: true } });

  const attendedByPlayer = new Map<string, Set<string>>();
  for (const s of stats) {
    if (!s.attended) continue;
    if (!attendedByPlayer.has(s.playerId)) attendedByPlayer.set(s.playerId, new Set());
    attendedByPlayer.get(s.playerId)!.add(s.matchId);
  }

  const result = allPlayers.map((player) => {
    const eligible = regularMatches.filter(
      (m) =>
        (m.homeTeamId === player.teamId || m.awayTeamId === player.teamId) &&
        m.jornada >= player.registeredFromJornada,
    );
    const totalJornadas    = eligible.length;
    const attendedSet      = attendedByPlayer.get(player.id) ?? new Set<string>();
    const attendedJornadas = eligible.filter((m) => attendedSet.has(m.id)).length;
    const pct              = totalJornadas > 0 ? Math.round((attendedJornadas / totalJornadas) * 100) : 0;
    const isEligible       = totalJornadas > 0 && pct >= minPct && attendedJornadas >= minJornadas;

    return {
      id:                    player.id,
      name:                  player.name,
      lastName:              player.lastName,
      number:                player.number,
      teamId:                player.teamId,
      teamName:              player.team.name,
      registeredFromJornada: player.registeredFromJornada,
      totalJornadas,
      attendedJornadas,
      pct,
      eligible:              isEligible,
    };
  });

  // Ordenar: elegibles primero, luego por equipo, luego por apellido
  result.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.teamName !== b.teamName) return a.teamName.localeCompare(b.teamName);
    return a.lastName.localeCompare(b.lastName);
  });

  return ok(result);
}
