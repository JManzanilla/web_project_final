export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
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
  return ok(updated);
}

// DELETE /api/matches/:id — solo admin
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  await db.delete(matches).where(eq(matches.id, id));
  return ok({ message: "Partido eliminado" });
}
