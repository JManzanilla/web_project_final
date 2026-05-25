export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { matches, teams, players, officials } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";
import { notifyDangerZone } from "@/lib/email";

const schema = z.object({
  scope: z.enum(["matches", "players", "all"]),
});

// DELETE /api/admin/reset — solo admin
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const { scope } = body.data;

  if (scope === "matches" || scope === "all") {
    // matchOfficials y playerMatchStats tienen onDelete: cascade desde matches
    await db.delete(matches);
  }

  if (scope === "players" || scope === "all") {
    // playerMatchStats tiene onDelete: cascade desde players
    await db.delete(players);
  }

  if (scope === "all") {
    await db.delete(teams);
    await db.delete(officials); // CASCADE elimina officialAvailability
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  notifyDangerZone(scope, user!.name, ip).catch(() => {});

  return ok({ scope, message: "Datos eliminados correctamente" });
}
