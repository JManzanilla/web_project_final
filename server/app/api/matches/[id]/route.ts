export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const updateSchema = z.object({
  scoreHome:   z.number().int().min(0).optional(),
  scoreAway:   z.number().int().min(0).optional(),
  status:      z.enum(["upcoming", "live", "finished", "suspended"]).optional(),
  scheduledAt: z.string().datetime().optional(),
  streamUrl:   z.string().url().nullable().optional(),
});

// GET /api/matches/:id
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, id),
    with: {
      homeTeam: true,
      awayTeam: true,
      officials: true,
      stats: { with: { player: true } },
    },
  });
  if (!match) return err("Partido no encontrado", 404);
  return ok(match);
}

// PUT /api/matches/:id — admin, anotador, transmision, o usuario con permiso stream.edit
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireAuth(["admin", "anotador", "transmision"], { section: "stream", level: "edit" });
  if (error) return error;

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const { scheduledAt, ...rest } = body.data;
  const data = {
    ...rest,
    ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
  };

  const [updated] = await db.update(matches).set(data).where(eq(matches.id, id)).returning();
  if (!updated) return err("Partido no encontrado", 404);

  // ── Lógica playoff: al finalizar un juego de serie, crear el siguiente si es necesario ──
  if (updated.status === "finished" && updated.phase !== "regular") {
    await handlePlayoffAdvance(updated);
  }

  return ok(updated);
}

async function handlePlayoffAdvance(finished: typeof matches.$inferSelect) {
  const { phase, homeTeamId, awayTeamId, seriesLength, seriesGame, scoreHome, scoreAway } = finished;
  if (!seriesLength || !seriesGame || scoreHome === null || scoreAway === null) return;

  const required = Math.ceil(seriesLength / 2);

  // Contar victorias de esta fase
  const seriesMatches = await db
    .select()
    .from(matches)
    .where(and(eq(matches.phase, phase), eq(matches.status, "finished")));

  const wins: Record<string, number> = {};
  for (const m of seriesMatches) {
    if (m.scoreHome === null || m.scoreAway === null) continue;
    const w = m.scoreHome > m.scoreAway ? m.homeTeamId : m.awayTeamId;
    wins[w] = (wins[w] ?? 0) + 1;
  }

  const seriesWinner = Object.entries(wins).find(([, w]) => w >= required)?.[0] ?? null;

  if (seriesWinner) {
    // Serie terminada — si es SF1 o SF2, verificar si ambas terminaron para crear la Final
    if (phase === "sf1" || phase === "sf2") {
      const otherPhase = phase === "sf1" ? "sf2" : "sf1";
      const otherSeries = await db
        .select()
        .from(matches)
        .where(eq(matches.phase, otherPhase));

      const otherWinner = (() => {
        const w: Record<string, number> = {};
        for (const m of otherSeries) {
          if (m.status !== "finished" || m.scoreHome === null || m.scoreAway === null) continue;
          const winner = m.scoreHome > m.scoreAway ? m.homeTeamId : m.awayTeamId;
          w[winner] = (w[winner] ?? 0) + 1;
        }
        return Object.entries(w).find(([, wins]) => wins >= required)?.[0] ?? null;
      })();

      if (otherWinner) {
        // Ambas SF terminadas → crear Final
        const finalExists = await db.query.matches.findFirst({ where: eq(matches.phase, "final") });
        if (!finalExists) {
          const sf1Matches = phase === "sf1" ? seriesMatches : otherSeries;
          const sf2Matches = phase === "sf2" ? seriesMatches : otherSeries;
          const sf1Winner = (() => {
            const w: Record<string, number> = {};
            for (const m of sf1Matches) {
              if (m.status !== "finished" || m.scoreHome === null || m.scoreAway === null) continue;
              const winner = m.scoreHome > m.scoreAway ? m.homeTeamId : m.awayTeamId;
              w[winner] = (w[winner] ?? 0) + 1;
            }
            return Object.entries(w).find(([, wins]) => wins >= required)?.[0] ?? null;
          })();
          const sf2Winner = (() => {
            const w: Record<string, number> = {};
            for (const m of sf2Matches) {
              if (m.status !== "finished" || m.scoreHome === null || m.scoreAway === null) continue;
              const winner = m.scoreHome > m.scoreAway ? m.homeTeamId : m.awayTeamId;
              w[winner] = (w[winner] ?? 0) + 1;
            }
            return Object.entries(w).find(([, wins]) => wins >= required)?.[0] ?? null;
          })();

          if (sf1Winner && sf2Winner) {
            // Usar el mismo seriesLength que el SF para la final (o podría ser diferente — por ahora usa el mismo)
            const finalSeries = finished.seriesLength ?? 1;
            // Fecha: 7 días después del último partido
            const finalDate = new Date(finished.scheduledAt);
            finalDate.setDate(finalDate.getDate() + 7);
            await db.insert(matches).values({
              homeTeamId: sf1Winner, awayTeamId: sf2Winner,
              jornada: 1, scheduledAt: finalDate,
              status: "upcoming", phase: "final",
              seriesGame: 1, seriesLength: finalSeries,
            });
          }
        }
      }
    }
    // Serie terminada → no crear más juegos
    return;
  }

  // Serie no terminada → crear siguiente juego
  // El local alterna para el siguiente partido en la serie
  const nextHome = seriesGame % 2 === 0 ? homeTeamId : awayTeamId;
  const nextAway = seriesGame % 2 === 0 ? awayTeamId : homeTeamId;
  const nextDate = new Date(finished.scheduledAt);
  nextDate.setDate(nextDate.getDate() + 3);

  await db.insert(matches).values({
    homeTeamId: nextHome, awayTeamId: nextAway,
    jornada: seriesGame + 1, scheduledAt: nextDate,
    status: "upcoming", phase,
    seriesGame: seriesGame + 1, seriesLength,
  });
}

// DELETE /api/matches/:id — solo admin
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  await db.delete(matches).where(eq(matches.id, id));
  return ok({ message: "Partido eliminado" });
}
