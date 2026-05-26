import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from "@/lib/apiClient";
import { sileo } from "sileo";
import { Copy, ExternalLink, Check, Save, Plus, X, ChevronDown, ChevronUp, UserPlus, Camera, Trash2, Pencil } from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface OfficialRoles { mainRef: boolean; assistRef: boolean; scorer: boolean }
interface Official { id: string; name: string; lastName: string; photoUrl?: string | null; roles: OfficialRoles; active: boolean }

// ── Gestión de árbitros ───────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { key: "mainRef"   as const, label: "Árbitro Principal", color: "bg-brand-orange/15 border-brand-orange/40 text-brand-orange" },
  { key: "assistRef" as const, label: "Árbitro Auxiliar",  color: "bg-sky-500/10 border-sky-500/30 text-sky-400"               },
  { key: "scorer"    as const, label: "Anotador / Mesa",   color: "bg-purple-500/10 border-purple-500/30 text-purple-400"       },
];
const EMPTY_ROLES: OfficialRoles = { mainRef: false, assistRef: false, scorer: false };
interface OfficialForm { name: string; lastName: string; roles: OfficialRoles; active: boolean }
const EMPTY_FORM: OfficialForm = { name: "", lastName: "", roles: EMPTY_ROLES, active: true };

function OfficialAvatar({ official, size = "sm" }: { official: Official; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-12 h-12 text-base" : "w-9 h-9 text-sm";
  if (official.photoUrl)
    return <img src={official.photoUrl} alt="" className={`${sz} rounded-full object-cover border border-white/10 flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-white/8 border border-white/10 flex items-center justify-center font-bold text-white/50 flex-shrink-0`}>
      {official.name.charAt(0)}{official.lastName.charAt(0)}
    </div>
  );
}

function OfficialFormModal({ mode, form, official, isPending, onClose, onChange, onSubmit, onPhotoChange, photoPreview }: {
  mode: "create" | "edit"; form: OfficialForm; official: Official | null;
  isPending: boolean; onClose: () => void;
  onChange: (p: Partial<OfficialForm>) => void; onSubmit: () => void;
  onPhotoChange: (f: File) => void; photoPreview: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isValid = form.name.trim().length > 0 && form.lastName.trim().length > 0 &&
                  (form.roles.mainRef || form.roles.assistRef || form.roles.scorer);
  const currentPhoto = photoPreview ?? official?.photoUrl ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-6 pb-28 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg glass-panel p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-brand-orange" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight">
              {mode === "edit" ? "Editar Árbitro" : "Nuevo Árbitro"}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Foto */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {currentPhoto
                ? <img src={currentPhoto} alt="" className="w-16 h-16 rounded-full object-cover border border-white/10" />
                : <div className="w-16 h-16 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-xl font-bold text-white/30">{(form.name.charAt(0)||"?")}{form.lastName.charAt(0)}</div>
              }
              <button type="button" onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center">
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-white/70">Foto del árbitro</p>
              <p className="text-[11px] text-white/30">JPG, PNG o WEBP · máx 5 MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhotoChange(f); }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Nombre</label>
              <Input value={form.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Ej: Rafael" className="glass-input h-11" autoFocus={mode === "create"} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Apellido</label>
              <Input value={form.lastName} onChange={(e) => onChange({ lastName: e.target.value })} placeholder="Ej: Mendoza" className="glass-input h-11" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Puede desempeñarse como <span className="text-red-400/60">*</span></label>
            <div className="flex flex-col gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button key={r.key} type="button"
                  onClick={() => onChange({ roles: { ...form.roles, [r.key]: !form.roles[r.key] } })}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left ${form.roles[r.key] ? r.color : "bg-white/4 border-white/8 text-white/40 hover:bg-white/8"}`}>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${form.roles[r.key] ? "bg-current border-current" : "border-white/20"}`}>
                    {form.roles[r.key] && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "edit" && (
            <div className="flex items-center justify-between glass-panel px-4 py-3 rounded-2xl">
              <span className="text-sm font-semibold text-white/70">Estado activo</span>
              <button type="button" onClick={() => onChange({ active: !form.active })}
                className={`w-11 h-6 rounded-full border transition-all relative ${form.active ? "bg-brand-orange border-brand-orange" : "bg-white/8 border-white/15"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.active ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-7">
          <Button variant="ghost" onClick={onClose} className="flex-1 rounded-full h-11 border border-white/10 hover:bg-white/8">Cancelar</Button>
          <Button onClick={onSubmit} disabled={!isValid || isPending}
            className="flex-1 rounded-full h-11 bg-brand-orange hover:bg-brand-orange/85 text-white font-bold glow-orange disabled:opacity-40">
            {isPending ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Agregar árbitro"}
          </Button>
        </div>
      </div>
    </div>
  );
}
interface Slot { id: string; officialId: string; jornada: number; dayOfWeek: number; startTime: string; endTime: string }
interface MatchItem {
  id: string; jornada: number; scheduledAt: string; status: string; phase: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  officials: { ref1: string | null; ref2: string | null; scorer: string | null; extRef1?: string | null; extRef2?: string | null; extScorer?: string | null } | null;
}
interface Assignment { ref1: string; ref2: string; scorer: string; extRef1: string; extRef2: string; extScorer: string; isExternal: boolean }

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

// ── Fila de oficial en la lista ───────────────────────────────────────────────
function OfficialRow({ official: o, onEdit, onDelete }: { official: Official; onEdit: () => void; onDelete: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const roleBadges = ROLE_OPTIONS.filter(r => o.roles[r.key]);
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border animate-in fade-in duration-300 ${o.active ? "bg-white/3 border-white/8" : "bg-white/1 border-white/4 opacity-50"}`}>
      <OfficialAvatar official={o} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-white truncate">{o.name} {o.lastName}</p>
        <div className="flex gap-1 flex-wrap">
          {roleBadges.map(r => (
            <span key={r.key} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${r.color}`}>{r.label}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-all">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {confirmDel ? (
          <>
            <button onClick={() => { onDelete(); setConfirmDel(false); }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/15 border border-red-500/30 text-red-400">
              Confirmar
            </button>
            <button onClick={() => setConfirmDel(false)} className="px-2 py-1 rounded-lg text-[10px] text-white/30 hover:bg-white/8">No</button>
          </>
        ) : (
          <button onClick={() => setConfirmDel(true)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/8 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
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

  // ── Estado gestión de árbitros ───────────────────────────────────────────
  const [showOfficials, setShowOfficials] = useState(false);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editTarget,    setEditTarget]    = useState<Official | null>(null);
  const [officialForm,  setOfficialForm]  = useState<OfficialForm>(EMPTY_FORM);
  const [pendingPhoto,  setPendingPhoto]  = useState<File | null>(null);
  const [photoPreview,  setPhotoPreview]  = useState<string | null>(null);

  const openCreate = () => { setEditTarget(null); setOfficialForm(EMPTY_FORM); setPendingPhoto(null); setPhotoPreview(null); setModalOpen(true); };
  const openEdit   = (o: Official) => { setEditTarget(o); setOfficialForm({ name: o.name, lastName: o.lastName, roles: o.roles, active: o.active }); setPendingPhoto(null); setPhotoPreview(null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const uploadPhoto = async (id: string) => {
    if (!pendingPhoto) return;
    const fd = new FormData(); fd.append("photo", pendingPhoto);
    await apiUpload<{ photoUrl: string }>(`/api/officials/${id}/photo`, fd);
  };

  const createOfficialMutation = useMutation({
    mutationFn: async (data: OfficialForm) => {
      const created = await apiPost<Official>("/api/officials", { name: data.name.trim(), lastName: data.lastName.trim(), roles: data.roles });
      await uploadPhoto(created.id);
      return created;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/officials"] }); closeModal(); sileo.success({ title: "Árbitro registrado" }); },
    onError:   (e) => sileo.error({ title: "Error al registrar", description: (e as Error).message }),
  });

  const editOfficialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: OfficialForm }) => {
      const updated = await apiPut<Official>(`/api/officials/${id}`, { name: data.name.trim(), lastName: data.lastName.trim(), roles: data.roles, active: data.active });
      await uploadPhoto(id);
      return updated;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/officials"] }); closeModal(); sileo.success({ title: "Árbitro actualizado" }); },
    onError:   (e) => sileo.error({ title: "Error al editar", description: (e as Error).message }),
  });

  const deleteOfficialMutation = useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/api/officials/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["/api/officials"] }); sileo.success({ title: "Árbitro eliminado" }); },
    onError:    (e) => sileo.error({ title: "Error al eliminar", description: (e as Error).message }),
  });

  const handleOfficialSubmit = () => {
    if (editTarget) editOfficialMutation.mutate({ id: editTarget.id, data: officialForm });
    else            createOfficialMutation.mutate(officialForm);
  };

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
          const isExternal = !!(m.officials?.extRef1 || m.officials?.extRef2 || m.officials?.extScorer);
          next[m.id] = {
            ref1: m.officials?.ref1 ?? "", ref2: m.officials?.ref2 ?? "", scorer: m.officials?.scorer ?? "",
            extRef1: m.officials?.extRef1 ?? "", extRef2: m.officials?.extRef2 ?? "", extScorer: m.officials?.extScorer ?? "",
            isExternal,
          };
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
      Promise.all(matches.map((m) => {
        const a = assignments[m.id] ?? { ref1: "", ref2: "", scorer: "", extRef1: "", extRef2: "", extScorer: "", isExternal: false };
        if (a.isExternal) {
          return apiPut(`/api/matches/${m.id}/officials`, { ref1: null, ref2: null, scorer: null, extRef1: a.extRef1 || null, extRef2: a.extRef2 || null, extScorer: a.extScorer || null });
        }
        return apiPut(`/api/matches/${m.id}/officials`, { ref1: a.ref1 || null, ref2: a.ref2 || null, scorer: a.scorer || null, extRef1: null, extRef2: null, extScorer: null });
      })),
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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <SectionTitle whiteText="Rol de" orangeText="Árbitros" className="mb-1" />
          <p className="text-white/30 text-sm">Captura disponibilidad, asigna y envía el rol al grupo</p>
        </div>
        <Button onClick={openCreate}
          className="flex-shrink-0 rounded-full bg-brand-orange hover:bg-brand-orange/85 text-white font-bold px-4 h-10 glow-orange text-sm">
          <UserPlus className="w-4 h-4 mr-1.5" /> Nuevo árbitro
        </Button>
      </div>

      {/* ── Lista de árbitros (colapsable) ───────────────────────────────────── */}
      <div className="glass-panel rounded-2xl overflow-hidden mb-6">
        <button onClick={() => setShowOfficials(!showOfficials)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">Árbitros registrados</span>
            <span className="text-[11px] text-white/40 font-semibold">
              {activeOfficials.length} activo{activeOfficials.length !== 1 ? "s" : ""}
              {officials.filter(o => !o.active).length > 0 && ` · ${officials.filter(o => !o.active).length} inactivo${officials.filter(o => !o.active).length !== 1 ? "s" : ""}`}
            </span>
          </div>
          {showOfficials ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </button>

        {showOfficials && (
          <div className="border-t border-white/8 p-3">
            {officials.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">Sin árbitros registrados aún</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {officials.map((o) => (
                  <OfficialRow key={o.id} official={o}
                    onEdit={() => openEdit(o)}
                    onDelete={() => deleteOfficialMutation.mutate(o.id)} />
                ))}
              </div>
            )}
          </div>
        )}
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
                        {/* Toggle local/externo para playoffs */}
                        {m.phase !== "regular" && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/30 uppercase font-bold">Árbitros:</span>
                            {(["Locales", "Externos"] as const).map((mode) => {
                              const isExt = mode === "Externos";
                              const active = (assignments[m.id]?.isExternal ?? false) === isExt;
                              return (
                                <button key={mode} onClick={() => setAssignments((p) => ({ ...p, [m.id]: { ...(p[m.id] ?? { ref1:"",ref2:"",scorer:"",extRef1:"",extRef2:"",extScorer:"" }), isExternal: isExt } }))}
                                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${active ? "bg-brand-orange text-white border-brand-orange" : "bg-white/5 text-white/40 border-white/10 hover:border-white/25"}`}>
                                  {mode}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Selectores */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {(() => {
                            const a = assignments[m.id] ?? { ref1: "", ref2: "", scorer: "", extRef1: "", extRef2: "", extScorer: "", isExternal: false };
                            const set = (patch: Partial<Assignment>) =>
                              setAssignments((p) => ({ ...p, [m.id]: { ...(p[m.id] ?? { ref1:"",ref2:"",scorer:"",extRef1:"",extRef2:"",extScorer:"",isExternal:false }), ...patch } }));

                            if (a.isExternal) {
                              return (
                                <>
                                  {[
                                    { label: "🟠 Principal", key: "extRef1" as const },
                                    { label: "🔵 Auxiliar",  key: "extRef2" as const },
                                    { label: "📋 Anotador",  key: "extScorer" as const },
                                  ].map(({ label, key }) => (
                                    <div key={key} className="flex-1 min-w-0 space-y-1">
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</p>
                                      <Input placeholder="Nombre Apellido" value={a[key]} onChange={(e) => set({ [key]: e.target.value })}
                                        className="glass-input h-9 text-sm" />
                                    </div>
                                  ))}
                                </>
                              );
                            }

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

      {/* Modal árbitros */}
      {modalOpen && (
        <OfficialFormModal
          mode={editTarget ? "edit" : "create"}
          form={officialForm} official={editTarget}
          isPending={createOfficialMutation.isPending || editOfficialMutation.isPending}
          onClose={closeModal}
          onChange={(p) => setOfficialForm((prev) => ({ ...prev, ...p }))}
          onSubmit={handleOfficialSubmit}
          onPhotoChange={(f) => { setPendingPhoto(f); setPhotoPreview(URL.createObjectURL(f)); }}
          photoPreview={photoPreview}
        />
      )}
    </div>
  );
}
