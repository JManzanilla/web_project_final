import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { QuickNav } from "@/components/ui/QuickNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown, ChevronUp,
  Pencil, PauseCircle, PlayCircle, Swords, ClipboardList, Radio, ScrollText, CalendarDays,
} from "lucide-react";
import { apiGet, apiPut } from "@/lib/apiClient";
import { sileo } from "sileo";
import { useAuth } from "@/context/AuthContext";

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------
type MatchStatus = "upcoming" | "live" | "finished" | "suspended";

interface ScheduleMatch {
  id: string;
  jornada: number;
  scheduledAt: string;
  status: MatchStatus;
  scoreHome: number | null;
  scoreAway: number | null;
  homeTeam: { id: string; name: string; logoUrl: string | null };
  awayTeam: { id: string; name: string; logoUrl: string | null };
}

function TeamLogo({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  if (logoUrl) {
    return (
      <img src={logoUrl} alt={name}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10" />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0 text-base">
      🏀
    </div>
  );
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${date} · ${time}`;
}

// "2026-04-15T10:00" — compatible con <input type="datetime-local">
function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_LABEL: Record<MatchStatus, string> = {
  upcoming:  "Pendiente",
  live:      "En vivo",
  finished:  "Finalizado",
  suspended: "Suspendido",
};

const STATUS_STYLE: Record<MatchStatus, string> = {
  upcoming:  "bg-blue-500/10 text-blue-400 border-blue-500/25",
  live:      "bg-green-500/10 text-green-400 border-green-500/25",
  finished:  "bg-white/5 text-white/30 border-white/10",
  suspended: "bg-amber-500/10 text-amber-400 border-amber-500/25",
};

// ---------------------------------------------------------------------------
// COMPONENTE FILA DE PARTIDO
// ---------------------------------------------------------------------------
function MatchRow({
  m,
  onEdit,
  onToggleSuspend,
  isPending,
  isAdmin,
}: {
  m: ScheduleMatch;
  onEdit: (m: ScheduleMatch) => void;
  onToggleSuspend: (id: string, status: MatchStatus) => void;
  isPending: boolean;
  isAdmin: boolean;
}) {
  const isFinished = m.status === "finished";
  const isLive     = m.status === "live";

  return (
    <div className={`px-3 py-3 flex items-center gap-2 transition-colors ${m.status === "suspended" ? "opacity-50" : ""}`}>
      {/* Layout 3 columnas: local | centro | visitante */}
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        {/* Equipo local: nombre + logo (logo hacia el centro) */}
        <div className="flex items-center gap-4 justify-end min-w-0">
          <span className={`text-sm font-bold truncate text-right ${isFinished ? "text-white/40" : "text-white"}`}>
            {m.homeTeam.name}
          </span>
          <TeamLogo logoUrl={m.homeTeam.logoUrl} name={m.homeTeam.name} />
        </div>

        {/* Centro: marcador/vs + badge + fecha */}
        <div className="flex flex-col items-center gap-1 px-2">
          {isFinished && m.scoreHome !== null ? (
            <span className="text-sm font-black text-brand-orange/80 tabular-nums">
              {m.scoreHome} – {m.scoreAway}
            </span>
          ) : isLive ? (
            <span className="text-sm font-black text-brand-orange tabular-nums">
              {m.scoreHome ?? 0} – {m.scoreAway ?? 0}
            </span>
          ) : (
            <span className="text-[11px] text-white/40 font-bold">vs</span>
          )}
          <div className="flex flex-col items-center gap-0.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[m.status]}`}>
              {STATUS_LABEL[m.status]}
            </span>
            <span className="text-[9px] text-white/50 font-semibold whitespace-nowrap">
              {formatDateTime(m.scheduledAt)}
            </span>
          </div>
        </div>

        {/* Equipo visitante: logo + nombre (logo hacia el centro) */}
        <div className="flex items-center gap-4 min-w-0">
          <TeamLogo logoUrl={m.awayTeam.logoUrl} name={m.awayTeam.name} />
          <span className={`text-sm font-bold truncate ${isFinished ? "text-white/40" : "text-white"}`}>
            {m.awayTeam.name}
          </span>
        </div>
      </div>

      {/* Acciones — solo admin */}
      {isAdmin && !isFinished && !isLive && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(m)} title="Reprogramar"
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-brand-orange/20 hover:text-brand-orange text-white/30 transition-all border border-white/8 hover:border-brand-orange/30">
            <Pencil className="w-3 h-3" />
          </button>
          {m.status === "upcoming" ? (
            <button onClick={() => onToggleSuspend(m.id, "suspended")} title="Suspender"
              disabled={isPending}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 text-white/30 transition-all border border-white/8 hover:border-amber-500/30 disabled:opacity-40">
              <PauseCircle className="w-3 h-3" />
            </button>
          ) : (
            <button onClick={() => onToggleSuspend(m.id, "upcoming")} title="Restaurar"
              disabled={isPending}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-green-500/20 hover:text-green-400 text-white/30 transition-all border border-white/8 hover:border-green-500/30 disabled:opacity-40">
              <PlayCircle className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PÁGINA
// ---------------------------------------------------------------------------
export default function SchedulePage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: matches = [], isLoading } = useQuery<ScheduleMatch[]>({
    queryKey: ["/api/matches"],
    queryFn:  () => apiGet<ScheduleMatch[]>("/api/matches"),
  });

  // Separar pendientes (jornada=0) del resto
  const pendingMatches = matches.filter((m) => m.jornada === 0);
  const jornadaMap = matches
    .filter((m) => m.jornada !== 0)
    .reduce<Record<number, ScheduleMatch[]>>((acc, m) => {
      (acc[m.jornada] ??= []).push(m);
      return acc;
    }, {});
  const jornadas = Object.entries(jornadaMap)
    .map(([num, ms]) => ({ num: Number(num), matches: ms }))
    .sort((a, b) => a.num - b.num);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpand = (n: number) =>
    setExpanded((prev) => { const s = new Set(prev); s.has(n) ? s.delete(n) : s.add(n); return s; });

  // ── Modal editar partido ──────────────────────────────────────────────────
  const [editing, setEditing] = useState<ScheduleMatch | null>(null);
  const [editDatetime, setEditDatetime] = useState("");

  const openEdit = (m: ScheduleMatch) => {
    setEditing(m);
    setEditDatetime(toDatetimeLocal(m.scheduledAt));
  };

  const reschedMutation = useMutation({
    mutationFn: (id: string) =>
      apiPut(`/api/matches/${id}`, { scheduledAt: new Date(editDatetime).toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/matches"] });
      setEditing(null);
      sileo.success({
        title: "Partido reprogramado",
        description: "La nueva fecha quedó guardada en el calendario",
      });
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  // ── Suspender / Restaurar ─────────────────────────────────────────────────
  const suspendMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MatchStatus }) =>
      apiPut(`/api/matches/${id}`, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["/api/matches"] });
      if (status === "suspended") {
        sileo.warning({ title: "Partido suspendido", description: "Puedes restaurarlo cuando quieras" });
      } else {
        sileo.success({ title: "Partido restaurado", description: "El partido vuelve a estar pendiente" });
      }
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8 flex items-center justify-center min-h-[40vh]">
        <p className="text-white/30 animate-pulse">Cargando calendario…</p>
      </div>
    );
  }

  if (jornadas.length === 0) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <SectionTitle whiteText="Calendario" orangeText="Partidos" />
        <div className="glass-panel p-10 text-center">
          <Swords className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No hay partidos generados todavía.</p>
          {user?.role === "admin" && (
            <p className="text-white/20 text-xs mt-1">Genera el calendario desde Configuración.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <SectionTitle whiteText="Calendario" orangeText="Partidos" />

      {/* Accesos rápidos */}
      {(() => {
        const items = [{ href: "/schedule", icon: CalendarDays, label: "Calendario" }];
        if (user?.role === "admin" || user?.role === "anotador")
          items.push({ href: "/matches",           icon: ClipboardList, label: "Mesa Técnica"  });
        if (user?.role === "admin" || user?.role === "transmision" || user?.permissions?.stream?.view)
          items.push({ href: "/stream",            icon: Radio,         label: "Transmisiones" });
        return <QuickNav items={items} />;
      })()}

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Jornadas",   value: jornadas.length },
          { label: "Pendientes", value: matches.filter((m) => m.status === "upcoming").length },
          { label: "Jugados",    value: matches.filter((m) => m.status === "finished").length },
        ].map((s) => (
          <div key={s.label} className="glass-panel p-3 text-center">
            <div className="text-2xl font-black text-brand-orange">{s.value}</div>
            <div className="text-[10px] text-white/30 font-bold uppercase mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Lista de jornadas — dos columnas flex para que las colapsadas llenen el espacio */}
      <div className="flex flex-col md:flex-row gap-3 items-start">

        {/* Columna izquierda */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Partidos pendientes siempre en columna izquierda */}
          {pendingMatches.length > 0 && (
            <div className="glass-panel overflow-hidden border-amber-500/20">
              <button
                onClick={() => toggleExpand(0)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display font-black text-amber-400 text-lg">
                    Partidos pendientes
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    recuperación
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                    {pendingMatches.filter((m) => m.status === "upcoming").length} pendiente{pendingMatches.filter((m) => m.status === "upcoming").length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white/30">
                  <span className="text-[10px] text-white/25 hidden sm:block">Equipos integrados al torneo</span>
                  {expanded.has(0) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {expanded.has(0) && (
                <div className="border-t border-amber-500/10 divide-y divide-white/5">
                  {pendingMatches.map((m) => (
                    <MatchRow key={m.id} m={m} onEdit={openEdit}
                      onToggleSuspend={(id, status) => suspendMutation.mutate({ id, status })}
                      isPending={suspendMutation.isPending} isAdmin={user?.role === "admin"} />
                  ))}
                </div>
              )}
            </div>
          )}
          {jornadas.filter((_, i) => i % 2 === 0).map(({ num, matches: jMatches }) => {
            const isOpen = expanded.has(num);
            const pending = jMatches.filter((m) => m.status === "upcoming").length;
            const hasSuspended = jMatches.some((m) => m.status === "suspended");
            return (
              <div key={num} className="glass-panel overflow-hidden">
                <button onClick={() => toggleExpand(num)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-black text-brand-orange text-lg">Jornada {num}</span>
                    {pending > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        {pending} pendiente{pending !== 1 ? "s" : ""}
                      </span>
                    )}
                    {hasSuspended && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        suspendido
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-white/30">
                    <span className="text-[11px]">
                      {new Date(jMatches[0].scheduledAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-white/5 divide-y divide-white/5">
                    {jMatches.map((m) => (
                      <MatchRow key={m.id} m={m} onEdit={openEdit}
                        onToggleSuspend={(id, status) => suspendMutation.mutate({ id, status })}
                        isPending={suspendMutation.isPending} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Columna derecha */}
        <div className="flex-1 flex flex-col gap-3">
          {jornadas.filter((_, i) => i % 2 !== 0).map(({ num, matches: jMatches }) => {
            const isOpen = expanded.has(num);
            const pending = jMatches.filter((m) => m.status === "upcoming").length;
            const hasSuspended = jMatches.some((m) => m.status === "suspended");
            return (
              <div key={num} className="glass-panel overflow-hidden">
                <button onClick={() => toggleExpand(num)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-black text-brand-orange text-lg">Jornada {num}</span>
                    {pending > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        {pending} pendiente{pending !== 1 ? "s" : ""}
                      </span>
                    )}
                    {hasSuspended && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        suspendido
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-white/30">
                    <span className="text-[11px]">
                      {new Date(jMatches[0].scheduledAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-white/5 divide-y divide-white/5">
                    {jMatches.map((m) => (
                      <MatchRow key={m.id} m={m} onEdit={openEdit}
                        onToggleSuspend={(id, status) => suspendMutation.mutate({ id, status })}
                        isPending={suspendMutation.isPending} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal: reprogramar partido ── */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="glass-panel border-white/10 bg-black/80 backdrop-blur-xl w-full max-w-[calc(100vw-32px)] sm:max-w-sm rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-xl font-bold">
              Reprogramar partido
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <p className="text-center text-sm text-white/40 -mt-2 mb-4">
              {editing.homeTeam.name} <span className="text-white/20">vs</span> {editing.awayTeam.name}
            </p>
          )}

          <div className="flex justify-center mb-6">
            <Input
              type="datetime-local"
              value={editDatetime}
              onChange={(e) => setEditDatetime(e.target.value)}
              className="glass-input w-auto h-14 px-4 text-sm sm:text-base font-bold"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setEditing(null)}
              className="flex-1 rounded-full h-12 border-white/20 text-white/50">
              Cancelar
            </Button>
            <Button
              onClick={() => editing && reschedMutation.mutate(editing.id)}
              disabled={!editDatetime || reschedMutation.isPending}
              className="flex-1 rounded-full h-12 bg-brand-orange hover:bg-brand-orange/80 text-white font-bold glow-orange"
            >
              {reschedMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
