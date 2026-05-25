export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { officialAvailability } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const slotSchema = z.object({
  jornada:   z.number().int().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/),
});

// GET /api/officials/:id/availability — todos los slots del árbitro
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: officialId } = await params;
  const { error } = await requireAuth(["admin", "anotador", "lider", "transmision"]);
  if (error) return error;

  const slots = await db
    .select()
    .from(officialAvailability)
    .where(eq(officialAvailability.officialId, officialId))
    .orderBy(officialAvailability.jornada, officialAvailability.dayOfWeek, officialAvailability.startTime);

  return ok(slots);
}

// POST /api/officials/:id/availability — admin o con permiso official-schedule:edit
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: officialId } = await params;
  const { error } = await requireAuth(["admin"], { section: "official-schedule", level: "edit" });
  if (error) return error;

  const body = slotSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const { jornada, dayOfWeek, startTime, endTime } = body.data;
  if (startTime >= endTime) return err("La hora de inicio debe ser antes de la hora fin");

  const [slot] = await db
    .insert(officialAvailability)
    .values({ officialId, jornada, dayOfWeek, startTime, endTime })
    .returning();

  return ok(slot, 201);
}
