import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shirt, Loader2, UserX, Users } from "lucide-react";
import { apiGet } from "@/lib/apiClient";

interface OfficialRoles { mainRef: boolean; assistRef: boolean; scorer: boolean }
interface Official {
  id:       string;
  name:     string;
  lastName: string;
  photoUrl: string | null;
  roles:    OfficialRoles;
  active:   boolean;
  teamId:   string | null;
}

interface OfficialStepProps {
  refs:        { ref1: string; ref2: string; scorer: string };
  setRefs:     (refs: { ref1: string; ref2: string; scorer: string }) => void;
  jornada:     number;
  phase:       string;
  scheduledAt: string;
  onNext:      () => void;
  onSkip:      () => void;
  loading?:    boolean;
}

function hasFullName(val: string) {
  return val.trim().split(/\s+/).filter(Boolean).length >= 2;
}

function OfficialSelect({
  label, value, onChange, officials, roleKey,
}: {
  label: string; value: string; onChange: (v: string) => void;
  officials: Official[]; roleKey: keyof OfficialRoles;
}) {
  const filtered  = officials.filter((o) => o.active && o.roles[roleKey]);
  const isManual  = value !== "" && !filtered.some((o) => `${o.name} ${o.lastName}` === value);
  const fieldClass = `glass-input h-13 px-5 text-base w-full ${value.length > 0 && !hasFullName(value) ? "border-red-500/40" : ""}`;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase text-white/50 ml-4">
        {label} <span className="text-red-400/60">*</span>
      </label>

      {filtered.length > 0 ? (
        <>
          <select
            value={isManual ? "__manual__" : value}
            onChange={(e) => { if (e.target.value === "__manual__") onChange(""); else onChange(e.target.value); }}
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
            <Input placeholder="Nombre Apellido" className={fieldClass} value={value}
              onChange={(e) => onChange(e.target.value)} autoFocus />
          )}
        </>
      ) : (
        <Input placeholder="Nombre Apellido" className={fieldClass} value={value}
          onChange={(e) => onChange(e.target.value)} />
      )}

      {value.length > 0 && !hasFullName(value) && (
        <p className="text-[11px] text-red-400/70 ml-4">Ingresa nombre y apellido</p>
      )}
    </div>
  );
}

export function OfficialStep({ refs, setRefs, jornada, phase, scheduledAt, onNext, onSkip, loading }: OfficialStepProps) {
  const [officialType, setOfficialType] = useState<"local" | "external">("local");

  const isPlayoff   = phase !== "regular";
  const dayOfWeek   = new Date(scheduledAt).getDay();
  const time        = scheduledAt.length >= 16 ? scheduledAt.substring(11, 16) : "00:00";

  // Para playoffs: query con playoff=true&noTeam=true
  // Para regular: query por disponibilidad de jornada
  const { data: available = [], isLoading } = useQuery<Official[]>({
    queryKey: ["/api/officials/available", jornada, dayOfWeek, time, isPlayoff],
    queryFn:  () => isPlayoff
      ? apiGet<Official[]>(`/api/officials/available?playoff=true&noTeam=true`)
      : apiGet<Official[]>(`/api/officials/available?jornada=${jornada}&day=${dayOfWeek}&time=${time}`),
    enabled:  officialType === "local",
  });

  const { data: allOfficials = [] } = useQuery<Official[]>({
    queryKey: ["/api/officials"],
    queryFn:  () => apiGet<Official[]>("/api/officials"),
    enabled:  officialType === "local" && !isPlayoff,
  });

  // Árbitros a mostrar:
  // - Playoffs: los que devuelve el endpoint (ya filtrados sin equipo)
  // - Regular: disponibles por horario, o todos activos como fallback
  const officialsList = isPlayoff
    ? available
    : (available.length > 0 ? available : allOfficials.filter((o) => o.active && !o.teamId));

  const valid = hasFullName(refs.ref1) && hasFullName(refs.ref2) && hasFullName(refs.scorer);

  const phaseLabels: Record<string, string> = {
    sf1: "Semifinal 1", sf2: "Semifinal 2", final: "Gran Final",
  };
  const phaseLabel = phaseLabels[phase];

  return (
    <div className="glass-panel p-5 sm:p-8 animate-in fade-in duration-300">
      <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
        <Shirt className="text-brand-orange w-5 h-5" />
        Oficiales del Partido
        {phaseLabel && (
          <span className="ml-auto text-[11px] font-bold text-brand-orange/70 bg-brand-orange/10 border border-brand-orange/25 px-2.5 py-1 rounded-full">
            {phaseLabel}
          </span>
        )}
      </h3>

      {/* Toggle externo / local */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setOfficialType("local")}
          className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-full border text-sm font-bold transition-all ${
            officialType === "local"
              ? "bg-brand-orange/15 border-brand-orange/50 text-brand-orange"
              : "bg-white/4 border-white/10 text-white/40 hover:text-white/60"
          }`}
        >
          <Users className="w-4 h-4" /> Árbitros locales
        </button>
        <button
          onClick={() => setOfficialType("external")}
          className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-full border text-sm font-bold transition-all ${
            officialType === "external"
              ? "bg-brand-orange/15 border-brand-orange/50 text-brand-orange"
              : "bg-white/4 border-white/10 text-white/40 hover:text-white/60"
          }`}
        >
          <UserX className="w-4 h-4" /> Árbitros externos
        </button>
      </div>

      {/* Árbitros externos: saltar paso */}
      {officialType === "external" && (
        <div className="text-center py-6 space-y-3">
          <p className="text-white/40 text-sm">
            Los árbitros externos no están registrados en el sistema.
          </p>
          <p className="text-white/25 text-xs">
            Puedes continuar directamente a la carga de jugadores.
          </p>
          <Button
            onClick={onSkip}
            className="mt-2 rounded-full h-11 bg-brand-orange hover:bg-brand-orange/80 text-white font-bold px-8"
          >
            Continuar sin registrar árbitros →
          </Button>
        </div>
      )}

      {/* Árbitros locales: mostrar formulario */}
      {officialType === "local" && (
        <>
          {!isLoading && isPlayoff && available.length === 0 && (
            <p className="text-[11px] text-yellow-400/60 mb-3 text-center">
              No hay árbitros sin equipo registrados. Escribe el nombre manualmente.
            </p>
          )}
          {!isLoading && !isPlayoff && available.length === 0 && (
            <p className="text-[11px] text-yellow-400/60 mt-3 mb-2 text-center">
              Sin árbitros con disponibilidad para la Jornada {jornada} en este horario.
              Escribe el nombre manualmente.
            </p>
          )}

          <div className="space-y-4">
            <OfficialSelect label="Árbitro Principal" value={refs.ref1}
              onChange={(v) => setRefs({ ...refs, ref1: v })} officials={officialsList} roleKey="mainRef" />
            <OfficialSelect label="Árbitro Auxiliar" value={refs.ref2}
              onChange={(v) => setRefs({ ...refs, ref2: v })} officials={officialsList} roleKey="assistRef" />
            <OfficialSelect label="Anotador" value={refs.scorer}
              onChange={(v) => setRefs({ ...refs, scorer: v })} officials={officialsList} roleKey="scorer" />
          </div>

          {!valid && (
            <p className="text-[11px] text-white/25 mt-4 text-center">
              Completa los tres campos con nombre y apellido para continuar
            </p>
          )}

          <div className="flex justify-end mt-4">
            <Button onClick={onNext} disabled={!valid || loading}
              className="rounded-full h-11 bg-brand-orange hover:bg-brand-orange/80 text-white font-bold px-6 disabled:opacity-30 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Continuar →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
