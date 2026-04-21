import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { jwtVerify } from "jose";
import type { UserRole } from "@/lib/types";
import type { UserPermissions, SectionKey } from "@/db/schema";

export interface JWTUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  teamId: string | null;
  firstLogin: boolean;
  permissions: UserPermissions;
}

function getSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET!);
}

// Respuesta de error estándar
export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Respuesta de éxito estándar
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

// Verifica el JWT del header Authorization, rol y opcionalmente permiso extra
// extraPermission: si el usuario tiene ese permiso extra (view o edit), se permite acceso
export async function requireAuth(
  allowedRoles?: UserRole[],
  extraPermission?: { section: SectionKey; level: "view" | "edit" },
) {
  const headersList = await headers();
  const authHeader = headersList.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null as null, error: err("No autenticado", 401) };
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const user = payload as unknown as JWTUser;

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Verificar si tiene permiso extra que lo habilite
      if (extraPermission) {
        const perm = (user.permissions ?? {})[extraPermission.section];
        if (extraPermission.level === "view"  && perm?.view)  return { user, error: null };
        if (extraPermission.level === "edit"  && perm?.edit)  return { user, error: null };
      }
      return { user: null as null, error: err("Sin permisos", 403) };
    }

    return { user, error: null };
  } catch {
    return { user: null as null, error: err("Token inválido o expirado", 401) };
  }
}
