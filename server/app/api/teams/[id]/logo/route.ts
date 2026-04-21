export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const BUCKET      = "photos";
const MAX_SIZE_MB  = 5;
const ACCEPTED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};

// POST /api/teams/:id/logo
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error: authErr } = await requireAuth(["admin", "lider"], { section: "roster", level: "edit" });
    if (authErr) return authErr;

    const { id } = await params;
    const team = await db.query.teams.findFirst({ where: eq(teams.id, id) });
    if (!team) return err("Equipo no encontrado", 404);

    const formData = await req.formData();
    const file = formData.get("logo") as File | null;
    if (!file) return err("No se recibió ningún archivo", 400);

    const ext = ACCEPTED_TYPES[file.type];
    if (!ext) return err("Solo se aceptan JPG, PNG o WEBP", 400);
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return err(`El archivo excede ${MAX_SIZE_MB}MB`, 400);

    const path   = `teams/${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) return err(`Error al subir el logo: ${uploadError.message}`, 500);

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    await db.update(teams).set({ logoUrl: publicUrl }).where(eq(teams.id, id));

    return ok({ logoUrl: publicUrl });
  } catch (e) {
    return err(`Error interno: ${(e as Error).message}`, 500);
  }
}
