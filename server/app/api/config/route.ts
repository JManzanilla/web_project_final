export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tournamentConfig } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const updateSchema = z.object({
  name:                  z.string().min(1).optional(),
  format:                z.enum(["liga", "eliminacion"]).optional(),
  vueltas:               z.number().int().min(1).max(4).optional(),
  totalTeams:            z.number().int().min(4).max(32).optional(),
  rosterLockJornada:     z.number().int().min(1).max(50).optional(),
  transferWindowJornada: z.number().int().min(1).max(50).nullable().optional(),
});

// GET /api/config — público
export async function GET() {
  let config = await db.query.tournamentConfig.findFirst();

  // Si no existe, crea uno por defecto
  if (!config) {
    const [created] = await db.insert(tournamentConfig).values({}).returning();
    config = created;
  }

  return ok(config);
}

// PUT /api/config — solo admin
export async function PUT(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  let config = await db.query.tournamentConfig.findFirst();

  if (!config) {
    const [created] = await db.insert(tournamentConfig).values(body.data).returning();
    return ok(created);
  }

  const [updated] = await db
    .update(tournamentConfig)
    .set({ ...body.data, updatedAt: new Date() })
    .returning();

  return ok(updated);
}
