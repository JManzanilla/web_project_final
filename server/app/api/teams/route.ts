export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const createSchema = z.object({
  name:    z.string().min(1, "Nombre requerido"),
  logoUrl: z.string().url().optional().nullable(),
});

// GET /api/teams — público
export async function GET() {
  const all = await db.query.teams.findMany({
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  return ok(all);
}

// POST /api/teams — solo admin
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const [team] = await db.insert(teams).values(body.data).returning();
  return ok(team, 201);
}
