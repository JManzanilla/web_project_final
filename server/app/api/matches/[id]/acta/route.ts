export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const BUCKET = "actas";
const MAX_SIZE_MB = 10;
const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// POST /api/matches/:id/acta — sube PDF/imagen y guarda URL en la BD
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error: authErr } = await requireAuth(["admin", "anotador"], { section: "match", level: "edit" });
    if (authErr) return authErr;

    const { id } = await params;

    const match = await db.query.matches.findFirst({ where: eq(matches.id, id) });
    if (!match) return err("Partido no encontrado", 404);
    if (match.status === "finished" && match.actaUrl) {
      return err("El partido ya está finalizado y el acta no puede modificarse", 403);
    }

    const formData = await req.formData();
    const file = formData.get("acta") as File | null;
    if (!file) return err("No se recibió ningún archivo", 400);
    const ext = ACCEPTED_TYPES[file.type];
    if (!ext) return err("Solo se aceptan PDF, JPG, PNG o WEBP", 400);
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return err(`El archivo excede ${MAX_SIZE_MB}MB`, 400);

    const path = `${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) return err(`Error al subir el archivo: ${uploadError.message}`, 500);

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    await db.update(matches).set({ actaUrl: publicUrl }).where(eq(matches.id, id));

    return ok({ actaUrl: publicUrl });
  } catch (e) {
    return err(`Error interno: ${(e as Error).message}`, 500);
  }
}
