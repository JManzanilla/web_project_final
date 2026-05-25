export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { officials } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const BUCKET      = "photos";
const MAX_SIZE_MB  = 5;
const ACCEPTED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};

// POST /api/officials/:id/photo — solo admin
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error: authErr } = await requireAuth(["admin"], { section: "officials", level: "edit" });
    if (authErr) return authErr;

    const { id } = await params;
    const official = await db.query.officials.findFirst({ where: eq(officials.id, id) });
    if (!official) return err("Árbitro no encontrado", 404);

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return err("No se recibió ningún archivo", 400);

    const ext = ACCEPTED_TYPES[file.type];
    if (!ext) return err("Solo se aceptan JPG, PNG o WEBP", 400);
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return err(`El archivo excede ${MAX_SIZE_MB}MB`, 400);

    const path   = `officials/${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) return err(`Error al subir la foto: ${uploadError.message}`, 500);

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    await db.update(officials).set({ photoUrl: publicUrl }).where(eq(officials.id, id));

    return ok({ photoUrl: publicUrl });
  } catch (e) {
    return err(`Error interno: ${(e as Error).message}`, 500);
  }
}
