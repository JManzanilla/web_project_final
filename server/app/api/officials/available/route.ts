export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { officials, officialAvailability } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

// GET /api/officials/available?jornada=N&day=D&time=HH:MM
// Devuelve árbitros activos con disponibilidad en esa jornada, día y hora
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(["admin", "anotador", "lider", "transmision"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const jornada = parseInt(searchParams.get("jornada") ?? "");
  const day     = parseInt(searchParams.get("day") ?? "");
  const time    = searchParams.get("time") ?? "";

  if (isNaN(jornada) || isNaN(day) || !time) {
    return err("Parámetros requeridos: jornada, day, time", 400);
  }

  // Slots de esa jornada y día
  const slots = await db
    .select()
    .from(officialAvailability)
    .where(
      and(
        eq(officialAvailability.jornada, jornada),
        eq(officialAvailability.dayOfWeek, day),
      )
    );

  // Filtrar por horario: startTime <= time < endTime
  const availableIds = slots
    .filter((s) => s.startTime <= time && s.endTime > time)
    .map((s) => s.officialId);

  if (availableIds.length === 0) return ok([]);

  const result = await db
    .select()
    .from(officials)
    .where(
      and(
        eq(officials.active, true),
        inArray(officials.id, availableIds),
      )
    );

  return ok(result);
}
