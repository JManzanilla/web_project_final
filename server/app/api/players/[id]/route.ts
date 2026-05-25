export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const adminUpdateSchema = z.object({
  name:                  z.string().min(1).optional(),
  lastName:              z.string().min(1).optional(),
  number:                z.string().regex(/^\d{1,2}$/).refine(v => parseInt(v) <= 99, "El número debe ser entre 0 y 99").optional(),
  photoUrl:              z.string().url().optional().nullable(),
  registeredFromJornada: z.number().int().min(1).optional(),
});

// Non-admins can only change number and photo to preserve stats integrity
const liderUpdateSchema = z.object({
  number:   z.string().regex(/^\d{1,2}$/).refine(v => parseInt(v) <= 99, "El número debe ser entre 0 y 99").optional(),
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

  const schema = user!.role === "admin" ? adminUpdateSchema : liderUpdateSchema;
  const body = schema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  // Verificar nombre duplicado en el mismo equipo (solo si el admin cambia nombre o apellido)
  if (user!.role === "admin") {
    const adminData = body.data as { name?: string; lastName?: string; number?: string; photoUrl?: string | null };
    if (adminData.name || adminData.lastName) {
      const newName     = adminData.name     ?? existing.name;
      const newLastName = adminData.lastName ?? existing.lastName;
      const nameDuplicate = await db.query.players.findFirst({
        where: and(
          eq(players.teamId, existing.teamId),
          eq(players.name, newName),
          eq(players.lastName, newLastName),
          ne(players.id, id),
        ),
      });
      if (nameDuplicate) {
        return err(`Ya existe un jugador llamado ${newName} ${newLastName} en este equipo`, 400);
      }
    }
  }

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
