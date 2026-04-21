export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const sectionPermSchema = z.object({ view: z.boolean(), edit: z.boolean() });

const createSchema = z.object({
  username:    z.string().min(3),
  password:    z.string().min(6),
  name:        z.string().min(1),
  role:        z.enum(["admin", "lider", "anotador", "transmision"] as const),
  teamId:      z.string().uuid().optional().nullable(),
  permissions: z.record(z.string(), sectionPermSchema).optional(),
});

// GET /api/users — solo admin
export async function GET() {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const all = await db.query.users.findMany({
    columns: { passwordHash: false },
    with: { team: true },
    orderBy: (u, { asc }) => [asc(u.name)],
  });
  return ok(all);
}

// POST /api/users — solo admin
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const passwordHash = await hash(body.data.password, 12);

  const [user] = await db.insert(users).values({
    ...body.data,
    username: body.data.username.toLowerCase().trim(),
    passwordHash,
  }).returning({ id: users.id, username: users.username, name: users.name, role: users.role });

  return ok(user, 201);
}
