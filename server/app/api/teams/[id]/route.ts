export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const updateSchema = z.object({
  name:         z.string().min(1).optional(),
  logoUrl:      z.string().url().optional().nullable(),
  rosterLocked: z.boolean().optional(),
});

// GET /api/teams/:id
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, id),
    with: { players: true },
  });
  if (!team) return err("Equipo no encontrado", 404);
  return ok(team);
}

// PUT /api/teams/:id — admin o líder del equipo
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(["admin", "lider"]);
  if (error) return error;

  // El líder solo puede editar su propio equipo
  if (user!.role === "lider" && user!.teamId !== id) {
    return err("Sin permisos para este equipo", 403);
  }

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const [updated] = await db.update(teams).set(body.data).where(eq(teams.id, id)).returning();
  if (!updated) return err("Equipo no encontrado", 404);
  return ok(updated);
}

// DELETE /api/teams/:id — solo admin
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  await db.delete(teams).where(eq(teams.id, id));
  return ok({ message: "Equipo eliminado" });
}
