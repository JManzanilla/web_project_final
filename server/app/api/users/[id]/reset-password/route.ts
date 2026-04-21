export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const schema = z.object({
  newPassword: z.string().min(6),
});

// PUT /api/users/:id/reset-password — solo admin
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const passwordHash = await hash(body.data.newPassword, 12);

  await db.update(users)
    .set({ passwordHash, firstLogin: true })
    .where(eq(users.id, id));

  return ok({ message: "Contraseña reseteada" });
}
