export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { players, teams } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const createSchema = z.object({
  name:     z.string().min(1),
  lastName: z.string().min(1),
  number:   z.string().min(1),
  teamId:   z.string().uuid(),
  photoUrl: z.string().url().optional().nullable(),
});

// GET /api/players?teamId=xxx — público
export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");

  const all = await db.query.players.findMany({
    where: teamId ? eq(players.teamId, teamId) : undefined,
    with: { team: true },
    orderBy: (p, { asc }) => [asc(p.lastName)],
  });
  return ok(all);
}

// POST /api/players — admin o líder
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(["admin", "lider"]);
  if (error) return error;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  // El líder solo puede agregar jugadores a su equipo
  if (user!.role === "lider" && user!.teamId !== body.data.teamId) {
    return err("Solo puedes agregar jugadores a tu equipo", 403);
  }

  // Verificar que el roster no esté bloqueado
  const team = await db.query.teams.findFirst({ where: eq(teams.id, body.data.teamId) });
  if (team?.rosterLocked) {
    return err("El roster de este equipo ya está finalizado", 400);
  }

  // Verificar que el número no esté repetido en el equipo
  const duplicate = await db.query.players.findFirst({
    where: and(eq(players.teamId, body.data.teamId), eq(players.number, body.data.number)),
  });
  if (duplicate) {
    return err(`El número #${body.data.number} ya está asignado a ${duplicate.name} ${duplicate.lastName}`, 400);
  }

  const [player] = await db.insert(players).values(body.data).returning();
  return ok(player, 201);
}
