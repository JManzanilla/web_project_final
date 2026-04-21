export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { matches, teams, players, playerMatchStats, matchOfficials } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const schema = z.object({
  scope: z.enum(["matches", "teams", "all"]),
});

// DELETE /api/admin/reset — solo admin
export async function DELETE(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const { scope } = body.data;

  if (scope === "matches" || scope === "all") {
    // matchOfficials y playerMatchStats tienen onDelete: cascade desde matches
    await db.delete(matches);
  }

  if (scope === "teams" || scope === "all") {
    // players tiene onDelete: cascade desde teams
    // playerMatchStats tiene onDelete: cascade desde players
    // matches tiene FK a teams pero no tiene onDelete cascade — borrar antes
    if (scope === "teams") await db.delete(matches);
    await db.delete(teams);
  }

  return ok({ scope, message: "Datos eliminados correctamente" });
}
