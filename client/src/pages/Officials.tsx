import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { sileo } from "sileo";
import { X, UserPlus, Camera, Trash2, Pencil, CalendarDays, Plus } from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface OfficialRoles { mainRef: boolean; assistRef: boolean; scorer: boolean }

interface Official {
  id:        string;
  name:      string;
  lastName:  string;
  photoUrl:  string | null;
  roles:     OfficialRoles;
  active:    boolean;
}

interface AvailabilitySlot {
  id:        string;
  officialId: string;
  jornada:   number;
  dayOfWeek: number;
  startTime: string;
  endTime:   string;
}

const DAYS = [
  { value: 0, label: "Domingo"   },
  { value: 1, label: "Lunes"     },
  { value: 2, label: "Martes"    },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves"    },
  { value: 5, label: "Viernes"   },
  { value: 6, label: "Sábado"    },
];

const ROLE_OPTIONS = [
  { key: "mainRef"   as const, label: "Árbitro Principal", color: "bg-brand-orange/15 border-brand-orange/40 text-brand-orange" },
  { key: "assistRef" as const, label: "Árbitro Auxiliar",  color: "bg-sky-500/10 border-sky-500/30 text-sky-400"               },
  { key: "scorer"    as const, label: "Anotador / Mesa",   color: "bg-purple-500/10 border-purple-500/30 text-purple-400"       },
];

const EMPTY_ROLES: OfficialRoles = { mainRef: false, assistRef: false, scorer: false };

interface FormState {
  name:     string;
  lastName: string;
  roles:    OfficialRoles;
  active:   boolean;
}

const EMPTY_FORM: FormState = { name: "", lastName: "", roles: EMPTY_ROLES, active: true };

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ official, size = "md" }: { official: Official; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-10 h-10 text-sm" : size === "lg" ? "w-20 h-20 text-2xl" : "w-14 h-14 text-lg";
  if (official.photoUrl) {
    return <img src={official.photoUrl} alt={`${official.name} ${official.lastName}`} className={`${sz} rounded-full object-cover border border-white/10 flex-shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-white/8 border border-white/10 flex items-center justify-center font-bold text-white/50 flex-shrink-0`}>
      {official.name.charAt(0)}{official.lastName.charAt(0)}
    </div>
  );
}

function RoleBadges({ roles }: { roles: OfficialRoles }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ROLE_OPTIONS.filter((r) => roles[r.key]).map((r) => (
        <span key={r.key} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.color}`}>{r.label}</span>
      ))}
    </div>
  );
}

// ── Modal de disponibilidad por jornada ───────────────────────────────────────
function AvailabilityModal({ official, onClose }: { official: Official; onClose: () => void }) {
  const qc = useQueryClient();
  const [jornadaInput, setJornadaInput] = useState("");
  const [newSlot, setNewSlot] = useState({ dayOfWeek: 6, startTime: "09:00", endTime: "14:00" });

  const { data: slots = [], isLoading } = useQuery<AvailabilitySlot[]>({
    queryKey: ["/api/officials", official.id, "availability"],
    queryFn:  () => apiGet<AvailabilitySlot[]>(`/api/officials/${official.id}/availability`),
  });

  const addMutation = useMutation({
    mutationFn: (data: { jornada: number; dayOfWeek: number; startTime: string; endTime: string }) =>
      apiPost<AvailabilitySlot>(`/api/officials/${official.id}/availability`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/officials", official.id, "availability"] });
      sileo.success({ title: "Disponibilidad guardada" });
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => apiDelete(`/api/officials/${official.id}/availability/${slotId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/officials", official.id, "availability"] }),
    onError: (e) => sileo.error({ title: "Error al eliminar", description: (e as Error).message }),
  });

  const handleAdd = () => {
    const jornada = parseInt(jornadaInput);
    if (isNaN(jornada) || jornada < 1) { sileo.error({ title: "Jornada inválida" }); return; }
    if (newSlot.startTime >= newSlot.endTime) { sileo.error({ title: "Hora inicio debe ser antes de hora fin" }); return; }
    addMutation.mutate({ jornada, ...newSlot });
  };

  // Agrupar slots por jornada
  const byJornada = slots.reduce<Record<number, AvailabilitySlot[]>>((acc, s) => {
    (acc[s.jornada] ??= []).push(s);
    return acc;
  }, {});
  const jornadas = Object.keys(byJornada).map(Number).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-6 pb-28 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg glass-panel p-6 sm:p-8 rounded-3xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar official={official} size="sm" />
            <div>
              <p className="font-bold text-white">{official.name} {official.lastName}</p>
              <p className="text-[11px] text-white/40">Disponibilidad por jornada</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Agregar slot */}
        <div className="glass-panel rounded-2xl p-4 space-y-3 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Agregar disponibilidad</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-white/30 uppercase font-bold">Jornada</label>
              <Input
                type="number"
                min={1}
                placeholder="Ej: 5"
                value={jornadaInput}
                onChange={(e) => setJornadaInput(e.target.value)}
                className="glass-input h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-white/30 uppercase font-bold">Día</label>
              <select
                value={newSlot.dayOfWeek}
                onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: parseInt(e.target.value) })}
                className="glass-input h-10 px-3 bg-transparent text-white text-sm w-full appearance-none"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value} className="bg-gray-900">{d.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-white/30 uppercase font-bold">Desde</label>
              <input
                type="time"
                value={newSlot.startTime}
                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                className="glass-input h-10 px-3 text-white text-sm w-full bg-transparent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-white/30 uppercase font-bold">Hasta</label>
              <input
                type="time"
                value={newSlot.endTime}
                onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                className="glass-input h-10 px-3 text-white text-sm w-full bg-transparent"
              />
            </div>
          </div>
          <Button
            onClick={handleAdd}
            disabled={addMutation.isPending || !jornadaInput}
            className="w-full rounded-xl h-10 bg-brand-orange hover:bg-brand-orange/85 text-white font-bold text-sm glow-orange disabled:opacity-40"
          >
            <Plus className="w-4 h-4 mr-1" />
            {addMutation.isPending ? "Guardando…" : "Agregar"}
          </Button>
        </div>

        {/* Slots existentes */}
        {isLoading ? (
          <p className="text-center text-white/30 text-sm py-4">Cargando...</p>
        ) : jornadas.length === 0 ? (
          <p className="text-center text-white/20 text-sm py-4">Sin disponibilidad capturada aún.</p>
        ) : (
          <div className="space-y-4">
            {jornadas.map((j) => (
              <div key={j}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-orange mb-2">
                  Jornada {j}
                </p>
                <div className="space-y-1.5">
                  {byJornada[j].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)).map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between glass-panel px-3 py-2 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-white/60 w-20">
                          {DAYS.find((d) => d.value === slot.dayOfWeek)?.label}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {slot.startTime} – {slot.endTime}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(slot.id)}
                        className="text-red-400/50 hover:text-red-400 transition-colors p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal alta/edición ────────────────────────────────────────────────────────
function OfficialModal({
  mode, form, official, isPending, onClose, onChange, onSubmit, onPhotoChange, photoPreview,
}: {
  mode: "create" | "edit"; form: FormState; official: Official | null;
  isPending: boolean; onClose: () => void;
  onChange: (patch: Partial<FormState>) => void; onSubmit: () => void;
  onPhotoChange: (file: File) => void; photoPreview: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit  = mode === "edit";
  const isValid = form.name.trim().length > 0 && form.lastName.trim().length > 0 &&
                  (form.roles.mainRef || form.roles.assistRef || form.roles.scorer);
  const currentPhoto = photoPreview ?? official?.photoUrl ?? null;

  const toggleRole = (key: keyof OfficialRoles) =>
    onChange({ roles: { ...form.roles, [key]: !form.roles[key] } });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-6 pb-28 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg glass-panel p-6 sm:p-8 rounded-3xl">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-brand-orange" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight">
              {isEdit ? "Editar Árbitro" : "Nuevo Árbitro"}
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
              {currentPhoto ? (
                <img src={currentPhoto} alt="foto" className="w-16 h-16 rounded-full object-cover border border-white/10" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-xl font-bold text-white/30">
                  {(form.name.charAt(0) || "?")}{form.lastName.charAt(0)}
                </div>
              )}
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

          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Nombre</label>
              <Input value={form.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Ej: Rafael" className="glass-input h-11" autoFocus={!isEdit} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Apellido</label>
              <Input value={form.lastName} onChange={(e) => onChange({ lastName: e.target.value })} placeholder="Ej: Mendoza" className="glass-input h-11" />
            </div>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">
              Puede desempeñarse como <span className="text-red-400/60">*</span>
            </label>
            <div className="flex flex-col gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button key={r.key} type="button" onClick={() => toggleRole(r.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left ${form.roles[r.key] ? r.color : "bg-white/4 border-white/8 text-white/40 hover:bg-white/8"}`}>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${form.roles[r.key] ? "bg-current border-current" : "border-white/20"}`}>
                    {form.roles[r.key] && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activo (solo edición) */}
          {isEdit && (
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
            {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar árbitro"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function OfficialCard({ official, onEdit, onAvailability, onDelete }: {
  official: Official; onEdit: () => void; onAvailability: () => void; onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar official={official} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white truncate">{official.name} {official.lastName}</p>
          <RoleBadges roles={official.roles} />
        </div>
      </div>
      <div className="flex gap-2 pt-1 border-t border-white/5">
        <button onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white hover:bg-white/6 transition-all">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
        <button onClick={onAvailability}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-brand-orange hover:bg-brand-orange/8 transition-all">
          <CalendarDays className="w-3.5 h-3.5" /> Disponibilidad
        </button>
        {confirmDelete ? (
          <>
            <button onClick={() => { onDelete(); setConfirmDelete(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-red-500/15 border border-red-500/30 text-red-400 transition-all">
              Confirmar
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white/40 hover:bg-white/6 transition-all">
              No
            </button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-red-400 hover:bg-red-500/8 transition-all">
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function OfficialsPage() {
  const qc = useQueryClient();
  const [modalOpen,        setModalOpen]        = useState(false);
  const [availModalTarget, setAvailModalTarget] = useState<Official | null>(null);
  const [editTarget,       setEditTarget]       = useState<Official | null>(null);
  const [form,             setForm]             = useState<FormState>(EMPTY_FORM);
  const [pendingPhoto,     setPendingPhoto]     = useState<File | null>(null);
  const [photoPreview,     setPhotoPreview]     = useState<string | null>(null);

  const { data: officialsData = [], isLoading } = useQuery<Official[]>({
    queryKey: ["/api/officials"],
    queryFn:  () => apiGet<Official[]>("/api/officials"),
  });

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setPendingPhoto(null); setPhotoPreview(null); setModalOpen(true); };
  const openEdit   = (o: Official) => { setEditTarget(o); setForm({ name: o.name, lastName: o.lastName, roles: o.roles, active: o.active }); setPendingPhoto(null); setPhotoPreview(null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const handlePhotoChange = (file: File) => { setPendingPhoto(file); setPhotoPreview(URL.createObjectURL(file)); };

  const uploadPhoto = async (id: string) => {
    if (!pendingPhoto) return;
    const fd = new FormData();
    fd.append("photo", pendingPhoto);
    await fetch(`/api/officials/${id}/photo`, { method: "POST", body: fd });
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const created = await apiPost<Official>("/api/officials", { name: data.name.trim(), lastName: data.lastName.trim(), roles: data.roles });
      await uploadPhoto(created.id);
      return created;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/officials"] }); closeModal(); sileo.success({ title: "Árbitro registrado" }); },
    onError:   (e) => sileo.error({ title: "Error al registrar", description: (e as Error).message }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormState }) => {
      const updated = await apiPut<Official>(`/api/officials/${id}`, { name: data.name.trim(), lastName: data.lastName.trim(), roles: data.roles, active: data.active });
      await uploadPhoto(id);
      return updated;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/officials"] }); closeModal(); sileo.success({ title: "Árbitro actualizado" }); },
    onError:   (e) => sileo.error({ title: "Error al editar", description: (e as Error).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/api/officials/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["/api/officials"] }); sileo.success({ title: "Árbitro eliminado" }); },
    onError:    (e) => sileo.error({ title: "Error al eliminar", description: (e as Error).message }),
  });

  const handleSubmit = () => {
    if (editTarget) editMutation.mutate({ id: editTarget.id, data: form });
    else            createMutation.mutate(form);
  };

  const isPending = createMutation.isPending || editMutation.isPending;
  const active    = officialsData.filter((o) => o.active);
  const inactive  = officialsData.filter((o) => !o.active);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <SectionTitle whiteText="Árbitros" orangeText="& Mesa Técnica" className="mb-0" />
        <Button onClick={openCreate} className="rounded-full bg-brand-orange hover:bg-brand-orange/85 text-white font-bold px-8 h-12 glow-orange">
          + Agregar Árbitro
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-white/40 py-16">Cargando árbitros...</div>
      ) : officialsData.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <p className="text-white/30 text-lg font-semibold mb-2">Sin árbitros registrados</p>
          <p className="text-white/20 text-sm">Agrega el cuerpo de árbitros y mesa técnica del torneo.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Activos · {active.length}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((o) => (
                  <OfficialCard key={o.id} official={o}
                    onEdit={() => openEdit(o)}
                    onAvailability={() => setAvailModalTarget(o)}
                    onDelete={() => deleteMutation.mutate(o.id)} />
                ))}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Inactivos · {inactive.length}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
                {inactive.map((o) => (
                  <OfficialCard key={o.id} official={o}
                    onEdit={() => openEdit(o)}
                    onAvailability={() => setAvailModalTarget(o)}
                    onDelete={() => deleteMutation.mutate(o.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <OfficialModal mode={editTarget ? "edit" : "create"} form={form} official={editTarget}
          isPending={isPending} onClose={closeModal}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          onSubmit={handleSubmit} onPhotoChange={handlePhotoChange} photoPreview={photoPreview} />
      )}

      {availModalTarget && (
        <AvailabilityModal official={availModalTarget} onClose={() => setAvailModalTarget(null)} />
      )}
    </div>
  );
}
