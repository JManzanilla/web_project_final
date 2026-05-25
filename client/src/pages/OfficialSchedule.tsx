import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { sileo } from "sileo";
import { Copy, ExternalLink, Check, Save, Plus, X, ChevronDown, ChevronUp } from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface OfficialRoles { mainRef: boolean; assistRef: boolean; scorer: boolean }
interface Official { id: string; name: string; lastName: string; roles: OfficialRoles; active: boolean }
interface Slot { id: string; officialId: string; jornada: number; dayOfWeek: number; startTime: string; endTime: string }
interface MatchItem {
  id: string; jornada: number; scheduledAt: string; status: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  officials: { ref1: string | null; ref2: string | null; scorer: string | null } | null;
}
interface Assignment { ref1: string; ref2: string; scorer: string }

const DAYS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const DAYS_FULL = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

const fmtTime = (iso: string) => iso.length >= 16 ? iso.substring(11,16) : "—";
const fmtDateFull = (iso: string) => { const d = new Date(iso); return `${DAYS_FULL[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`; };
const fmtDateShort = (iso: string) => { const d = new Date(iso); return `${DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`; };

// ── Fila de disponibilidad por árbitro ────────────────────────────────────────
function AvailRow({
  official, slots, jornada, onAdd, onDelete,
}: {
  official: Official;
  slots:    Slot[];
  jornada:  number;
  onAdd:    (data: { dayOfWeek: number; startTime: string; endTime: string }) => void;
  onDelete: (slotId: string) => void;
}) {
  const [open,      setOpen]      = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(6);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime,   setEndTime]   = useState("14:00");

  const mySlots = slots.filter((s) => s.officialId === official.id);

  const roleBadge = [
    official.roles.mainRef   && { label: "Principal", cls: "text-brand-orange/80" },
    official.roles.assistRef && { label: "Auxiliar",  cls: "text-sky-400/80"      },
    official.roles.scorer    && { label: "Anotador",  cls: "text-purple-400/80"   },
  ].filter(Boolean) as { label: string; cls: string }[];

  return (
    <div className="border-b border-white/5 last:border-0">
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {/* Nombre + roles + chips (columna izquierda) */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white truncate">{official.name} {official.lastName}</p>
          <div className="flex gap-2 flex-wrap">
            {roleBadge.map((r) => (
              <span key={r.label} className={`text-[10px] font-bold ${r.cls}`}>{r.label}</span>
            ))}
          </div>
          {mySlots.length === 0 ? (
            <span className="text-[11px] text-white/20 mt-0.5 block">Sin disponibilidad</span>
          ) : (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {mySlots.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange/70">
                  {DAYS[s.dayOfWeek]} {s.startTime}–{s.endTime}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                    className="text-brand-orange/50 hover:text-red-400 transition-colors ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {open ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0 mt-1" />}
      </div>

      {/* Panel expandible */}
      {open && (
        <div className="px-4 pb-4 space-y-3 bg-white/2">
          {/* Slots existentes */}
          {mySlots.length > 0 && (
            <div className="space-y-1.5 pt-2">
              {mySlots.map((s) => (
                <div key={s.id} className="flex items-center justify-between glass-panel px-3 py-2 rounded-xl">
                  <span className="text-sm text-white/70">
                    <span className="font-bold text-white/50 mr-2">{DAYS_FULL[s.dayOfWeek]}</span>
                    {s.startTime} – {s.endTime}
                  </span>
                  <button onClick={() => onDelete(s.id)} className="text-red-400/50 hover:text-red-400 transition-colors p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulario agregar */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-white/30 uppercase font-bold">Día</label>
                <select value={dayOfWeek} onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                  className="glass-input h-9 px-2 text-sm bg-transparent text-white w-full appearance-none">
                  {DAYS_FULL.map((d, i) => <option key={i} value={i} className="bg-gray-900">{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/30 uppercase font-bold">Desde</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="glass-input h-9 px-2 text-sm text-white bg-transparent w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/30 uppercase font-bold">Hasta</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="glass-input h-9 px-2 text-sm text-white bg-transparent w-full" />
              </div>
            </div>
            <button
              onClick={() => { onAdd({ dayOfWeek, startTime, endTime }); }}
              className="w-full h-9 rounded-xl bg-brand-orange hover:bg-brand-orange/85 text-white text-sm font-bold flex items-center justify-center gap-1.5 glow-orange"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Select de árbitro para asignación ─────────────────────────────────────────
function OfficialSelect({
  label, value, onChange, candidates, roleKey, exclude,
}: {
  label: string; value: string; onChange: (v: string) => void;
  candidates: Official[]; roleKey: keyof OfficialRoles; exclude: string[];
}) {
  const filtered = candidates.filter((o) => {
    const full = `${o.name} ${o.lastName}`;
    return o.roles[roleKey] && !exclude.includes(full);
  });
  const isManual = value !== "" && !filtered.some((o) => `${o.name} ${o.lastName}` === value);

  return (
    <div className="flex-1 min-w-0 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</p>
      {filtered.length > 0 ? (
        <>
          <select value={isManual ? "__m__" : value}
            onChange={(e) => onChange(e.target.value === "__m__" ? "" : e.target.value)}
            className="w-full glass-input h-9 px-3 text-sm bg-transparent appearance-none cursor-pointer text-white">
            <option value="" className="bg-gray-900 text-white/40">— Sin asignar —</option>
            {filtered.map((o) => (
              <option key={o.id} value={`${o.name} ${o.lastName}`} className="bg-gray-900 text-white">
                {o.name} {o.lastName}
              </option>
            ))}
            <option value="__m__" className="bg-gray-900 text-white/40">Otro…</option>
          </select>
          {isManual && (
            <Input placeholder="Nombre Apellido" value={value} onChange={(e) => onChange(e.target.value)}
              className="glass-input h-9 text-sm mt-1" autoFocus />
          )}
        </>
      ) : (
        <Input placeholder="Escribir nombre" value={value} onChange={(e) => onChange(e.target.value)}
          className="glass-input h-9 text-sm" />
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function OfficialSchedulePage() {
  const qc = useQueryClient();
  const [jornada,     setJornada]     = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [waText,      setWaText]      = useState("");
  const [copied,      setCopied]      = useState(false);

  // Todos los partidos → extraer jornadas disponibles
  const { data: allMatches = [] } = useQuery<MatchItem[]>({
    queryKey: ["/api/matches/all"],
    queryFn:  () => apiGet<MatchItem[]>("/api/matches"),
  });

  const jornadas = useMemo(() => {
    const nums = [...new Set(allMatches.map((m) => m.jornada))].sort((a, b) => a - b);
    return nums;
  }, [allMatches]);

  // Auto-seleccionar la próxima jornada activa
  useEffect(() => {
    if (jornada !== null || jornadas.length === 0) return;
    const next = allMatches
      .filter((m) => m.status === "upcoming" || m.status === "live")
      .map((m) => m.jornada)
      .sort((a, b) => a - b)[0];
    setJornada(next ?? jornadas[0]);
  }, [jornadas]);

  // Partidos de la jornada seleccionada
  const { data: matches = [], isLoading: loadingMatches } = useQuery<MatchItem[]>({
    queryKey: ["/api/matches", jornada],
    queryFn:  () => apiGet<MatchItem[]>(`/api/matches?jornada=${jornada}`),
    enabled:  jornada !== null,
  });

  // Todos los árbitros activos
  const { data: officials = [] } = useQuery<Official[]>({
    queryKey: ["/api/officials"],
    queryFn:  () => apiGet<Official[]>("/api/officials"),
  });
  const activeOfficials = officials.filter((o) => o.active);

  // Slots de disponibilidad para esta jornada (todos los árbitros)
  const { data: slots = [], isLoading: loadingSlots } = useQuery<Slot[]>({
    queryKey: ["/api/officials/availability", jornada],
    queryFn:  () => apiGet<Slot[]>(`/api/officials/availability?jornada=${jornada}`),
    enabled:  jornada !== null,
  });

  // Inicializar asignaciones cuando cambian los partidos
  useEffect(() => {
    if (matches.length === 0) return;
    setAssignments((prev) => {
      const next = { ...prev };
      matches.forEach((m) => {
        if (!next[m.id]) {
          next[m.id] = { ref1: m.officials?.ref1 ?? "", ref2: m.officials?.ref2 ?? "", scorer: m.officials?.scorer ?? "" };
        }
      });
      return next;
    });
    setWaText("");
  }, [matches]);

  // ── Mutaciones disponibilidad ────────────────────────────────────────────
  const addSlotMutation = useMutation({
    mutationFn: ({ officialId, data }: { officialId: string; data: { jornada: number; dayOfWeek: number; startTime: string; endTime: string } }) =>
      apiPost<Slot>(`/api/officials/${officialId}/availability`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/officials/availability", jornada] }),
    onError:   (e) => sileo.error({ title: "Error al agregar", description: (e as Error).message }),
  });

  const deleteSlotMutation = useMutation({
    mutationFn: ({ officialId, slotId }: { officialId: string; slotId: string }) =>
      apiDelete(`/api/officials/${officialId}/availability/${slotId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/officials/availability", jornada] }),
    onError:   (e) => sileo.error({ title: "Error al eliminar", description: (e as Error).message }),
  });

  // ── Guardar asignaciones ────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () =>
      Promise.all(matches.map((m) => apiPut(`/api/matches/${m.id}/officials`, assignments[m.id] ?? { ref1: "", ref2: "", scorer: "" }))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/matches", jornada] }); sileo.success({ title: "Rol guardado correctamente" }); },
    onError:   (e) => sileo.error({ title: "Error al guardar", description: (e as Error).message }),
  });

  // ── Candidatos disponibles por match (filtrado por hora) ─────────────────
  function candidatesFor(match: MatchItem): Official[] {
    const d    = new Date(match.scheduledAt);
    const day  = d.getDay();
    const time = fmtTime(match.scheduledAt);
    const ids  = slots
      .filter((s) => s.dayOfWeek === day && s.startTime <= time && s.endTime > time)
      .map((s) => s.officialId);
    return activeOfficials.filter((o) => ids.includes(o.id));
  }

  // ── Generar WhatsApp ─────────────────────────────────────────────────────
  const generateWA = () => {
    if (!jornada || matches.length === 0) return;

    const byDay: Record<string, MatchItem[]> = {};
    matches.forEach((m) => { (byDay[fmtDateFull(m.scheduledAt)] ??= []).push(m); });

    let text = `🏀 *ROL DE ÁRBITROS — JORNADA ${jornada}*\n\n`;
    Object.entries(byDay).forEach(([day, ms]) => {
      text += `📅 *${day}*\n`;
      ms.forEach((m) => {
        const a = assignments[m.id] ?? { ref1: "", ref2: "", scorer: "" };
        text += `\n⏰ *${fmtTime(m.scheduledAt)}* — ${m.homeTeam.name} vs ${m.awayTeam.name}\n`;
        text += `🟠 Principal: ${a.ref1 || "Por definir"}\n`;
        text += `🔵 Auxiliar:  ${a.ref2 || "Por definir"}\n`;
        text += `📋 Anotador:  ${a.scorer || "Por definir"}\n`;
      });
      text += "\n";
    });
    text += "✅ Favor de confirmar asistencia";
    setWaText(text);
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(waText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    sileo.success({ title: "Copiado al portapapeles" });
  };

  const openWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, "_blank");

  if (jornadas.length === 0 && !loadingMatches) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-white/30">No hay partidos en el sistema aún.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">

      {/* Header */}
      <div className="mb-6">
        <SectionTitle whiteText="Rol de" orangeText="Árbitros" className="mb-1" />
        <p className="text-white/30 text-sm">Captura disponibilidad, asigna y envía el rol al grupo</p>
      </div>

      {/* Selector de jornada */}
      <div className="glass-panel rounded-2xl px-4 py-3 mb-6 flex items-center gap-4">
        <span className="text-xs font-bold uppercase tracking-widest text-white/40 flex-shrink-0">Jornada</span>
        <div className="flex gap-2 flex-wrap">
          {jornadas.map((j) => (
            <button key={j} onClick={() => { setJornada(j); setWaText(""); setAssignments({}); }}
              className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${
                jornada === j
                  ? "bg-brand-orange border-brand-orange text-white glow-orange"
                  : "bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white"
              }`}>
              {j}
            </button>
          ))}
        </div>
      </div>

      {jornada !== null && (
        <>
          {/* ── SECCIÓN 1: Disponibilidad ─────────────────────────────────── */}
          <div className="glass-panel rounded-2xl overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
              <p className="font-bold text-white text-sm">Disponibilidad — Jornada {jornada}</p>
              <p className="text-[11px] text-white/30">Toca cada árbitro para editar</p>
            </div>

            {loadingSlots ? (
              <p className="text-center text-white/30 text-sm py-6">Cargando...</p>
            ) : activeOfficials.length === 0 ? (
              <p className="text-center text-white/20 text-sm py-6">Sin árbitros registrados</p>
            ) : (
              <div>
                {activeOfficials.map((o) => (
                  <AvailRow
                    key={o.id}
                    official={o}
                    slots={slots}
                    jornada={jornada}
                    onAdd={(data) => addSlotMutation.mutate({ officialId: o.id, data: { jornada, ...data } })}
                    onDelete={(slotId) => deleteSlotMutation.mutate({ officialId: o.id, slotId })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── SECCIÓN 2: Asignación de partidos ────────────────────────── */}
          {loadingMatches ? (
            <div className="text-center text-white/30 py-8">Cargando partidos...</div>
          ) : matches.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center mb-6">
              <p className="text-white/30">No hay partidos en la Jornada {jornada}</p>
            </div>
          ) : (
            <>
              <div className="glass-panel rounded-2xl overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-white/8">
                  <p className="font-bold text-white text-sm">Partidos — Jornada {jornada}</p>
                </div>
                <div className="divide-y divide-white/5">
                  {matches.map((m) => {
                    const candidates = candidatesFor(m);
                    return (
                      <div key={m.id} className="p-4 space-y-3">
                        {/* Info partido */}
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[52px]">
                            <p className="text-[10px] text-white/30 font-bold">{fmtDateShort(m.scheduledAt)}</p>
                            <p className="text-lg font-black text-brand-orange">{fmtTime(m.scheduledAt)}</p>
                          </div>
                          <div className="flex-1 text-center">
                            <p className="font-bold text-white text-sm">{m.homeTeam.name} <span className="text-white/30 font-normal">vs</span> {m.awayTeam.name}</p>
                          </div>
                          <span className={`text-[10px] font-bold ${candidates.length > 0 ? "text-green-400/60" : "text-yellow-400/40"}`}>
                            {candidates.length > 0 ? `${candidates.length} disp.` : "Sin disp."}
                          </span>
                        </div>
                        {/* Selectores */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {(() => {
                            const a = assignments[m.id] ?? { ref1: "", ref2: "", scorer: "" };
                            const set = (patch: Partial<Assignment>) =>
                              setAssignments((p) => ({ ...p, [m.id]: { ...(p[m.id] ?? { ref1:"",ref2:"",scorer:"" }), ...patch } }));
                            return (
                              <>
                                <OfficialSelect label="🟠 Principal" value={a.ref1}
                                  onChange={(v) => set({ ref1: v })} candidates={candidates} roleKey="mainRef"
                                  exclude={[a.ref2, a.scorer].filter(Boolean)} />
                                <OfficialSelect label="🔵 Auxiliar" value={a.ref2}
                                  onChange={(v) => set({ ref2: v })} candidates={candidates} roleKey="assistRef"
                                  exclude={[a.ref1, a.scorer].filter(Boolean)} />
                                <OfficialSelect label="📋 Anotador" value={a.scorer}
                                  onChange={(v) => set({ scorer: v })} candidates={candidates} roleKey="scorer"
                                  exclude={[a.ref1, a.ref2].filter(Boolean)} />
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                className="w-full h-12 rounded-xl bg-white/8 border border-white/15 hover:bg-white/12 text-white font-bold mb-6 disabled:opacity-40">
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Guardando…" : "Guardar asignaciones"}
              </Button>

              {/* ── SECCIÓN 3: WhatsApp ──────────────────────────────────── */}
              <div className="glass-panel rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white">Mensaje para el grupo</p>
                  <Button onClick={generateWA}
                    className="h-9 px-4 rounded-xl bg-brand-orange hover:bg-brand-orange/85 text-white font-bold text-sm glow-orange">
                    Generar mensaje
                  </Button>
                </div>

                {waText ? (
                  <>
                    <pre className="whitespace-pre-wrap text-sm text-white/70 glass-panel rounded-xl p-4 font-sans leading-relaxed max-h-64 overflow-y-auto">
                      {waText}
                    </pre>
                    <div className="flex gap-3">
                      <Button onClick={copyText}
                        className="flex-1 h-11 rounded-xl bg-white/8 border border-white/15 hover:bg-white/12 text-white font-bold">
                        {copied ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied ? "¡Copiado!" : "Copiar texto"}
                      </Button>
                      <Button onClick={openWhatsApp}
                        className="flex-1 h-11 rounded-xl font-bold text-white" style={{ background: "#25D366" }}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir en WhatsApp
                      </Button>
                    </div>
                    <p className="text-[11px] text-white/20 text-center">
                      WhatsApp se abre con el mensaje listo — selecciona el grupo y envía
                    </p>
                  </>
                ) : (
                  <p className="text-white/25 text-sm text-center py-3">
                    Asigna los árbitros y genera el mensaje
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
