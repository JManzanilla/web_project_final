export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { officials } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const updateSchema = z.object({
  name:          z.string().min(1).optional(),
  lastName:      z.string().min(1).optional(),
  roles:         z.object({
    mainRef:   z.boolean(),
    assistRef: z.boolean(),
    scorer:    z.boolean(),
  }).optional(),
  availableDays: z.array(z.number().int().min(0).max(6)).optional(),
  active:        z.boolean().optional(),
});

// PUT /api/officials/:id — solo admin
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const [updated] = await db
    .update(officials)
    .set(body.data)
    .where(eq(officials.id, id))
    .returning();

  if (!updated) return err("Árbitro no encontrado", 404);
  return ok(updated);
}

// DELETE /api/officials/:id — solo admin
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const [deleted] = await db.delete(officials).where(eq(officials.id, id)).returning({ id: officials.id });
  if (!deleted) return err("Árbitro no encontrado", 404);
  return ok({ message: "Árbitro eliminado" });
}
