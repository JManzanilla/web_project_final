export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";

const sectionPermSchema = z.object({ view: z.boolean(), edit: z.boolean() });

const updateSchema = z.object({
  name:        z.string().min(1).optional(),
  role:        z.enum(["admin", "lider", "anotador", "transmision"] as const).optional(),
  teamId:      z.string().uuid().optional().nullable(),
  permissions: z.record(z.string(), sectionPermSchema).optional(),
});

// PUT /api/users/:id — solo admin
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const [updated] = await db
    .update(users)
    .set(body.data)
    .where(eq(users.id, id))
    .returning({
      id:          users.id,
      username:    users.username,
      name:        users.name,
      role:        users.role,
      teamId:      users.teamId,
      active:      users.active,
      firstLogin:  users.firstLogin,
      permissions: users.permissions,
    });

  if (!updated) return err("Usuario no encontrado", 404);
  return ok(updated);
}

// DELETE /api/users/:id?permanent=true — solo admin
// Sin ?permanent → desactiva (active = false)
// Con ?permanent=true → elimina definitivamente
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user: admin, error } = await requireAuth(["admin"]);
  if (error) return error;

  if (admin!.id === id) return err("No puedes eliminar tu propia cuenta", 400);

  const permanent = req.nextUrl.searchParams.get("permanent") === "true";

  if (permanent) {
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    if (!deleted) return err("Usuario no encontrado", 404);
    return ok({ message: "Usuario eliminado" });
  }

  const [updated] = await db
    .update(users)
    .set({ active: false })
    .where(eq(users.id, id))
    .returning({ id: users.id });

  if (!updated) return err("Usuario no encontrado", 404);
  return ok({ message: "Usuario desactivado" });
}
