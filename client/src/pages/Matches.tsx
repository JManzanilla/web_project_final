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
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
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
      {/* Fila 1: equipos y marcador */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-sm font-bold truncate flex-1 min-w-0 ${isFinished ? "text-white/35" : "text-white"}`}>
          {match.homeTeam.name}
        </span>

        {isFinished ? (
          <span className="text-sm font-black text-white/40 flex-shrink-0 px-1 tabular-nums">
            {match.scoreHome} – {match.scoreAway}
          </span>
        ) : isLive ? (
          <span className="text-sm font-black text-brand-orange flex-shrink-0 px-1 tabular-nums">
            {match.scoreHome ?? 0} – {match.scoreAway ?? 0}
          </span>
        ) : (
          <span className="text-[11px] text-white/20 flex-shrink-0 px-1 font-bold">vs</span>
        )}

        <span className={`text-sm font-bold truncate flex-1 min-w-0 text-right ${isFinished ? "text-white/35" : "text-white"}`}>
          {match.awayTeam.name}
        </span>
      </div>

      {/* Fila 2: badge + fecha + icono */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${color}`}>
          {label}
        </span>
        <span className="text-[10px] text-white/25 font-semibold flex-1 min-w-0 truncate">
          {formatDate(match.scheduledAt)} · {formatTime(match.scheduledAt)}
        </span>
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {isFinished && match.actaUrl && (
            <a
              href={match.actaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-brand-orange/50 hover:text-brand-orange transition-colors"
              title="Ver acta"
            >
              <FileText className="w-4 h-4" />
            </a>
          )}
          {isFinished ? (
            <Lock className="w-4 h-4 text-white/15" />
          ) : (
            <ClipboardList className={`w-4 h-4 ${isLive ? "text-brand-orange" : "text-white/30"}`} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grupo de jornada colapsable
// ---------------------------------------------------------------------------
function JornadaGroup({ jornada, matches }: { jornada: number; matches: MatchItem[] }) {
  const hasLive     = matches.some((m) => m.status === "live");
  const allFinished = matches.every((m) => m.status === "finished");
  const [open, setOpen] = useState(!allFinished);

  return (
    <div>
      {/* Encabezado colapsable */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 mb-3 group"
      >
        <span className={`text-sm font-black uppercase tracking-wider transition-colors ${
          hasLive ? "text-brand-orange" : allFinished ? "text-white/20" : "text-white/60 group-hover:text-white/80"
        }`}>
          Jornada {jornada}
        </span>
        {hasLive && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-orange">
            En vivo
          </span>
        )}
        {allFinished && (
          <span className="text-[10px] text-white/15 font-semibold">Completada</span>
        )}
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-white/20 group-hover:text-white/40 transition-colors">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="space-y-2 mb-2">
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-brand-orange" />
        </div>
        <SectionTitle whiteText="Mesa" orangeText="Técnica" className="mb-0" />
      </div>

      {/* Leyenda */}
      <p className="text-[11px] text-white/25 mb-6 -mt-4">
        Selecciona un partido para abrir la hoja de anotación. Los partidos finalizados están bloqueados.
      </p>

      {isLoading ? (
        <div className="text-center text-white/30 py-12">Cargando partidos…</div>
      ) : sortedJornadas.length === 0 ? (
        <div className="text-center text-white/30 py-12">No hay partidos registrados.</div>
      ) : (
        <div className="space-y-6">
          {sortedJornadas.map((j) => (
            <JornadaGroup key={j} jornada={j} matches={byJornada[j]} />
          ))}
        </div>
      )}
    </div>
  );
}
