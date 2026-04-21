export const dynamic = "force-dynamic";
import { requireAuth, ok } from "@/lib/api";

// GET /api/me — devuelve el usuario autenticado desde el JWT
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  return ok(user);
}
