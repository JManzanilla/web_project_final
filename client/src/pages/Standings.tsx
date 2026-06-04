import { useQuery } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trophy, Swords } from "lucide-react";
import { apiGet } from "@/lib/apiClient";

interface StandingRow {
  teamId: string; name: string;
  pj: number; pg: number; pe: number; pp: number;
  pf: number; pc: number; pts: number;
}

interface ScorerRow {
  playerId: string; name: string; lastName: string; number: string;
  teamName: string; pts: number; ast: number; flt: number; pj: number;
}

interface PlayoffGame {
  id: string; seriesGame: number | null; status: string;
  scoreHome: number | null; scoreAway: number | null; scheduledAt: string;
}

interface PlayoffSeries {
  team1: { id: string; name: string };
  team2: { id: string; name: string };
  wins: [number, number];
  seriesLength: number;
  games: PlayoffGame[];
  winnerId: string | null;
}

interface PlayoffData {
  status: string;
  sf1: PlayoffSeries | null;
  sf2: PlayoffSeries | null;
  final: PlayoffSeries | null;
}

// ── Tarjeta de serie para el bracket ─────────────────────────────────────────
function BracketCard({ label, subtitle, series, highlight }: {
  label: string; subtitle?: string;
  series: PlayoffSeries | null; highlight?: boolean;
}) {
  const winner = series?.winnerId
    ? (series.winnerId === series.team1.id ? series.team1 : series.team2)
    : null;

  return (
    <div className={`glass-panel rounded-2xl overflow-hidden w-full ${
      highlight
        ? "border-brand-orange/40 shadow-[0_0_30px_rgba(255,69,0,0.18)]"
        : "border-white/12"
    }`}>
      {/* Header */}
      <div className={`px-4 py-2.5 border-b flex flex-col items-center gap-1 ${highlight ? "border-brand-orange/20 bg-brand-orange/8" : "border-white/8"}`}>
        <span className={`text-[11px] font-black uppercase tracking-widest whitespace-nowrap ${highlight ? "text-brand-orange" : "text-white/50"}`}>{label}</span>
        {subtitle && <span className="text-[10px] text-white/25">{subtitle}</span>}
        {winner && (
          <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">
            🏆 {winner.name}
          </span>
        )}
      </div>

      {series ? (
        <div className="p-4">
          {/* Equipos + marcador de serie */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className={`flex-1 text-center transition-opacity ${series.winnerId && series.winnerId !== series.team1.id ? "opacity-35" : ""}`}>
              <p className="font-black text-sm text-white truncate">{series.team1.name}</p>
            </div>
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-black font-display ${series.wins[0] > series.wins[1] ? "text-brand-orange" : "text-white/40"}`}>{series.wins[0]}</span>
                <span className="text-white/20 text-sm">-</span>
                <span className={`text-2xl font-black font-display ${series.wins[1] > series.wins[0] ? "text-brand-orange" : "text-white/40"}`}>{series.wins[1]}</span>
              </div>
              {series.seriesLength === 3 && (
                <span className="text-[9px] text-white/20 mt-0.5">mejor de 3</span>
              )}
            </div>
            <div className={`flex-1 text-center transition-opacity ${series.winnerId && series.winnerId !== series.team2.id ? "opacity-35" : ""}`}>
              <p className="font-black text-sm text-white truncate">{series.team2.name}</p>
            </div>
          </div>

          {/* Juegos */}
          {series.games.length > 0 && (
            <div className="border-t border-white/5 pt-2 space-y-1">
              {series.games.map((g, i) => (
                <div key={g.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-white/25">Juego {g.seriesGame ?? i + 1}</span>
                  {g.status === "finished" && g.scoreHome !== null ? (
                    <span className="font-bold text-white/60">{g.scoreHome} – {g.scoreAway}</span>
                  ) : g.status === "live" ? (
                    <span className="text-brand-orange font-bold animate-pulse">🔴 En vivo</span>
                  ) : (
                    <span className="text-white/20">Próximo</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-white/20 text-sm">Por definirse</p>
          <p className="text-white/12 text-[10px] mt-1">Pendiente resultado de semis</p>
        </div>
      )}
    </div>
  );
}

// ── Bracket tipo fixture ──────────────────────────────────────────────────────
function PlayoffBracket({ playoffs }: { playoffs: PlayoffData }) {
  return (
    <>
      {/* Desktop: SF1 — Trofeo+Final — SF2 */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex-1">
          <BracketCard label="Semifinal 1" subtitle="1° vs 4°" series={playoffs.sf1} />
        </div>

        {/* Conector izquierdo */}
        <div className="w-10 flex-shrink-0 h-0.5 bg-gradient-to-r from-white/10 to-brand-orange/40" />

        {/* Centro: trofeo + final */}
        <div className="flex flex-col items-center gap-4 w-56 flex-shrink-0">
          <Trophy className="w-14 h-14 text-brand-orange drop-shadow-[0_0_24px_rgba(255,69,0,0.7)]" />
          <BracketCard label="Gran Final" series={playoffs.final} highlight />
        </div>

        {/* Conector derecho */}
        <div className="w-10 flex-shrink-0 h-0.5 bg-gradient-to-l from-white/10 to-brand-orange/40" />

        <div className="flex-1">
          <BracketCard label="Semifinal 2" subtitle="2° vs 3°" series={playoffs.sf2} />
        </div>
      </div>

      {/* Mobile: semis arriba, trofeo + final abajo */}
      <div className="md:hidden space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <BracketCard label="Semifinal 1" subtitle="1° vs 4°" series={playoffs.sf1} />
          <BracketCard label="Semifinal 2" subtitle="2° vs 3°" series={playoffs.sf2} />
        </div>
        <div className="flex items-center gap-2 px-4">
          <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent to-brand-orange/40" />
          <Trophy className="w-8 h-8 text-brand-orange drop-shadow-[0_0_16px_rgba(255,69,0,0.6)] flex-shrink-0" />
          <div className="flex-1 h-0.5 bg-gradient-to-l from-transparent to-brand-orange/40" />
        </div>
        <BracketCard label="Gran Final" series={playoffs.final} highlight />
      </div>
    </>
  );
}

export default function StandingsPage() {
  const { data: standings = [], isLoading } = useQuery<StandingRow[]>({
    queryKey: ["/api/standings"],
    queryFn: () => apiGet<StandingRow[]>("/api/standings"),
  });

  const { data: scorers = [], isLoading: loadingScorers } = useQuery<ScorerRow[]>({
    queryKey: ["/api/standings/scorers"],
    queryFn: () => apiGet<ScorerRow[]>("/api/standings/scorers"),
  });

  const { data: playoffs } = useQuery<PlayoffData>({
    queryKey: ["/api/playoffs"],
    queryFn: () => apiGet<PlayoffData>("/api/playoffs"),
    refetchInterval: 30_000,
  });

  const allRegularDone = playoffs?.status === "regular_done" || playoffs?.status === "playoffs_in_progress";
  const playoffsActive = playoffs?.status === "playoffs_in_progress";
  const champion = playoffs?.final?.winnerId
    ? (playoffs.final.winnerId === playoffs.final.team1?.id ? playoffs.final.team1 : playoffs.final.team2)
    : null;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <SectionTitle whiteText="Tabla de" orangeText="Clasificación" />

      {/* ── Banner campeón ── */}
      {champion && (
        <div className="mb-8 glass-panel p-6 border-brand-orange/40 bg-brand-orange/8 text-center animate-in fade-in duration-500">
          <Trophy className="w-10 h-10 text-brand-orange mx-auto mb-2" />
          <p className="text-[11px] text-brand-orange/70 uppercase tracking-widest font-bold mb-1">Campeón del torneo</p>
          <p className="text-3xl font-black font-display text-white">{champion.name}</p>
        </div>
      )}

      {/* ── Bracket de playoffs ── */}
      {allRegularDone && playoffs && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Swords className="w-4 h-4 text-brand-orange" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange">Fase Eliminatoria</span>
          </div>
          <PlayoffBracket playoffs={playoffs} />
          {!playoffsActive && (
            <p className="text-[11px] text-white/30 text-center mt-4">
              Fase regular terminada · El administrador generará los partidos de playoffs próximamente
            </p>
          )}
        </div>
      )}

      {/* ── Tabla de posiciones — solo durante fase regular ── */}
      {!allRegularDone && !champion && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-brand-orange shadow-[0_0_10px_rgba(255,69,0,0.8)] flex-shrink-0" />
            <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
              Zona de Semifinales — los primeros {Math.min(4, standings.length)} clasifican
            </span>
          </div>

          <div className="glass-panel overflow-hidden mb-10">
            {isLoading ? (
              <div className="text-center text-white/40 py-12">Cargando clasificación...</div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/10 hover:bg-transparent">
                        <TableHead className="w-16 text-center text-white/60 font-display">POS</TableHead>
                        <TableHead className="text-brand-orange font-display">EQUIPO</TableHead>
                        <TableHead className="text-center text-white/60 font-display">PTS</TableHead>
                        <TableHead className="text-center text-white/60 font-display">PJ</TableHead>
                        <TableHead className="text-center text-white/60 font-display">G</TableHead>
                        <TableHead className="text-center text-white/60 font-display">P</TableHead>
                        <TableHead className="text-center text-green-400/60 font-display">CF</TableHead>
                        <TableHead className="text-center text-red-400/60 font-display">CE</TableHead>
                        <TableHead className="text-center text-white/60 font-display">DIF</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.map((row, idx) => {
                        const rank = idx + 1;
                        const isPlayoffZone = rank <= Math.min(4, standings.length);
                        const diff = row.pf - row.pc;
                        return (
                          <TableRow key={row.teamId} className={`border-b border-white/5 transition-all ${isPlayoffZone ? "bg-brand-orange/5 hover:bg-brand-orange/10" : "hover:bg-white/5"}`}>
                            <TableCell className="py-4">
                              <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center font-bold font-display ${isPlayoffZone ? "bg-brand-orange text-white glow-orange" : "bg-white/10 text-white/60"}`}>
                                {rank}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`font-bold text-base ${isPlayoffZone ? "text-white" : "text-white/70"}`}>{row.name}</span>
                            </TableCell>
                            <TableCell className="text-center font-display font-bold text-xl text-white">{row.pts}</TableCell>
                            <TableCell className="text-center text-white/60 font-semibold">{row.pj}</TableCell>
                            <TableCell className="text-center text-green-400 font-semibold">{row.pg}</TableCell>
                            <TableCell className="text-center text-red-400 font-semibold">{row.pp}</TableCell>
                            <TableCell className="text-center text-green-400/80 font-semibold">{row.pf}</TableCell>
                            <TableCell className="text-center text-red-400/80 font-semibold">{row.pc}</TableCell>
                            <TableCell className={`text-center font-semibold ${diff >= 0 ? "text-green-400/70" : "text-red-400/70"}`}>
                              {diff >= 0 ? `+${diff}` : diff}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {standings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-white/30 py-10">No hay partidos finalizados aún</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile */}
                <div className="md:hidden p-3 space-y-2.5">
                  {standings.map((row, idx) => {
                    const rank = idx + 1;
                    const isPlayoffZone = rank <= Math.min(4, standings.length);
                    const diff = row.pf - row.pc;
                    return (
                      <div key={`mobile-${row.teamId}`} className={`rounded-2xl border p-3 ${isPlayoffZone ? "bg-brand-orange/8 border-brand-orange/25" : "bg-white/4 border-white/8"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isPlayoffZone ? "bg-brand-orange text-white" : "bg-white/10 text-white/70"}`}>{rank}</div>
                            <p className="font-bold text-sm truncate">{row.name}</p>
                          </div>
                          <p className="text-lg font-black text-white">{row.pts}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-lg bg-black/30 p-2 text-center">
                            <p className="text-white/30 uppercase font-bold text-[10px]">Ganados</p>
                            <p className="text-green-400 font-bold">{row.pg}</p>
                          </div>
                          <div className="rounded-lg bg-black/30 p-2 text-center">
                            <p className="text-white/30 uppercase font-bold text-[10px]">Perdidos</p>
                            <p className="text-red-400 font-bold">{row.pp}</p>
                          </div>
                          <div className="rounded-lg bg-black/30 p-2 text-center">
                            <p className="text-white/30 uppercase font-bold text-[10px]">DIF</p>
                            <p className={`font-bold ${diff >= 0 ? "text-green-400/80" : "text-red-400/80"}`}>{diff >= 0 ? `+${diff}` : diff}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {standings.length === 0 && (
                    <p className="text-center text-white/30 py-8">No hay partidos finalizados aún</p>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}


      {/* ── Canasteo individual ── */}
      <SectionTitle whiteText="Canasteo" orangeText="Individual" />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 rounded-full bg-brand-orange shadow-[0_0_10px_rgba(255,69,0,0.8)] flex-shrink-0" />
        <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
          Puntos acumulados en fase regular
        </span>
      </div>

      <div className="glass-panel overflow-hidden">
        {loadingScorers ? (
          <div className="text-center text-white/40 py-10">Cargando estadísticas...</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/10 hover:bg-transparent">
                    <TableHead className="w-14 text-center text-white/60 font-display">#</TableHead>
                    <TableHead className="text-brand-orange font-display">JUGADOR</TableHead>
                    <TableHead className="text-white/60 font-display">EQUIPO</TableHead>
                    <TableHead className="text-center text-white/60 font-display">PJ</TableHead>
                    <TableHead className="text-center text-white/60 font-display">PTS</TableHead>
                    <TableHead className="text-center text-white/60 font-display">FLT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scorers.map((row, idx) => (
                    <TableRow key={row.playerId} className="border-b border-white/5 hover:bg-white/4 transition-all">
                      <TableCell className="text-center text-white/40 font-bold">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-brand-orange/70 w-5 text-center">#{row.number}</span>
                          <span className="font-bold text-white text-sm">{row.lastName} {row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/50 text-sm">{row.teamName}</TableCell>
                      <TableCell className="text-center text-white/50 font-semibold">{row.pj}</TableCell>
                      <TableCell className="text-center font-display font-black text-xl text-brand-orange">{row.pts}</TableCell>
                      <TableCell className="text-center text-white/50 font-semibold">{row.flt}</TableCell>
                    </TableRow>
                  ))}
                  {scorers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-white/30 py-10">No hay estadísticas registradas aún</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden p-3 space-y-2">
              {scorers.map((row, idx) => (
                <div key={`scorer-m-${row.playerId}`} className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-3 py-2.5">
                  <span className="text-[11px] text-white/25 font-bold w-5 text-center">{idx + 1}</span>
                  <span className="text-[11px] font-black text-brand-orange/60 w-6 text-center">#{row.number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[13px] text-white truncate">{row.lastName} {row.name}</p>
                    <p className="text-[10px] text-white/35 truncate">{row.teamName}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-brand-orange font-black text-lg leading-none">{row.pts}</p>
                      <p className="text-[9px] text-white/25 uppercase font-bold">pts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/50 font-bold text-sm leading-none">{row.flt}</p>
                      <p className="text-[9px] text-white/25 uppercase font-bold">flt</p>
                    </div>
                  </div>
                </div>
              ))}
              {scorers.length === 0 && (
                <p className="text-center text-white/30 py-8">No hay estadísticas registradas aún</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
