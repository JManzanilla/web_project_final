export const dynamic = "force-dynamic";
import { ne, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { ok } from "@/lib/api";

type Phase = "sf1" | "sf2" | "final";

function seriesWinner(
  games: { homeTeamId: string; awayTeamId: string; scoreHome: number | null; scoreAway: number | null; status: string; seriesLength: number | null }[],
) {
  const required = Math.ceil((games[0]?.seriesLength ?? 1) / 2);
  const wins: Record<string, number> = {};
  for (const g of games) {
    if (g.status !== "finished" || g.scoreHome === null || g.scoreAway === null) continue;
    const w = g.scoreHome > g.scoreAway ? g.homeTeamId : g.awayTeamId;
    wins[w] = (wins[w] ?? 0) + 1;
  }
  return Object.entries(wins).find(([, w]) => w >= required)?.[0] ?? null;
}

// GET /api/playoffs — público
// Devuelve el estado del bracket de eliminatorias.
export async function GET() {
  // Todos los partidos no regulares
  const playoffMatches = await db.query.matches.findMany({
    where: ne(matches.phase, "regular"),
    with: { homeTeam: true, awayTeam: true, officials: true },
    orderBy: (m, { asc }) => [asc(m.scheduledAt)],
  });

  // Detectar si hay playoffs
  if (playoffMatches.length === 0) {
    // Verificar si hay partidos regulares pendientes
    const pendingRegular = await db.query.matches.findFirst({
      where: and(eq(matches.phase, "regular"), ne(matches.status, "finished")),
    });
    return ok({ status: pendingRegular ? "regular_in_progress" : "regular_done", sf1: null, sf2: null, final: null });
  }

  function buildSeries(phase: Phase) {
    const games = playoffMatches.filter((m) => m.phase === phase);
    if (games.length === 0) return null;
    const first = games[0];
    const winner = seriesWinner(games);
    const winsHome = games.filter(g => g.status === "finished" && g.scoreHome !== null && g.scoreAway !== null && g.scoreHome > g.scoreAway).length;
    const winsAway = games.filter(g => g.status === "finished" && g.scoreHome !== null && g.scoreAway !== null && g.scoreAway > g.scoreHome).length;
    return {
      team1: first.homeTeam,
      team2: first.awayTeam,
      wins: [winsHome, winsAway],
      seriesLength: first.seriesLength ?? 1,
      games: games.map(g => ({
        id: g.id, seriesGame: g.seriesGame, status: g.status,
        scoreHome: g.scoreHome, scoreAway: g.scoreAway,
        scheduledAt: g.scheduledAt,
      })),
      winnerId: winner,
    };
  }

  const sf1 = buildSeries("sf1");
  const sf2 = buildSeries("sf2");
  const final = buildSeries("final");

  return ok({ status: "playoffs_in_progress", sf1, sf2, final });
}
