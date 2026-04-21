export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const schema = z.object({
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
});

export async function PUT(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const passwordHash = await hash(body.data.newPassword, 12);

  await db
    .update(users)
    .set({ passwordHash, firstLogin: false })
    .where(eq(users.id, user!.id));

  return ok({ message: "Contraseña actualizada" });
}
