export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { officials, officialAvailability } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

// GET /api/officials/available?jornada=N&day=D&time=HH:MM[&playoff=true][&noTeam=true]
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(["admin", "anotador", "lider", "transmision"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const playoff  = searchParams.get("playoff") === "true";
  const noTeam   = searchParams.get("noTeam") === "true";

  // Modo playoff: ignorar disponibilidad por jornada, devolver todos los activos
  if (playoff) {
    const filters: ReturnType<typeof eq>[] = [eq(officials.active, true)];
    if (noTeam) filters.push(isNull(officials.teamId));
    const result = await db.select().from(officials).where(and(...filters));
    return ok(result);
  }

  const jornada = parseInt(searchParams.get("jornada") ?? "");
  const day     = parseInt(searchParams.get("day") ?? "");
  const time    = searchParams.get("time") ?? "";

  if (isNaN(jornada) || isNaN(day) || !time) {
    return err("Parámetros requeridos: jornada, day, time", 400);
  }

  const slots = await db
    .select()
    .from(officialAvailability)
    .where(and(
      eq(officialAvailability.jornada, jornada),
      eq(officialAvailability.dayOfWeek, day),
    ));

  const availableIds = slots
    .filter((s) => s.startTime <= time && s.endTime > time)
    .map((s) => s.officialId);

  if (availableIds.length === 0) return ok([]);

  const filters: ReturnType<typeof eq>[] = [
    eq(officials.active, true),
    inArray(officials.id, availableIds),
  ];
  if (noTeam) filters.push(isNull(officials.teamId));

  const result = await db.select().from(officials).where(and(...filters));
  return ok(result);
}
