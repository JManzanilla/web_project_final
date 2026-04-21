import {
  User, ClipboardList, CalendarDays, Settings, Users2,
  Home, Trophy, History, Pencil, Eye, Minus, Radio,
} from "lucide-react";
import type { ApiUser, SectionKey, UserPermissions } from "./UserTableRow";

// ── Configuración de secciones ────────────────────────────────────────────────
const ROLE_BASE: Record<string, SectionKey[]> = {
  admin:       ["roster", "match", "schedule", "config", "accounts", "stream"],
  lider:       ["roster"],
  anotador:    ["match"],
  transmision: ["stream"],
};

const RESTRICTED_SECTIONS: { key: SectionKey; label: string; Icon: React.ElementType }[] = [
  { key: "roster",   label: "Roster",         Icon: User         },
  { key: "match",    label: "Mesa Técnica",    Icon: ClipboardList },
  { key: "schedule", label: "Calendario",      Icon: CalendarDays  },
  { key: "config",   label: "Configuración",   Icon: Settings      },
  { key: "accounts", label: "Cuentas",         Icon: Users2        },
  { key: "stream",   label: "Transmisiones",   Icon: Radio         },
];

const PUBLIC_SECTIONS = [
  { label: "Inicio",         Icon: Home    },
  { label: "Clasificación",  Icon: Trophy  },
  { label: "Historial",      Icon: History },
];

const ROLE_LABEL: Record<string, string> = {
  admin:       "Admin",
  lider:       "Líder",
  anotador:    "Mesa",
  transmision: "Stream",
};

const ROLE_COLOR: Record<string, string> = {
  admin:       "text-brand-orange",
  lider:       "text-white/60",
  anotador:    "text-sky-400",
  transmision: "text-purple-400",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getEffective(
  user: ApiUser,
  section: SectionKey,
): { view: boolean; edit: boolean; isBase: boolean } {
  const isBase = (ROLE_BASE[user.role] ?? []).includes(section);
  if (isBase) return { view: true, edit: true, isBase: true };
  const p = (user.permissions ?? {})[section];
  return { view: p?.view ?? false, edit: p?.edit ?? false, isBase: false };
}

// ── Celda de permiso ──────────────────────────────────────────────────────────
function PermDot({ active, isBase, kind }: { active: boolean; isBase: boolean; kind: "view" | "edit" }) {
  if (!active) {
    return <span className="w-2 h-2 rounded-full bg-white/10 flex-shrink-0" title="Sin acceso" />;
  }
  if (isBase) {
    return (
      <span
        className="w-2 h-2 rounded-full bg-brand-orange flex-shrink-0 shadow-[0_0_6px_rgba(251,146,60,0.6)]"
        title="Incluido en rol"
      />
    );
  }
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${
        kind === "view"
          ? "bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]"
          : "bg-brand-orange shadow-[0_0_6px_rgba(251,146,60,0.6)]"
      }`}
      title={kind === "view" ? "Ver (permiso extra)" : "Editar (permiso extra)"}
    />
  );
}

// ── Vista móvil: cards por usuario ───────────────────────────────────────────
function UserPermCard({ user, onEdit }: { user: ApiUser; onEdit: (u: ApiUser) => void }) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      {/* Header de usuario */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
        <div className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {user.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">{user.name}</div>
          <div className="text-[10px] text-white/40">@{user.username}</div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
          user.role === "admin"       ? "bg-brand-orange/15 border-brand-orange/30 text-brand-orange" :
          user.role === "anotador"    ? "bg-sky-500/10 border-sky-500/25 text-sky-400" :
          user.role === "transmision" ? "bg-purple-500/10 border-purple-500/25 text-purple-400" :
                                        "bg-white/8 border-white/15 text-white/60"
        }`}>
          {ROLE_LABEL[user.role]}
        </span>
        {user.role !== "admin" && (
          <button onClick={() => onEdit(user)}
            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-brand-orange hover:border-brand-orange/30 transition-all flex-shrink-0"
            title="Editar permisos">
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Secciones públicas */}
      <div className="px-4 py-2 border-b border-white/5">
        <div className="text-[9px] text-white/20 font-bold uppercase tracking-widest mb-1.5">Públicas</div>
        <div className="flex gap-3 flex-wrap">
          {PUBLIC_SECTIONS.map(({ label, Icon }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="w-3 h-3 text-white/20" />
              <span className="text-[11px] text-white/35">{label}</span>
              <PermDot active kind="view" isBase={false} />
            </div>
          ))}
        </div>
      </div>

      {/* Secciones restringidas */}
      <div className="px-4 py-2">
        <div className="text-[9px] text-white/20 font-bold uppercase tracking-widest mb-1.5">Restringidas</div>
        <div className="space-y-1.5">
          {RESTRICTED_SECTIONS.map(({ key, label, Icon }) => {
            const eff = getEffective(user, key);
            return (
              <div key={key} className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                <span className="text-[12px] text-white/60 flex-1">{label}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[9px] text-white/25">Ver</span>
                  <PermDot active={eff.view} isBase={eff.isBase} kind="view" />
                  <span className="text-[9px] text-white/25">Edit</span>
                  <PermDot active={eff.edit} isBase={eff.isBase} kind="edit" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function PermissionsMatrix({
  users,
  onEdit,
}: {
  users:  ApiUser[];
  onEdit: (user: ApiUser) => void;
}) {
  const staffUsers = users.filter((u) => u.active);

  return (
    <div className="mt-10">
      <div className="flex items-center gap-4 mb-5">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-[10px] text-white/25 font-bold uppercase tracking-widest whitespace-nowrap">
          Permisos por usuario
        </span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      {/* ── Vista móvil: cards ── */}
      <div className="sm:hidden space-y-3">
        {staffUsers.map((u) => (
          <UserPermCard key={u.id} user={u} onEdit={onEdit} />
        ))}
        <p className="text-[10px] text-white/20 text-center pt-1">
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="w-2 h-2 rounded-full bg-brand-orange inline-block" /> Rol base
          </span>
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Ver extra
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white/10 inline-block" /> Sin acceso
          </span>
        </p>
      </div>

      {/* ── Vista desktop: tabla ── */}
      <div className="hidden sm:block glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 uppercase tracking-wider text-[11px] font-bold py-4 px-4 min-w-[140px] sticky left-0 bg-black/40 z-10">
                  Sección
                </th>
                {staffUsers.map((u) => (
                  <th key={u.id} className="py-3 px-3 text-center min-w-[90px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-7 h-7 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <span className="text-[11px] font-bold text-white/80 truncate max-w-[80px]">{u.name}</span>
                      <span className={`text-[10px] font-bold ${ROLE_COLOR[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                      {u.role !== "admin" && (
                        <button onClick={() => onEdit(u)}
                          className="mt-0.5 text-white/20 hover:text-brand-orange transition-colors"
                          title="Editar permisos">
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PUBLIC_SECTIONS.map(({ label, Icon }, i) => (
                <tr key={label} className={`${i < PUBLIC_SECTIONS.length - 1 || RESTRICTED_SECTIONS.length > 0 ? "border-b border-white/5" : ""} bg-white/[0.01]`}>
                  <td className="py-2.5 px-4 sticky left-0 bg-black/30 z-10">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3 text-white/20 flex-shrink-0" />
                      <span className="text-[12px] text-white/40 font-semibold">{label}</span>
                      <span className="text-[10px] text-white/20 font-medium ml-1">público</span>
                    </div>
                  </td>
                  {staffUsers.map((u) => (
                    <td key={u.id} className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <PermDot active kind="view" isBase={false} />
                        <Minus className="w-2.5 h-2.5 text-white/15" />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}

              <tr className="border-b border-white/10 bg-white/3">
                <td colSpan={staffUsers.length + 1} className="py-1.5 px-4 sticky left-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] text-white/25 font-bold uppercase tracking-widest">Secciones restringidas</span>
                    <div className="flex items-center gap-2 ml-2 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px] text-white/30"><span className="w-2 h-2 rounded-full bg-brand-orange inline-block" /> Rol base</span>
                      <span className="flex items-center gap-1 text-[10px] text-sky-400/60"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Ver extra</span>
                      <span className="flex items-center gap-1 text-[10px] text-brand-orange/60"><span className="w-2 h-2 rounded-full bg-brand-orange/60 inline-block" /> Editar extra</span>
                      <span className="flex items-center gap-1 text-[10px] text-white/20"><span className="w-2 h-2 rounded-full bg-white/10 inline-block" /> Sin acceso</span>
                    </div>
                  </div>
                </td>
              </tr>

              {RESTRICTED_SECTIONS.map(({ key, label, Icon }, i) => (
                <tr key={key} className={`${i < RESTRICTED_SECTIONS.length - 1 ? "border-b border-white/5" : ""} hover:bg-white/3 transition-colors`}>
                  <td className="py-3 px-4 sticky left-0 bg-black/40 z-10">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                      <span className="text-[13px] text-white/70 font-semibold">{label}</span>
                    </div>
                  </td>
                  {staffUsers.map((u) => {
                    const eff = getEffective(u, key);
                    return (
                      <td key={u.id} className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <PermDot active={eff.view} isBase={eff.isBase} kind="view" />
                          <PermDot active={eff.edit} isBase={eff.isBase} kind="edit" />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-white/8 bg-black/20 flex items-center gap-2 flex-wrap">
          <Eye className="w-3 h-3 text-white/25" />
          <span className="text-[10px] text-white/25">
            Cada celda muestra dos puntos: <strong className="text-white/40">Ver</strong> y <strong className="text-white/40">Editar</strong>.
            Haz clic en el ✏️ de cualquier usuario para editar sus permisos.
          </span>
        </div>
      </div>
    </div>
  );
}
