export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const updateSchema = z.object({
  name:     z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  number:   z.string().min(1).optional(),
  photoUrl: z.string().url().optional().nullable(),
});

// GET /api/players/:id
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await db.query.players.findFirst({
    where: eq(players.id, id),
    with: { team: true, stats: true },
  });
  if (!player) return err("Jugador no encontrado", 404);
  return ok(player);
}

// PUT /api/players/:id — admin o líder del equipo
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(["admin", "lider"]);
  if (error) return error;

  const existing = await db.query.players.findFirst({ where: eq(players.id, id) });
  if (!existing) return err("Jugador no encontrado", 404);

  if (user!.role === "lider" && user!.teamId !== existing.teamId) {
    return err("Sin permisos para este jugador", 403);
  }

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const [updated] = await db.update(players).set(body.data).where(eq(players.id, id)).returning();
  return ok(updated);
}

// DELETE /api/players/:id — admin o líder del equipo
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(["admin", "lider"]);
  if (error) return error;

  const existing = await db.query.players.findFirst({ where: eq(players.id, id) });
  if (!existing) return err("Jugador no encontrado", 404);

  if (user!.role === "lider" && user!.teamId !== existing.teamId) {
    return err("Sin permisos para este jugador", 403);
  }

  await db.delete(players).where(eq(players.id, id));
  return ok({ message: "Jugador eliminado" });
}
