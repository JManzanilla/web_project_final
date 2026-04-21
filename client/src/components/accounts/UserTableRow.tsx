import { useState } from "react";
import {
  TableCell, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, User, Edit2, Trash2, RefreshCw, Check, X } from "lucide-react";

export type SectionKey = "roster" | "match" | "schedule" | "config" | "accounts" | "stream";
export type SectionPerm = { view: boolean; edit: boolean };
export type UserPermissions = Partial<Record<SectionKey, SectionPerm>>;

export interface ApiUser {
  id: string;
  username: string;
  name: string;
  role: "admin" | "lider" | "anotador";
  teamId: string | null;
  team?: { name: string } | null;
  firstLogin: boolean;
  active: boolean;
  permissions: UserPermissions;
}

const ROLE_LABEL: Record<string, string> = {
  admin:    "Admin",
  lider:    "Líder",
  anotador: "Mesa",
};

function getRoleIcon(role: string) {
  switch (role) {
    case "admin":    return <Shield className="text-brand-orange w-4 h-4" />;
    case "anotador": return <ShieldAlert className="text-sky-400 w-4 h-4" />;
    default:         return <User className="text-white/50 w-4 h-4" />;
  }
}

function getRolePillClass(role: string) {
  switch (role) {
    case "admin":    return "bg-brand-orange/12 border-brand-orange/30 text-orange-400";
    case "anotador": return "bg-sky-500/10 border-sky-500/25 text-sky-400";
    default:         return "bg-white/5 border-white/10 text-white/60";
  }
}

function StatusBadge({ active, firstLogin }: { active: boolean; firstLogin: boolean }) {
  if (!active) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-500/70" />
        <span className="text-sm font-semibold text-red-400/80">Inactivo</span>
      </div>
    );
  }
  if (firstLogin) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
        <span className="text-sm font-semibold text-amber-400">Primer acceso</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full flex-shrink-0 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
      <span className="text-sm font-semibold text-green-400">Activo</span>
    </div>
  );
}

export function UserTableRow({
  user,
  resetDone,
  onReset,
  onEdit,
  onDelete,
  onDeletePermanent,
}: {
  user: ApiUser;
  resetDone: string | null;
  onReset:          (id: string) => void;
  onEdit:           (user: ApiUser) => void;
  onDelete:         (id: string) => void;
  onDeletePermanent:(id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const subtitle = user.team?.name ?? `@${user.username}`;

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
    }
  };

  return (
    <TableRow className={`border-b border-white/5 hover:bg-white/4 transition-colors group ${!user.active ? "opacity-50" : ""}`}>
      {/* Usuario */}
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-base font-display font-bold flex-shrink-0">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-white">{user.name}</div>
            <div className="text-sm text-white/35">{subtitle}</div>
          </div>
        </div>
      </TableCell>

      {/* Rol */}
      <TableCell>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-semibold ${getRolePillClass(user.role)}`}>
          {getRoleIcon(user.role)}
          {ROLE_LABEL[user.role] ?? user.role}
        </div>
      </TableCell>

      {/* Estado */}
      <TableCell>
        <StatusBadge active={user.active} firstLogin={user.firstLogin} />
      </TableCell>

      {/* Acciones */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {/* Resetear contraseña */}
          <Button
            variant="ghost"
            size="icon"
            title="Resetear contraseña"
            onClick={() => onReset(user.id)}
            className={`rounded-full w-8 h-8 transition-all ${
              resetDone === user.id
                ? "bg-green-500/20 text-green-400"
                : "hover:bg-brand-orange/15 hover:text-brand-orange"
            }`}
          >
            {resetDone === user.id
              ? <Check className="w-3.5 h-3.5" />
              : <RefreshCw className="w-3.5 h-3.5" />
            }
          </Button>

          {/* Editar */}
          <Button
            variant="ghost"
            size="icon"
            title="Editar usuario"
            onClick={() => onEdit(user)}
            className="rounded-full w-8 h-8 hover:bg-white/10 hover:text-white"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>

          {/* Eliminar / confirmar */}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                title="Desactivar (conserva datos)"
                onClick={() => { onDelete(user.id); setConfirmDelete(false); }}
                className="rounded-full h-7 px-2 text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
              >
                Desactivar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Eliminar permanentemente"
                onClick={() => { onDeletePermanent(user.id); setConfirmDelete(false); }}
                className="rounded-full h-7 px-2 text-[11px] font-bold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
              >
                Eliminar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Cancelar"
                onClick={() => setConfirmDelete(false)}
                className="rounded-full w-7 h-7 hover:bg-white/10 hover:text-white"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              title="Eliminar usuario"
              onClick={handleDeleteClick}
              className="rounded-full w-8 h-8 hover:bg-red-500/20 hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
