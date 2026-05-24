import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { FileText, ChevronRight, ChevronDown } from "lucide-react";
import { apiGet } from "@/lib/apiClient";

interface ApiPlayer {
  id: string; name: string; lastName: string; number: string; teamId: string;
}

interface ApiStat {
  playerId: string; attended: boolean; pts: number; flt: number;
  player: ApiPlayer;
}

interface TeamInfo { id: string; name: string; logoUrl?: string | null }

interface ApiMatch {
  id: string;
  jornada: number;
  scoreHome: number | null;
  scoreAway: number | null;
  scheduledAt: string;
  actaUrl: string | null;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  stats: ApiStat[];
}

interface JornadaGroup {
  numero: number;
  matches: ApiMatch[];
  reciente?: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}

function TeamLogo({ team, size = "md" }: { team: TeamInfo; size?: "sm" | "md" }) {
  const px = size === "sm" ? "w-7 h-7 sm:w-8 sm:h-8 text-[10px]" : "w-9 h-9 text-[11px]";
  return team.logoUrl ? (
    <img
      src={team.logoUrl}
      alt={team.name}
      className={`${px} rounded-lg object-cover flex-shrink-0 bg-white/5`}
    />
  ) : (
    <div className={`${px} rounded-lg bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0 text-base`}>
      🏀
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fila de jugador en la tabla de stats
// ---------------------------------------------------------------------------
function PlayerRow({ stat }: { stat: ApiStat }) {
  return (
    <div className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-black text-brand-orange/60 w-5 text-center flex-shrink-0">
        #{stat.player.number}
      </span>
      <span className="text-[11px] text-white/70 flex-1 truncate">
        {stat.player.lastName}
      </span>
      <span className="text-[12px] font-black text-brand-orange w-8 text-right flex-shrink-0">
        {stat.pts}
      </span>
      <span className="text-[10px] text-white/30 w-5 text-right flex-shrink-0">
        {stat.flt}f
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de partido — muestra top 5 anotadores de cada equipo directamente
// ---------------------------------------------------------------------------
function PartidoCard({ match }: { match: ApiMatch }) {
  const scoreA = match.scoreHome ?? 0;
  const scoreB = match.scoreAway ?? 0;
  const winA   = scoreA > scoreB;

  const homeStats = match.stats
    .filter((s) => s.attended && s.player.teamId === match.homeTeam.id && s.pts > 0)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 5);
  const awayStats = match.stats
    .filter((s) => s.attended && s.player.teamId === match.awayTeam.id && s.pts > 0)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 5);

  const hasStats = homeStats.length > 0 || awayStats.length > 0;

  return (
    <div className="bg-white/4 border border-white/8 rounded-[14px]">
      {/* Fecha */}
      <span className="block text-[10px] text-white/25 font-bold uppercase pt-3 text-center tracking-wider">
        {formatDate(match.scheduledAt)}
      </span>

      {/* Score */}
      <div className="flex items-center justify-center gap-3 px-4 pt-2 pb-2.5">
        <TeamLogo team={match.homeTeam} size="sm" />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[18px] font-black tabular-nums leading-none ${winA ? "text-brand-orange" : "text-white/25"}`}>{scoreA}</span>
          <span className="text-[12px] text-white/20 font-bold">–</span>
          <span className={`text-[18px] font-black tabular-nums leading-none ${!winA ? "text-brand-orange" : "text-white/25"}`}>{scoreB}</span>
        </div>

        <TeamLogo team={match.awayTeam} size="sm" />

        {match.actaUrl ? (
          <a href={match.actaUrl} target="_blank" rel="noopener noreferrer"
            title="Ver acta"
            className="w-8 h-8 rounded-xl bg-brand-orange/10 border border-brand-orange/30 flex items-center justify-center transition-all hover:bg-brand-orange/20 flex-shrink-0">
            <FileText className="w-3.5 h-3.5 text-brand-orange" />
          </a>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center opacity-35 flex-shrink-0">
            <FileText className="w-3.5 h-3.5 text-white/30" />
          </div>
        )}
      </div>

      {/* Top 5 anotadores — siempre visible si hay stats */}
      {hasStats && (
        <div className="px-4 pb-4">
          <div className="border-t border-white/8 pt-3 grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <p className="text-[9px] text-brand-orange/60 font-bold uppercase tracking-widest mb-2 truncate">
                {match.homeTeam.name}
              </p>
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[9px] text-white/20 w-5" />
                <span className="text-[9px] text-white/20 flex-1 uppercase tracking-wide">Jugador</span>
                <span className="text-[9px] text-white/20 w-8 text-right uppercase tracking-wide">Pts</span>
                <span className="text-[9px] text-white/20 w-5 text-right uppercase tracking-wide">F</span>
              </div>
              {homeStats.map((s) => <PlayerRow key={s.playerId} stat={s} />)}
            </div>

            <div>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-2 truncate">
                {match.awayTeam.name}
              </p>
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[9px] text-white/20 w-5" />
                <span className="text-[9px] text-white/20 flex-1 uppercase tracking-wide">Jugador</span>
                <span className="text-[9px] text-white/20 w-8 text-right uppercase tracking-wide">Pts</span>
                <span className="text-[9px] text-white/20 w-5 text-right uppercase tracking-wide">F</span>
              </div>
              {awayStats.map((s) => <PlayerRow key={s.playerId} stat={s} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bloque de jornada colapsable
// ---------------------------------------------------------------------------
function JornadaBlock({ jornada, isOpen, onToggle }: {
  jornada: JornadaGroup; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <div className="glass-panel overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-display font-black text-brand-orange text-lg">
            Jornada {jornada.numero}
          </span>
          {jornada.reciente && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-orange/15 text-brand-orange border border-brand-orange/25">
              Reciente
            </span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
            {jornada.matches.length} partido{jornada.matches.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="text-white/50">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-white/5 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-200">
          {jornada.matches.map((match) => (
            <PartidoCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PÁGINA
// ---------------------------------------------------------------------------
export default function HistoryPage() {
  const [openIndex, setOpenIndex] = useState<number>(-1);

  const { data: matches = [], isLoading } = useQuery<ApiMatch[]>({
    queryKey: ["/api/matches", { status: "finished" }],
    queryFn: () => apiGet<ApiMatch[]>("/api/matches?status=finished"),
  });

  const jornadas: JornadaGroup[] = React.useMemo(() => {
    const map = new Map<number, ApiMatch[]>();
    for (const m of matches) {
      if (!map.has(m.jornada)) map.set(m.jornada, []);
      map.get(m.jornada)!.push(m);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b - a)
      .map(([numero, ms], idx) => ({ numero, matches: ms, reciente: idx === 0 }));
  }, [matches]);

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <SectionTitle whiteText="Historial" orangeText="Jornadas" />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-3 rounded-full bg-brand-orange shadow-[0_0_10px_rgba(255,69,0,0.8)] flex-shrink-0" />
        <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
          Todos los partidos finalizados — toca una jornada para ver resultados
        </span>
      </div>

      {isLoading ? (
        <div className="text-center text-white/40 py-12">Cargando historial...</div>
      ) : jornadas.length === 0 ? (
        <div className="text-center text-white/30 py-12 border-2 border-dashed border-white/8 rounded-3xl">
          No hay partidos finalizados aún
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-3 items-start">
          {[jornadas.filter((_, i) => i % 2 === 0), jornadas.filter((_, i) => i % 2 !== 0)].map((col, ci) => (
            <div key={ci} className="flex-1 flex flex-col gap-3">
              {col.map((jornada) => {
                const index = jornadas.indexOf(jornada);
                return (
                  <JornadaBlock
                    key={jornada.numero}
                    jornada={jornada}
                    isOpen={openIndex === index}
                    onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
