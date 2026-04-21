export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { playerMatchStats } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const statsSchema = z.object({
  stats: z.array(z.object({
    playerId: z.string().uuid(),
    attended: z.boolean(),
    pts:      z.number().int().min(0),
    ast:      z.number().int().min(0),
    flt:      z.number().int().min(0),
  })),
});

// PUT /api/matches/:id/stats — anotador o admin
// Recibe el array completo de stats del partido y hace upsert
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const { error } = await requireAuth(["admin", "anotador"]);
  if (error) return error;

  const body = statsSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  // Elimina stats anteriores del partido y las reinserta
  await db.delete(playerMatchStats).where(eq(playerMatchStats.matchId, matchId));

  if (body.data.stats.length > 0) {
    await db.insert(playerMatchStats).values(
      body.data.stats.map((s) => ({ ...s, matchId }))
    );
  }

  const saved = await db.query.playerMatchStats.findMany({
    where: eq(playerMatchStats.matchId, matchId),
    with: { player: true },
  });

  return ok(saved);
}
