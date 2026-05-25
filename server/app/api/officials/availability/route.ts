export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { officialAvailability } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

// GET /api/officials/availability?jornada=N
// Devuelve todos los slots de todos los árbitros para una jornada
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(["admin"], { section: "official-schedule", level: "view" });
  if (error) return error;

  const jornada = parseInt(req.nextUrl.searchParams.get("jornada") ?? "");
  if (isNaN(jornada)) return err("Parámetro jornada requerido");

  const slots = await db
    .select()
    .from(officialAvailability)
    .where(eq(officialAvailability.jornada, jornada))
    .orderBy(officialAvailability.dayOfWeek, officialAvailability.startTime);

  return ok(slots);
}
