import { useQuery } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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

export default function StandingsPage() {
  const { data: standings = [], isLoading } = useQuery<StandingRow[]>({
    queryKey: ["/api/standings"],
    queryFn: () => apiGet<StandingRow[]>("/api/standings"),
  });

  const { data: scorers = [], isLoading: loadingScorers } = useQuery<ScorerRow[]>({
    queryKey: ["/api/standings/scorers"],
    queryFn: () => apiGet<ScorerRow[]>("/api/standings/scorers"),
  });

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <SectionTitle whiteText="Tabla de" orangeText="Clasificación" />

      {/* Legend */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 rounded-full bg-brand-orange shadow-[0_0_10px_rgba(255,69,0,0.8)] flex-shrink-0" />
        <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
          Zona de Semifinales — los primeros 4 clasifican
        </span>
      </div>

      {/* ── Tabla de posiciones ── */}
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
                    <TableHead className="text-white/60 font-display">EQUIPO</TableHead>
                    <TableHead className="text-center text-white/60 font-display">PTS</TableHead>
                    <TableHead className="text-center text-white/60 font-display">PJ</TableHead>
                    <TableHead className="text-center text-white/60 font-display">G</TableHead>
                    <TableHead className="text-center text-white/60 font-display">P</TableHead>
                    <TableHead className="text-center text-white/60 font-display">DIF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((row, idx) => {
                    const rank = idx + 1;
                    const isPlayoffZone = rank <= 4;
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
                        <TableCell className={`text-center font-semibold ${diff >= 0 ? "text-green-400/70" : "text-red-400/70"}`}>
                          {diff >= 0 ? `+${diff}` : diff}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {standings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-white/30 py-10">No hay partidos finalizados aún</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden p-3 space-y-2.5">
              {standings.map((row, idx) => {
                const rank = idx + 1;
                const isPlayoffZone = rank <= 4;
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

      {/* ── Canasteo individual ── */}
      <div className="mb-2 flex items-center gap-3">
        <h2 className="text-2xl font-extrabold tracking-tighter uppercase font-display leading-none">
          <span className="text-white">Canasteo</span>{" "}
          <span className="text-brand-orange">Individual</span>
        </h2>
      </div>
      <p className="text-[11px] text-white/30 mb-4 font-semibold uppercase tracking-wider">Puntos acumulados en el torneo</p>

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
                    <TableHead className="text-white/60 font-display">JUGADOR</TableHead>
                    <TableHead className="text-white/60 font-display">EQUIPO</TableHead>
                    <TableHead className="text-center text-white/60 font-display">PJ</TableHead>
                    <TableHead className="text-center text-brand-orange font-display">PTS</TableHead>
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
