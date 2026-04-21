import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, SectionKey, UserPermissions } from "@/context/AuthContext";
import { UserTableRow, ApiUser } from "@/components/accounts/UserTableRow";
import { PermissionsMatrix } from "@/components/accounts/PermissionsMatrix";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { sileo } from "sileo";
import { X, Eye, EyeOff, UserPlus } from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────
type Role = "admin" | "lider" | "anotador" | "transmision";
type TeamSource = "none" | "existing" | "new";
type SectionPerm = { view: boolean; edit: boolean };

interface TeamOption { id: string; name: string }

interface FormState {
  name:        string;
  username:    string;
  password:    string;
  role:        Role;
  teamSource:  TeamSource;
  teamId:      string;
  newTeamName: string;
  permissions: UserPermissions;
}

const EMPTY_FORM: FormState = {
  name: "", username: "", password: "", role: "lider",
  teamSource: "none", teamId: "", newTeamName: "", permissions: {},
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "lider",       label: "Líder de equipo"  },
  { value: "anotador",    label: "Mesa técnica"     },
  { value: "transmision", label: "Transmisiones"    },
  { value: "admin",       label: "Administrador"    },
];

// Permisos que cada rol YA tiene por defecto (no necesitan configurarse)
const ROLE_BASE: Record<Role, SectionKey[]> = {
  admin:       ["roster", "match", "schedule", "config", "accounts", "stream"],
  lider:       ["roster"],
  anotador:    ["match"],
  transmision: ["stream"],
};

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "roster",   label: "Roster"        },
  { key: "match",    label: "Mesa Técnica"  },
  { key: "schedule", label: "Calendario"    },
  { key: "config",   label: "Configuración" },
  { key: "accounts", label: "Cuentas"       },
  { key: "stream",   label: "Transmisiones" },
];

// ── Sub-componente: matriz de permisos editable ───────────────────────────────
function PermGrid({
  role,
  permissions,
  onChange,
}: {
  role: Role;
  permissions: UserPermissions;
  onChange: (p: UserPermissions) => void;
}) {
  const baseKeys = ROLE_BASE[role];

  const toggle = (key: SectionKey, level: "view" | "edit") => {
    const current = permissions[key] ?? { view: false, edit: false };
    let next: SectionPerm;

    if (level === "view") {
      // Desactivar view también desactiva edit
      const newView = !current.view;
      next = { view: newView, edit: newView ? current.edit : false };
    } else {
      // Activar edit también activa view
      const newEdit = !current.edit;
      next = { view: newEdit ? true : current.view, edit: newEdit };
    }
    onChange({ ...permissions, [key]: next });
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">
        Permisos adicionales
      </label>
      <div className="rounded-2xl border border-white/8 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px] px-4 py-2 bg-white/4 border-b border-white/8">
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Sección</span>
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider text-center">Ver</span>
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider text-center">Editar</span>
        </div>

        {SECTIONS.map(({ key, label }) => {
          const isBase = baseKeys.includes(key);
          const perm   = permissions[key] ?? { view: false, edit: false };

          return (
            <div key={key} className={`grid grid-cols-[1fr_80px_80px] px-4 py-2.5 border-b border-white/5 last:border-0 ${isBase ? "opacity-40" : ""}`}>
              <span className="text-sm font-semibold text-white/70 self-center">{label}</span>

              {/* Ver */}
              <div className="flex justify-center items-center">
                {isBase ? (
                  <div className="w-5 h-5 rounded-md bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center">
                    <svg className="w-3 h-3 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  </div>
                ) : perm.edit ? (
                  // Edit implies view — show locked view checkmark
                  <div
                    className="w-5 h-5 rounded-md bg-sky-500/20 border border-sky-500/50 flex items-center justify-center opacity-50 cursor-not-allowed"
                    title="Ver es requerido cuando Editar está activo"
                  >
                    <svg className="w-3 h-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(key, "view")}
                    className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                      perm.view
                        ? "bg-sky-500/20 border-sky-500/50"
                        : "bg-white/5 border-white/15 hover:border-white/30"
                    }`}
                  >
                    {perm.view && <svg className="w-3 h-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                  </button>
                )}
              </div>

              {/* Editar */}
              <div className="flex justify-center items-center">
                {isBase ? (
                  <div className="w-5 h-5 rounded-md bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center">
                    <svg className="w-3 h-3 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(key, "edit")}
                    className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                      perm.edit
                        ? "bg-brand-orange/20 border-brand-orange/50"
                        : "bg-white/5 border-white/15 hover:border-white/30"
                    }`}
                  >
                    {perm.edit && <svg className="w-3 h-3 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-white/20">Las secciones del rol base aparecen fijas en naranja · Activar Editar incluye Ver automáticamente</p>
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
function UserModal({
  mode,
  form,
  teams,
  isPending,
  onClose,
  onChange,
  onSubmit,
}: {
  mode:      "create" | "edit";
  form:      FormState;
  teams:     TeamOption[];
  isPending: boolean;
  onClose:   () => void;
  onChange:  (patch: Partial<FormState>) => void;
  onSubmit:  () => void;
}) {
  const [showPass, setShowPass] = useState(false);
  const isCreate = mode === "create";

  const ROLE_LABEL_MAP: Record<Role, string> = {
    admin:       "Administrador",   lider:       "Líder de equipo",
    anotador:    "Mesa técnica",    transmision: "Transmisiones",
  };
  const ROLE_COLOR_MAP: Record<Role, string> = {
    admin:       "bg-brand-orange/15 border-brand-orange/30 text-brand-orange",
    lider:       "bg-white/8 border-white/15 text-white/60",
    anotador:    "bg-sky-500/10 border-sky-500/25 text-sky-400",
    transmision: "bg-purple-500/10 border-purple-500/25 text-purple-400",
  };

  const isValid = isCreate
    ? (form.name.trim() &&
       form.username.trim() &&
       form.password.length >= 6)
    : true;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-6 pb-28 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl glass-panel p-6 sm:p-8 rounded-3xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-brand-orange" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight">
              {isCreate ? "Nueva Cuenta" : "Permisos adicionales"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── MODO EDITAR: solo cabecera de referencia + permisos ── */}
        {!isCreate ? (
          <div className="space-y-5">
            {/* Quién es */}
            <div className="flex items-center gap-3 glass-panel px-4 py-3 rounded-2xl">
              <div className="w-9 h-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {form.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{form.name}</div>
                <div className="text-[11px] text-white/40">@{form.username}</div>
              </div>
              <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold flex-shrink-0 ${ROLE_COLOR_MAP[form.role]}`}>
                {ROLE_LABEL_MAP[form.role]}
              </span>
            </div>

            {/* Grid de permisos */}
            {form.role !== "admin" ? (
              <PermGrid
                role={form.role}
                permissions={form.permissions}
                onChange={(p) => onChange({ permissions: p })}
              />
            ) : (
              <p className="text-center text-white/30 text-sm py-4">
                El administrador tiene acceso total a todas las secciones.
              </p>
            )}
          </div>

        ) : (
          /* ── MODO CREAR: formulario completo ── */
          <div className="space-y-4">

            <div className="space-y-1.5">
              <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Nombre completo</label>
              <Input
                value={form.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Ej: Juan García"
                className="glass-input h-11"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Nombre de usuario</label>
              <Input
                value={form.username}
                onChange={(e) => onChange({ username: e.target.value.toLowerCase().replace(/\s/g, "") })}
                placeholder="Ej: jgarcia"
                className="glass-input h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Contraseña temporal</label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => onChange({ password: e.target.value })}
                  placeholder="mínimo 6 caracteres"
                  className="glass-input h-11 pr-11"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-white/25">El usuario deberá cambiarla en su primer acceso</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Rol</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => onChange({ role: opt.value, teamSource: "none", teamId: "", newTeamName: "" })}
                    className={`py-2.5 px-3 rounded-xl border text-[12px] font-bold transition-all ${
                      form.role === opt.value
                        ? "bg-brand-orange/15 border-brand-orange/40 text-brand-orange"
                        : "bg-white/4 border-white/8 text-white/40 hover:bg-white/8"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {form.role === "lider" && (
              <div className="space-y-3">
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Equipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "none",     label: "Sin equipo" },
                    { value: "existing", label: "Existente"  },
                    { value: "new",      label: "Nuevo"      },
                  ] as { value: TeamSource; label: string }[]).map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => onChange({ teamSource: opt.value, teamId: "", newTeamName: "" })}
                      className={`py-2 px-3 rounded-xl border text-[12px] font-bold transition-all ${
                        form.teamSource === opt.value
                          ? "bg-white/12 border-white/30 text-white"
                          : "bg-white/4 border-white/8 text-white/40 hover:bg-white/8"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {form.teamSource === "existing" && (
                  <select value={form.teamId}
                    onChange={(e) => {
                      const selected = teams.find((t) => t.id === e.target.value);
                      onChange({ teamId: e.target.value, name: selected ? selected.name : form.name });
                    }}
                    className="w-full glass-input h-11 px-4 bg-transparent text-white text-sm appearance-none cursor-pointer">
                    <option value="" className="bg-gray-900 text-white/60">— Selecciona un equipo —</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} className="bg-gray-900 text-white">{t.name}</option>
                    ))}
                  </select>
                )}
                {form.teamSource === "new" && (
                  <div className="space-y-1.5">
                    <Input value={form.newTeamName}
                      onChange={(e) => onChange({ newTeamName: e.target.value })}
                      placeholder="Nombre del equipo (opcional)"
                      className="glass-input h-11" />
                    <p className="text-[11px] text-white/25">
                      Si no escribes un nombre se usará "Equipo de {form.name.trim() || "…"}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {form.role !== "admin" && (
              <PermGrid
                role={form.role}
                permissions={form.permissions}
                onChange={(p) => onChange({ permissions: p })}
              />
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3 mt-7">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 rounded-full h-11 border border-white/10 hover:bg-white/8"
          >
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!isValid || isPending}
            className="flex-1 rounded-full h-11 bg-brand-orange hover:bg-brand-orange/85 text-white font-bold glow-orange disabled:opacity-40"
          >
            {isPending ? "Guardando…" : isCreate ? "Crear cuenta" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function AccountsPage() {
  const { resetPassword } = useAuth();
  const qc = useQueryClient();

  const [resetDone,  setResetDone]  = useState<string | null>(null);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<ApiUser | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);

  const isEdit = editTarget !== null;

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: users = [], isLoading } = useQuery<ApiUser[]>({
    queryKey: ["/api/users"],
    queryFn: () => apiGet<ApiUser[]>("/api/users"),
  });

  const { data: teams = [] } = useQuery<TeamOption[]>({
    queryKey: ["/api/teams"],
    queryFn: () => apiGet<TeamOption[]>("/api/teams"),
  });

  // ── Helpers modal ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (user: ApiUser) => {
    setEditTarget(user);
    setForm({
      name:        user.name,
      username:    user.username,
      password:    "",
      role:        user.role,
      teamSource:  user.teamId ? "existing" : "none",
      teamId:      user.teamId ?? "",
      newTeamName: "",
      permissions: user.permissions ?? {},
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  // ── Tipos de variables de mutación ────────────────────────────────────────
  type CreateVars = { name: string; username: string; password: string; role: Role; teamId: string | null; permissions: UserPermissions };
  type EditVars   = { id: string; name: string; role: Role; teamId: string | null; permissions: UserPermissions };

  // ── Mutaciones (reciben datos explícitos, sin clausuras sobre form) ─────────
  const createMutation = useMutation({
    mutationFn: (vars: CreateVars) => apiPost<ApiUser>("/api/users", vars),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      closeModal();
      sileo.success({ title: "Cuenta creada", description: `@${created.username}` });
    },
    onError: (e) => sileo.error({ title: "Error al crear", description: (e as Error).message }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, name, role, teamId, permissions }: EditVars) =>
      apiPut<ApiUser>(`/api/users/${id}`, { name, role, teamId, permissions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      closeModal();
      sileo.success({ title: "Usuario actualizado" });
    },
    onError: (e) => sileo.error({ title: "Error al editar", description: (e as Error).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => apiDelete<{ message: string }>(`/api/users/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      sileo.success({ title: "Usuario desactivado" });
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  const deletePermanentMutation = useMutation({
    mutationFn: (userId: string) => apiDelete<{ message: string }>(`/api/users/${userId}?permanent=true`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      sileo.success({ title: "Usuario eliminado" });
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  const handleReset = async (userId: string) => {
    const result = await resetPassword(userId, "Temp2026!");
    if (result.success) {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      setResetDone(userId);
      setTimeout(() => setResetDone(null), 2000);
      sileo.success({ title: "Contraseña reseteada", description: "Temporal: Temp2026!" });
    } else {
      sileo.error({ title: "Error", description: result.error });
    }
  };

  // Resuelve el teamId según teamSource y llama la mutación correcta
  const handleSubmit = async () => {
    let resolvedTeamId: string | null = null;

    if (form.role === "lider") {
      if (form.teamSource === "existing") {
        resolvedTeamId = form.teamId || null;
      } else if (form.teamSource === "new") {
        try {
          const teamName = form.newTeamName.trim() || `Equipo de ${form.name.trim()}`;
          const newTeam  = await apiPost<TeamOption>("/api/teams", { name: teamName });
          resolvedTeamId = newTeam.id;
          qc.invalidateQueries({ queryKey: ["/api/teams"] });
        } catch (e) {
          sileo.error({ title: "Error al crear equipo", description: (e as Error).message });
          return;
        }
      }
      // teamSource === "none" → resolvedTeamId queda null
    }

    if (isEdit && editTarget) {
      editMutation.mutate({
        id:          editTarget.id,
        name:        form.name.trim(),
        role:        form.role,
        teamId:      resolvedTeamId,
        permissions: form.role === "admin" ? {} : form.permissions,
      });
    } else {
      createMutation.mutate({
        name:        form.name.trim(),
        username:    form.username.trim(),
        password:    form.password,
        role:        form.role,
        teamId:      resolvedTeamId,
        permissions: form.role === "admin" ? {} : form.permissions,
      });
    }
  };

  const isPending = createMutation.isPending || editMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <SectionTitle whiteText="Cuentas" orangeText="& Permisos" className="mb-0" />
        <Button
          onClick={openCreate}
          className="rounded-full bg-brand-orange hover:bg-brand-orange/85 text-white font-bold px-8 h-12 glow-orange"
        >
          + Nueva Cuenta
        </Button>
      </div>

      {/* Tabla */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center text-white/40 py-12">Cargando usuarios...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50 uppercase tracking-wider font-display py-5 min-w-[200px]">Usuario</TableHead>
                  <TableHead className="text-white/50 uppercase tracking-wider font-display min-w-[120px]">Rol</TableHead>
                  <TableHead className="text-white/50 uppercase tracking-wider font-display min-w-[140px]">Estado</TableHead>
                  <TableHead className="text-white/50 uppercase tracking-wider font-display text-right min-w-[130px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    resetDone={resetDone}
                    onReset={handleReset}
                    onEdit={openEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onDeletePermanent={(id) => deletePermanentMutation.mutate(id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <PermissionsMatrix users={users} onEdit={openEdit} />

      {/* Modal */}
      {modalOpen && (
        <UserModal
          mode={isEdit ? "edit" : "create"}
          form={form}
          teams={teams}
          isPending={isPending}
          onClose={closeModal}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
