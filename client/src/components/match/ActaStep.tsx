import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, CheckCircle2, Loader2, FileText, Save } from "lucide-react";
import { sileo } from "sileo";
import { apiUpload } from "@/lib/apiClient";

interface ActaStepProps {
  matchId: string;
  existingActaUrl?: string | null;
  loading?: boolean;
  onBack: () => void;
  onFinish: () => void;
}

export function ActaStep({ matchId, existingActaUrl, loading, onBack, onFinish }: ActaStepProps) {
  const inputRef                  = useRef<HTMLInputElement>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded]   = useState(!!existingActaUrl);
  const [actaUrl, setActaUrl]     = useState<string | null>(existingActaUrl ?? null);

  const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

  const uploadFile = async (f: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("acta", f);
      const res = await apiUpload<{ actaUrl: string }>(`/api/matches/${matchId}/acta`, form);
      setActaUrl(res.actaUrl);
      setUploaded(true);
      sileo.success({ title: "Acta subida correctamente" });
    } catch (e) {
      sileo.error({ title: "Error al subir acta", description: (e as Error).message });
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      sileo.error({ title: "Formato no válido", description: "Solo se aceptan PDF, JPG, PNG o WEBP" });
      return;
    }
    setFile(f);
    setUploaded(false);
    uploadFile(f);
  };

  return (
    <div className="glass-panel p-5 sm:p-8 animate-in fade-in duration-300">
      <h3 className="text-lg font-display font-bold mb-6 border-b border-white/10 pb-4">
        Hoja de anotación física
      </h3>

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={[
          "flex flex-col items-center justify-center gap-4 py-8 border-2 border-dashed rounded-2xl transition-all",
          uploading
            ? "border-brand-orange/30 bg-brand-orange/4 cursor-wait"
            : uploaded
              ? "border-green-500/40 bg-green-500/5 cursor-pointer hover:border-green-500/60"
              : "border-white/10 cursor-pointer hover:border-brand-orange/40 hover:bg-brand-orange/4 group",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className={[
          "w-16 h-16 rounded-full border flex items-center justify-center transition-colors",
          uploading
            ? "border-brand-orange/30 bg-brand-orange/10"
            : uploaded
              ? "border-green-500/30 bg-green-500/10"
              : "border-brand-orange/30 bg-brand-orange/10 group-hover:bg-brand-orange/15",
        ].join(" ")}>
          {uploading
            ? <Loader2 className="w-7 h-7 text-brand-orange animate-spin" />
            : uploaded
              ? <CheckCircle2 className="w-7 h-7 text-green-400" />
              : <FileUp className="w-7 h-7 text-brand-orange" />}
        </div>

        <div className="text-center">
          {uploading ? (
            <>
              <p className="text-base font-semibold text-brand-orange mb-1">Subiendo acta…</p>
              <p className="text-sm text-white/30">{file?.name}</p>
            </>
          ) : uploaded ? (
            <>
              <p className="text-base font-semibold text-green-400 mb-1">Acta subida ✓</p>
              <p className="text-sm text-white/30">{file?.name ?? "Archivo cargado"}</p>
              <p className="text-xs text-white/20 mt-1">Toca para reemplazar</p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-white/60 mb-1">Toca para subir el acta</p>
              <p className="text-sm text-white/25">PDF, JPG o PNG · Firmada por árbitros y capitanes · máx. 10 MB</p>
            </>
          )}
        </div>
      </div>

      {actaUrl && (
        <a
          href={actaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 mt-3 text-[12px] text-brand-orange/70 hover:text-brand-orange transition-colors font-semibold"
        >
          <FileText className="w-3.5 h-3.5" /> Ver acta subida ↗
        </a>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-7">
        <Button
          onClick={onBack}
          variant="outline"
          className="rounded-full h-12 border-white/20 text-white/50 sm:w-auto w-full"
        >
          ← Atrás
        </Button>
        <Button
          onClick={onFinish}
          disabled={!uploaded || loading}
          className="rounded-full h-12 bg-green-600 hover:bg-green-500 text-white font-bold sm:w-auto w-full disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Finalizar partido
        </Button>
      </div>
    </div>
  );
}
