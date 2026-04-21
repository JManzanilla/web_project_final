export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ok, err } from "@/lib/api";

const schema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

function getSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET!);
}

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const { username, password } = body.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase().trim()))
    .limit(1);

  if (!user || !user.active) {
    return err("Usuario no encontrado", 401);
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return err("Contraseña incorrecta", 401);
  }

  // Genera JWT con 7 días de expiración
  const token = await new SignJWT({
    id:          user.id,
    username:    user.username,
    name:        user.name,
    role:        user.role,
    teamId:      user.teamId,
    firstLogin:  user.firstLogin,
    permissions: user.permissions ?? {},
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  return ok({
    token,
    user: {
      id:          user.id,
      username:    user.username,
      name:        user.name,
      role:        user.role,
      teamId:      user.teamId,
      firstLogin:  user.firstLogin,
      permissions: user.permissions ?? {},
    },
  });
}
