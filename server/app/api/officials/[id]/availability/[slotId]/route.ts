export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { officialAvailability } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

// DELETE /api/officials/:id/availability/:slotId
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; slotId: string }> }
) {
  const { slotId } = await params;
  const { error } = await requireAuth(["admin"], { section: "official-schedule", level: "edit" });
  if (error) return error;

  const [deleted] = await db
    .delete(officialAvailability)
    .where(eq(officialAvailability.id, slotId))
    .returning({ id: officialAvailability.id });

  if (!deleted) return err("Slot no encontrado", 404);
  return ok({ message: "Slot eliminado" });
}
