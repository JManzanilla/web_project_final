import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { apiGet } from "@/lib/apiClient";
import { ClipboardList, Lock, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type MatchStatus = "upcoming" | "live" | "finished" | "suspended";

interface MatchItem {
  id: string;
  jornada: number;
  scheduledAt: string;
  status: MatchStatus;
  scoreHome: number | null;
  scoreAway: number | null;
  homeTeam: { id: string; name: string; logoUrl: string | null };
  awayTeam: { id: string; name: string; logoUrl: string | null };
  actaUrl: string | null;
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const STATUS_CONFIG: Record<MatchStatus, { label: string; color: string }> = {
  upcoming:  { label: "Pendiente",  color: "bg-white/6 border-white/10 text-white/40" },
  live:      { label: "En vivo",    color: "bg-brand-orange/20 border-brand-orange/40 text-brand-orange" },
  finished:  { label: "Finalizado", color: "bg-white/4 border-white/8 text-white/20" },
  suspended: { label: "Suspendido", color: "bg-red-500/10 border-red-500/20 text-red-400/60" },
};

// ---------------------------------------------------------------------------
// Tarjeta de partido
// ---------------------------------------------------------------------------
function MatchCard({ match }: { match: MatchItem }) {
  const [, navigate] = useLocation();
  const isFinished  = match.status === "finished";
  const isLive      = match.status === "live";
  const { label, color } = STATUS_CONFIG[match.status];

  const handleOpen = () => {
    if (!isFinished) navigate(`/match/${match.id}`);
  };

  return (
    <div
      className={[
        "glass-panel px-4 py-3 rounded-2xl transition-all duration-200",
        isLive ? "border border-brand-orange/25 shadow-[0_0_20px_rgba(251,146,60,0.10)]" : "",
        isFinished ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-white/8 hover:border-white/15",
      ].join(" ")}
      onClick={handleOpen}
    >
      {/* Grid 3 col: local | centro | visitante */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 mb-0">
        <span className={`text-sm font-bold truncate text-right ${isFinished ? "text-white/40" : "text-white"}`}>
          {match.homeTeam.name}
        </span>

        <div className="flex flex-col items-center gap-1 px-2">
          {isFinished ? (
            <span className="text-sm font-black text-white/50 tabular-nums">{match.scoreHome} – {match.scoreAway}</span>
          ) : isLive ? (
            <span className="text-sm font-black text-brand-orange tabular-nums">{match.scoreHome ?? 0} – {match.scoreAway ?? 0}</span>
          ) : (
            <span className="text-[11px] text-white/40 font-bold">vs</span>
          )}
          <div className="flex flex-col items-center gap-0.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
            <span className="text-[9px] text-white/50 font-semibold whitespace-nowrap">
              {formatDate(match.scheduledAt)} · {formatTime(match.scheduledAt)}
            </span>
          </div>
        </div>

        <span className={`text-sm font-bold truncate ${isFinished ? "text-white/40" : "text-white"}`}>
          {match.awayTeam.name}
        </span>
      </div>

      {/* Acciones: acta + icono */}
      {(isFinished || isLive) && (
        <div className="flex justify-center gap-2 mt-2 pt-2 border-t border-white/5">
          {isFinished && match.actaUrl && (
            <a href={match.actaUrl} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-brand-orange/50 hover:text-brand-orange transition-colors" title="Ver acta">
              <FileText className="w-4 h-4" />
            </a>
          )}
          {isFinished
            ? <Lock className="w-4 h-4 text-white/20" />
            : <ClipboardList className="w-4 h-4 text-brand-orange" />
          }
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grupo de jornada colapsable
// ---------------------------------------------------------------------------
function JornadaGroup({ jornada, matches }: { jornada: number; matches: MatchItem[] }) {
  const hasLive     = matches.some((m) => m.status === "live");
  const allFinished = matches.every((m) => m.status === "finished");
  const pending     = matches.filter((m) => m.status === "upcoming").length;
  const [open, setOpen] = useState(!allFinished);

  return (
    <div className="glass-panel overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
        <div className="flex items-center gap-3">
          <span className={`font-display font-black text-lg ${hasLive ? "text-brand-orange" : allFinished ? "text-white/40" : "text-brand-orange"}`}>
            Jornada {jornada}
          </span>
          {hasLive && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-orange">
              En vivo
            </span>
          )}
          {pending > 0 && !hasLive && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
              {pending} pendiente{pending !== 1 ? "s" : ""}
            </span>
          )}
          {allFinished && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/40 border border-white/10">
              Completada
            </span>
          )}
        </div>
        <div className="text-white/50">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/5 p-3 grid grid-cols-1 gap-2">
          {matches
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function MatchesPage() {
  const { data: matches = [], isLoading } = useQuery<MatchItem[]>({
    queryKey: ["/api/matches"],
    queryFn:  () => apiGet<MatchItem[]>("/api/matches"),
  });

  const byJornada = matches.reduce<Record<number, MatchItem[]>>((acc, m) => {
    (acc[m.jornada] ??= []).push(m);
    return acc;
  }, {});

  const sortedJornadas = Object.keys(byJornada).map(Number).sort((a, b) => a - b);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <SectionTitle whiteText="Mesa" orangeText="Técnica" />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-3 rounded-full bg-brand-orange shadow-[0_0_10px_rgba(255,69,0,0.8)] flex-shrink-0" />
        <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
          Selecciona un partido para abrir la hoja de anotación
        </span>
      </div>

      {isLoading ? (
        <div className="text-center text-white/30 py-12">Cargando partidos…</div>
      ) : sortedJornadas.length === 0 ? (
        <div className="text-center text-white/30 py-12">No hay partidos registrados.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {sortedJornadas.map((j) => (
            <JornadaGroup key={j} jornada={j} matches={byJornada[j]} />
          ))}
        </div>
      )}
    </div>
  );
}
