export const dynamic = "force-dynamic";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { playerMatchStats, players, teams, matches } from "@/db/schema";
import { ok } from "@/lib/api";

// GET /api/standings/scorers — público
// Top canasteros: suma de pts en partidos finalizados, mínimo 1 partido jugado
export async function GET() {
  const rows = await db
    .select({
      playerId:  players.id,
      name:      players.name,
      lastName:  players.lastName,
      number:    players.number,
      teamName:  teams.name,
      pts:       sql<number>`sum(${playerMatchStats.pts})`.mapWith(Number),
      ast:       sql<number>`sum(${playerMatchStats.ast})`.mapWith(Number),
      flt:       sql<number>`sum(${playerMatchStats.flt})`.mapWith(Number),
      pj:        sql<number>`count(distinct ${playerMatchStats.matchId})`.mapWith(Number),
    })
    .from(playerMatchStats)
    .innerJoin(players, eq(playerMatchStats.playerId, players.id))
    .innerJoin(teams,   eq(players.teamId, teams.id))
    .innerJoin(matches, eq(playerMatchStats.matchId, matches.id))
    .where(eq(matches.status, "finished"))
    .groupBy(players.id, players.name, players.lastName, players.number, teams.name)
    .orderBy(sql`sum(${playerMatchStats.pts}) desc`)
    .limit(5);

  return ok(rows);
}
