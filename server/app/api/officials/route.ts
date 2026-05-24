export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { officials } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const rolesSchema = z.object({
  mainRef:   z.boolean(),
  assistRef: z.boolean(),
  scorer:    z.boolean(),
});

const createSchema = z.object({
  name:          z.string().min(1),
  lastName:      z.string().min(1),
  roles:         rolesSchema,
  availableDays: z.array(z.number().int().min(0).max(6)),
});

// GET /api/officials — usuarios autenticados
export async function GET() {
  const { error } = await requireAuth(["admin", "anotador", "lider", "transmision"]);
  if (error) return error;

  const all = await db.query.officials.findMany({
    orderBy: (o, { asc }) => [asc(o.lastName), asc(o.name)],
  });
  return ok(all);
}

// POST /api/officials — solo admin
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const [official] = await db.insert(officials).values(body.data).returning();
  return ok(official, 201);
}
