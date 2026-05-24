import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shirt, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/apiClient";

interface OfficialRoles { mainRef: boolean; assistRef: boolean; scorer: boolean }
interface Official {
  id:            string;
  name:          string;
  lastName:      string;
  photoUrl:      string | null;
  roles:         OfficialRoles;
  availableDays: number[];
  active:        boolean;
}

interface OfficialStepProps {
  refs:         { ref1: string; ref2: string; scorer: string };
  setRefs:      (refs: { ref1: string; ref2: string; scorer: string }) => void;
  scheduledAt?: string;
  onNext:       () => void;
  loading?:     boolean;
}

function hasFullName(val: string) {
  return val.trim().split(/\s+/).filter(Boolean).length >= 2;
}

// Selector que muestra oficiales filtrados + opción manual
function OfficialSelect({
  label,
  value,
  onChange,
  officials,
  roleKey,
}: {
  label:     string;
  value:     string;
  onChange:  (v: string) => void;
  officials: Official[];
  roleKey:   keyof OfficialRoles;
}) {
  const filtered = officials.filter((o) => o.active && o.roles[roleKey]);
  const isManual = value !== "" && !filtered.some((o) => `${o.name} ${o.lastName}` === value);

  const fieldClass = `glass-input h-13 px-5 text-base w-full ${
    value.length > 0 && !hasFullName(value) ? "border-red-500/40" : ""
  }`;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase text-white/50 ml-4">
        {label} <span className="text-red-400/60">*</span>
      </label>

      {filtered.length > 0 ? (
        <>
          <select
            value={isManual ? "__manual__" : value}
            onChange={(e) => {
              if (e.target.value === "__manual__") onChange("");
              else onChange(e.target.value);
            }}
            className="glass-input h-13 px-5 text-base w-full bg-transparent appearance-none cursor-pointer"
          >
            <option value="" className="bg-gray-900 text-white/50">— Selecciona —</option>
            {filtered.map((o) => (
              <option key={o.id} value={`${o.name} ${o.lastName}`} className="bg-gray-900 text-white">
                {o.name} {o.lastName}
              </option>
            ))}
            <option value="__manual__" className="bg-gray-900 text-white/40">Escribir manualmente…</option>
          </select>

          {isManual && (
            <Input
              placeholder="Nombre Apellido"
              className={fieldClass}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          )}
        </>
      ) : (
        <Input
          placeholder="Nombre Apellido"
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {value.length > 0 && !hasFullName(value) && (
        <p className="text-[11px] text-red-400/70 ml-4">Ingresa nombre y apellido</p>
      )}
    </div>
  );
}

export function OfficialStep({ refs, setRefs, scheduledAt, onNext, loading }: OfficialStepProps) {
  const { data: allOfficials = [] } = useQuery<Official[]>({
    queryKey: ["/api/officials"],
    queryFn:  () => apiGet<Official[]>("/api/officials"),
  });

  // Filtrar por día disponible si se conoce la fecha del partido
  const dayOfWeek = scheduledAt ? new Date(scheduledAt).getDay() : null;
  const officials = dayOfWeek !== null
    ? allOfficials.filter((o) => o.availableDays.includes(dayOfWeek))
    : allOfficials;

  const valid = hasFullName(refs.ref1) && hasFullName(refs.ref2) && hasFullName(refs.scorer);

  return (
    <div className="glass-panel p-5 sm:p-8 animate-in fade-in duration-300">
      <h3 className="text-lg font-display font-bold mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
        <Shirt className="text-brand-orange w-5 h-5" />
        Oficiales del Partido
      </h3>

      {dayOfWeek !== null && officials.length === 0 && allOfficials.length > 0 && (
        <p className="text-[11px] text-yellow-400/60 mb-4 text-center">
          No hay árbitros disponibles registrados para este día. Escribe el nombre manualmente.
        </p>
      )}

      <div className="space-y-4">
        <OfficialSelect
          label="Árbitro Principal"
          value={refs.ref1}
          onChange={(v) => setRefs({ ...refs, ref1: v })}
          officials={officials}
          roleKey="mainRef"
        />
        <OfficialSelect
          label="Árbitro Auxiliar"
          value={refs.ref2}
          onChange={(v) => setRefs({ ...refs, ref2: v })}
          officials={officials}
          roleKey="assistRef"
        />
        <OfficialSelect
          label="Anotador"
          value={refs.scorer}
          onChange={(v) => setRefs({ ...refs, scorer: v })}
          officials={officials}
          roleKey="scorer"
        />
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
