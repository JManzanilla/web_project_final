import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPut } from "@/lib/apiClient";
import { sileo } from "sileo";
import { Copy, ExternalLink, Check, Save, ChevronRight } from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface OfficialRoles { mainRef: boolean; assistRef: boolean; scorer: boolean }
interface Official { id: string; name: string; lastName: string; roles: OfficialRoles; active: boolean }
interface MatchOfficials { ref1: string | null; ref2: string | null; scorer: string | null }
interface MatchItem {
  id:          string;
  jornada:     number;
  scheduledAt: string;
  homeTeam:    { id: string; name: string };
  awayTeam:    { id: string; name: string };
  officials:   MatchOfficials | null;
}
interface Assignment { ref1: string; ref2: string; scorer: string }

const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_FULL  = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS     = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function fmtTime(iso: string) {
  return iso.length >= 16 ? iso.substring(11, 16) : "—";
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${DAYS_FULL[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}
function fmtDateShort(iso: string) {
  const d = new Date(iso);
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;
}

// ── Select de árbitro ─────────────────────────────────────────────────────────
function OfficialSelect({
  label, value, onChange, available, roleKey, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  available: Official[]; roleKey: keyof OfficialRoles; placeholder: string;
}) {
  const filtered  = available.filter((o) => o.roles[roleKey]);
  const isManual  = value !== "" && !filtered.some((o) => `${o.name} ${o.lastName}` === value);

  return (
    <div className="flex-1 min-w-0 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</p>
      {filtered.length > 0 ? (
        <select
          value={isManual ? "__m__" : value}
          onChange={(e) => onChange(e.target.value === "__m__" ? "" : e.target.value)}
          className="w-full glass-input h-9 px-3 text-sm bg-transparent appearance-none cursor-pointer text-white"
        >
          <option value="" className="bg-gray-900 text-white/40">{placeholder}</option>
          {filtered.map((o) => (
            <option key={o.id} value={`${o.name} ${o.lastName}`} className="bg-gray-900 text-white">
              {o.name} {o.lastName}
            </option>
          ))}
          <option value="__m__" className="bg-gray-900 text-white/40">Otro…</option>
        </select>
      ) : (
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="glass-input h-9 text-sm"
        />
      )}
      {isManual && filtered.length > 0 && (
        <Input
          placeholder="Nombre Apellido"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="glass-input h-9 text-sm mt-1"
          autoFocus
        />
      )}
    </div>
  );
}

// ── Fila de partido ───────────────────────────────────────────────────────────
function MatchRow({
  match, jornada, assignment, onChange,
}: {
  match:      MatchItem;
  jornada:    number;
  assignment: Assignment;
  onChange:   (patch: Partial<Assignment>) => void;
}) {
  const d    = new Date(match.scheduledAt);
  const day  = d.getDay();
  const time = fmtTime(match.scheduledAt);

  const { data: available = [] } = useQuery<Official[]>({
    queryKey: ["/api/officials/available", jornada, day, time],
    queryFn:  () => apiGet<Official[]>(`/api/officials/available?jornada=${jornada}&day=${day}&time=${time}`),
  });

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
      {/* Cabecera del partido */}
      <div className="flex items-center gap-3">
        <div className="text-center min-w-[48px]">
          <p className="text-[10px] text-white/30 font-bold uppercase">{fmtDateShort(match.scheduledAt)}</p>
          <p className="text-lg font-black text-brand-orange font-display">{time}</p>
        </div>
        <div className="flex-1 text-center">
          <p className="font-bold text-white text-sm">{match.homeTeam.name}</p>
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">vs</p>
          <p className="font-bold text-white text-sm">{match.awayTeam.name}</p>
        </div>
        {available.length > 0 ? (
          <span className="text-[10px] text-green-400/60 font-bold">{available.length} disp.</span>
        ) : (
          <span className="text-[10px] text-yellow-400/40 font-bold">Sin disp.</span>
        )}
      </div>

      {/* Selectores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5">
        <OfficialSelect
          label="🟠 Árbitro Principal" value={assignment.ref1}
          onChange={(v) => onChange({ ref1: v })} available={available}
          roleKey="mainRef" placeholder="— Sin asignar —"
        />
        <OfficialSelect
          label="🔵 Árbitro Auxiliar" value={assignment.ref2}
          onChange={(v) => onChange({ ref2: v })} available={available}
          roleKey="assistRef" placeholder="— Sin asignar —"
        />
        <OfficialSelect
          label="📋 Anotador / Mesa" value={assignment.scorer}
          onChange={(v) => onChange({ scorer: v })} available={available}
          roleKey="scorer" placeholder="— Sin asignar —"
        />
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function OfficialSchedulePage() {
  const qc = useQueryClient();
  const [jornadaInput, setJornadaInput] = useState("");
  const [jornada,      setJornada]      = useState<number | null>(null);
  const [assignments,  setAssignments]  = useState<Record<string, Assignment>>({});
  const [waText,       setWaText]       = useState("");
  const [copied,       setCopied]       = useState(false);

  const { data: matches = [], isLoading } = useQuery<MatchItem[]>({
    queryKey: ["/api/matches", jornada],
    queryFn:  () => apiGet<MatchItem[]>(`/api/matches?jornada=${jornada}`),
    enabled:  jornada !== null,
  });

  // Inicializar asignaciones cuando llegan los partidos
  useEffect(() => {
    if (matches.length === 0) return;
    setAssignments((prev) => {
      const next = { ...prev };
      matches.forEach((m) => {
        if (!next[m.id]) {
          next[m.id] = {
            ref1:   m.officials?.ref1   ?? "",
            ref2:   m.officials?.ref2   ?? "",
            scorer: m.officials?.scorer ?? "",
          };
        }
      });
      return next;
    });
  }, [matches]);

  // Guardar todos los árbitros asignados
  const saveMutation = useMutation({
    mutationFn: () =>
      Promise.all(
        matches.map((m) =>
          apiPut(`/api/matches/${m.id}/officials`, assignments[m.id] ?? { ref1: "", ref2: "", scorer: "" })
        )
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/matches", jornada] });
      sileo.success({ title: "Rol guardado", description: "Asignaciones actualizadas correctamente" });
    },
    onError: (e) => sileo.error({ title: "Error al guardar", description: (e as Error).message }),
  });

  const handleLoad = () => {
    const n = parseInt(jornadaInput);
    if (isNaN(n) || n < 1) { sileo.error({ title: "Ingresa un número de jornada válido" }); return; }
    setAssignments({});
    setWaText("");
    setJornada(n);
  };

  // Generar texto para WhatsApp
  const generateWA = () => {
    if (!jornada || matches.length === 0) return;

    const firstDate = matches[0]?.scheduledAt ?? "";
    const dateStr   = firstDate ? fmtDate(firstDate) : "";

    // Agrupar por día
    const byDay: Record<string, MatchItem[]> = {};
    matches.forEach((m) => {
      const key = fmtDate(m.scheduledAt);
      (byDay[key] ??= []).push(m);
    });

    let text = `🏀 *ROL DE ÁRBITROS — JORNADA ${jornada}*\n`;
    if (dateStr) text += `📅 ${dateStr}\n`;
    text += "\n";

    Object.entries(byDay).forEach(([day, dayMatches]) => {
      if (Object.keys(byDay).length > 1) text += `📅 *${day}*\n`;
      dayMatches.forEach((m) => {
        const a = assignments[m.id] ?? { ref1: "", ref2: "", scorer: "" };
        text += `⏰ *${fmtTime(m.scheduledAt)}* — ${m.homeTeam.name} vs ${m.awayTeam.name}\n`;
        text += `🟠 Principal: ${a.ref1 || "Por definir"}\n`;
        text += `🔵 Auxiliar: ${a.ref2 || "Por definir"}\n`;
        text += `📋 Anotador: ${a.scorer || "Por definir"}\n`;
        text += "\n";
      });
    });

    text += "✅ Favor de confirmar asistencia";
    setWaText(text);
  };

  const copyText = async () => {
    if (!waText) return;
    await navigator.clipboard.writeText(waText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    sileo.success({ title: "Copiado al portapapeles" });
  };

  const openWhatsApp = () => {
    if (!waText) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, "_blank");
  };

  const hasAssignments = matches.some((m) => {
    const a = assignments[m.id];
    return a?.ref1 || a?.ref2 || a?.scorer;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">

      {/* Header */}
      <div className="mb-8">
        <SectionTitle whiteText="Rol de" orangeText="Árbitros" className="mb-1" />
        <p className="text-white/30 text-sm">Asigna árbitros por jornada y genera el mensaje para el grupo</p>
      </div>

      {/* Selector de jornada */}
      <div className="glass-panel rounded-2xl p-4 mb-6 flex gap-3 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-widest text-white/40">Jornada</label>
          <Input
            type="number" min={1} placeholder="Ej: 5"
            value={jornadaInput}
            onChange={(e) => setJornadaInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleLoad(); }}
            className="glass-input h-11"
          />
        </div>
        <Button onClick={handleLoad}
          className="h-11 px-6 rounded-xl bg-brand-orange hover:bg-brand-orange/85 text-white font-bold glow-orange">
          Ver <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Partidos */}
      {jornada !== null && (
        isLoading ? (
          <div className="text-center text-white/30 py-12">Cargando partidos...</div>
        ) : matches.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center">
            <p className="text-white/30">No hay partidos en la Jornada {jornada}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {matches.map((m) => (
                <MatchRow
                  key={m.id}
                  match={m}
                  jornada={jornada}
                  assignment={assignments[m.id] ?? { ref1: "", ref2: "", scorer: "" }}
                  onChange={(patch) =>
                    setAssignments((prev) => ({
                      ...prev,
                      [m.id]: { ...(prev[m.id] ?? { ref1: "", ref2: "", scorer: "" }), ...patch },
                    }))
                  }
                />
              ))}
            </div>

            {/* Botón guardar */}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full h-12 rounded-xl bg-white/8 border border-white/15 hover:bg-white/12 text-white font-bold mb-8 disabled:opacity-40"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Guardando…" : "Guardar asignaciones"}
            </Button>

            {/* Sección WhatsApp */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-white">Mensaje para WhatsApp</p>
                <Button
                  onClick={generateWA}
                  className="h-9 px-4 rounded-xl bg-brand-orange hover:bg-brand-orange/85 text-white font-bold text-sm glow-orange"
                >
                  Generar mensaje
                </Button>
              </div>

              {waText ? (
                <>
                  {/* Preview */}
                  <pre className="whitespace-pre-wrap text-sm text-white/70 glass-panel rounded-xl p-4 font-sans leading-relaxed max-h-72 overflow-y-auto">
                    {waText}
                  </pre>

                  {/* Acciones */}
                  <div className="flex gap-3">
                    <Button
                      onClick={copyText}
                      className="flex-1 h-11 rounded-xl bg-white/8 border border-white/15 hover:bg-white/12 text-white font-bold"
                    >
                      {copied ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copied ? "¡Copiado!" : "Copiar texto"}
                    </Button>
                    <Button
                      onClick={openWhatsApp}
                      className="flex-1 h-11 rounded-xl font-bold text-white"
                      style={{ background: "#25D366" }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir en WhatsApp
                    </Button>
                  </div>

                  <p className="text-[11px] text-white/20 text-center">
                    "Abrir en WhatsApp" abre la app — selecciona tu grupo y envía
                  </p>
                </>
              ) : (
                <p className="text-white/30 text-sm text-center py-4">
                  {hasAssignments
                    ? 'Haz clic en "Generar mensaje" para crear el texto'
                    : "Primero asigna los árbitros a cada partido"}
                </p>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
