export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { matchOfficials } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const schema = z.object({
  ref1:   z.string().optional().nullable(),
  ref2:   z.string().optional().nullable(),
  scorer: z.string().optional().nullable(),
});

// PUT /api/matches/:id/officials — anotador o admin
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const { error } = await requireAuth(["admin", "anotador"]);
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  // Upsert: elimina y reinserta
  await db.delete(matchOfficials).where(eq(matchOfficials.matchId, matchId));
  const [official] = await db.insert(matchOfficials).values({ ...body.data, matchId }).returning();

  return ok(official);
}
