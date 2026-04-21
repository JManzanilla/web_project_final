export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const createSchema = z.object({
  jornada:     z.number().int().min(1),
  homeTeamId:  z.string().uuid(),
  awayTeamId:  z.string().uuid(),
  scheduledAt: z.string().datetime(),
});

// GET /api/matches?jornada=5&status=finished — público
export async function GET(req: NextRequest) {
  const jornada = req.nextUrl.searchParams.get("jornada");
  const status  = req.nextUrl.searchParams.get("status");

  const all = await db.query.matches.findMany({
    where: (m, { eq, and }) => {
      const filters = [];
      if (jornada) filters.push(eq(m.jornada, parseInt(jornada)));
      if (status)  filters.push(eq(m.status, status as "upcoming" | "live" | "finished"));
      return filters.length ? and(...filters) : undefined;
    },
    with: {
      homeTeam: true,
      awayTeam: true,
      officials: true,
      stats: { with: { player: true } },
    },
    orderBy: (m, { asc }) => [asc(m.scheduledAt)],
  });
  return ok(all);
}

// POST /api/matches — solo admin
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const [match] = await db.insert(matches).values({
    ...body.data,
    scheduledAt: new Date(body.data.scheduledAt),
  }).returning();

  return ok(match, 201);
}
