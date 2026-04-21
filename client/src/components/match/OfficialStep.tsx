import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shirt, Loader2 } from "lucide-react";

interface OfficialStepProps {
  refs: { ref1: string; ref2: string; scorer: string };
  setRefs: (refs: { ref1: string; ref2: string; scorer: string }) => void;
  onNext: () => void;
  loading?: boolean;
}

// Nombre + al menos un apellido = mínimo 2 palabras
function hasFullName(val: string) {
  return val.trim().split(/\s+/).filter(Boolean).length >= 2;
}

export function OfficialStep({ refs, setRefs, onNext, loading }: OfficialStepProps) {
  const valid = hasFullName(refs.ref1) && hasFullName(refs.ref2) && hasFullName(refs.scorer);

  const fieldClass = (val: string) =>
    `glass-input h-13 px-5 text-base ${val.length > 0 && !hasFullName(val) ? "border-red-500/40" : ""}`;

  const hint = (val: string) =>
    val.length > 0 && !hasFullName(val)
      ? <p className="text-[11px] text-red-400/70 ml-4">Ingresa nombre y apellido</p>
      : null;

  return (
    <div className="glass-panel p-5 sm:p-8 animate-in fade-in duration-300">
      <h3 className="text-lg font-display font-bold mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
        <Shirt className="text-brand-orange w-5 h-5" />
        Oficiales del Partido
      </h3>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-white/50 ml-4">
            Árbitro Principal <span className="text-red-400/60">*</span>
          </label>
          <Input
            placeholder="Nombre Apellido"
            className={fieldClass(refs.ref1)}
            value={refs.ref1}
            onChange={(e) => setRefs({ ...refs, ref1: e.target.value })}
          />
          {hint(refs.ref1)}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-white/50 ml-4">
            Árbitro Auxiliar <span className="text-red-400/60">*</span>
          </label>
          <Input
            placeholder="Nombre Apellido"
            className={fieldClass(refs.ref2)}
            value={refs.ref2}
            onChange={(e) => setRefs({ ...refs, ref2: e.target.value })}
          />
          {hint(refs.ref2)}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-white/50 ml-4">
            Anotador <span className="text-red-400/60">*</span>
          </label>
          <Input
            placeholder="Nombre Apellido"
            className={fieldClass(refs.scorer)}
            value={refs.scorer}
            onChange={(e) => setRefs({ ...refs, scorer: e.target.value })}
          />
          {hint(refs.scorer)}
        </div>
      </div>

      {!valid && (
        <p className="text-[11px] text-white/25 mt-4 text-center">
          Completa los tres campos con nombre y apellido para continuar
        </p>
      )}

      <div className="flex justify-end mt-4">
        <Button
          onClick={onNext}
          disabled={!valid || loading}
          className="rounded-full h-11 bg-brand-orange hover:bg-brand-orange/80 text-white font-bold px-6 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Continuar →
        </Button>
      </div>
    </div>
  );
}
