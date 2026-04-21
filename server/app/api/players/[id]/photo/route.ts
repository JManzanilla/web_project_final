export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const BUCKET     = "photos";
const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};

// POST /api/players/:id/photo
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error: authErr } = await requireAuth(["admin", "lider"], { section: "roster", level: "edit" });
    if (authErr) return authErr;

    const { id } = await params;
    const player = await db.query.players.findFirst({ where: eq(players.id, id) });
    if (!player) return err("Jugador no encontrado", 404);

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return err("No se recibió ningún archivo", 400);

    const ext = ACCEPTED_TYPES[file.type];
    if (!ext) return err("Solo se aceptan JPG, PNG o WEBP", 400);
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return err(`El archivo excede ${MAX_SIZE_MB}MB`, 400);

    const path   = `players/${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) return err(`Error al subir la foto: ${uploadError.message}`, 500);

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    await db.update(players).set({ photoUrl: publicUrl }).where(eq(players.id, id));

    return ok({ photoUrl: publicUrl });
  } catch (e) {
    return err(`Error interno: ${(e as Error).message}`, 500);
  }
}
