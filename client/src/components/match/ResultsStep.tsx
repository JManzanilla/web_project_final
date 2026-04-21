import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TrendingUp } from "lucide-react";
import { Player } from "@/types/match.types";
import { StatMiniCard } from "./StatMiniCard";
import { sileo } from "sileo";

interface ResultsStepProps {
  score: { home: string; away: string };
  setScore: (score: { home: string; away: string }) => void;
  homeTeamName: string;
  awayTeamName: string;
  attendedHome: Player[];
  attendedAway: Player[];
  hasScore: boolean;
  openStats: (player: Player) => void;
  statsMap: Record<string, { pts: number; ast: number; flt: number }>;
  onBack: () => void;
  onNext: () => void;
}

export function ResultsStep({
  score,
  setScore,
  homeTeamName,
  awayTeamName,
  attendedHome,
  attendedAway,
  hasScore,
  openStats,
  statsMap,
  onBack,
  onNext,
}: ResultsStepProps) {
  const totalHome = Number(score.home) || 0;
  const totalAway = Number(score.away) || 0;

  const ptsHome = attendedHome.reduce((s, p) => s + (statsMap[p.id]?.pts ?? 0), 0);
  const ptsAway = attendedAway.reduce((s, p) => s + (statsMap[p.id]?.pts ?? 0), 0);

  const hasStats    = hasScore && (ptsHome > 0 || ptsAway > 0);
  const homeMatch   = !hasStats || ptsHome === totalHome;
  const awayMatch   = !hasStats || ptsAway === totalAway;
  const statsValid  = homeMatch && awayMatch;

  const canAdvance  = hasScore && statsValid;

  return (
    <div className="glass-panel p-5 sm:p-8 animate-in fade-in duration-300">
      <SectionTitle whiteText="Carga de" orangeText="Resultados" className="mb-6" />

      {/* Marcador */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 mb-6">
        <div className="text-center w-full md:w-1/3">
          <h4 className="text-lg font-display font-bold mb-3 text-white uppercase">{homeTeamName}</h4>
          <Input
            type="number"
            placeholder="0"
            value={score.home}
            onChange={(e) => setScore({ ...score, home: e.target.value })}
            className="glass-input h-14 sm:h-20 text-center text-2xl sm:text-4xl font-display font-black w-full"
          />
        </div>
        <div className="text-white/15 font-display font-bold text-3xl hidden md:block">—</div>
        <div className="text-center w-full md:w-1/3">
          <h4 className="text-lg font-display font-bold mb-3 text-white uppercase">{awayTeamName}</h4>
          <Input
            type="number"
            placeholder="0"
            value={score.away}
            onChange={(e) => setScore({ ...score, away: e.target.value })}
            className="glass-input h-14 sm:h-20 text-center text-2xl sm:text-4xl font-display font-black w-full"
          />
        </div>
      </div>

      {/* Stats individuales */}
      {hasScore && (
        <div className="bg-brand-orange/7 border border-brand-orange/20 rounded-2xl p-5 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-brand-orange" />
            <span className="text-[11px] text-brand-orange/80 font-bold uppercase tracking-wide">
              Toca a un jugador para capturar sus puntos
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Local */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{homeTeamName}</p>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                  ptsHome === totalHome ? "text-green-400 bg-green-500/10" : "text-white/30 bg-white/6"
                }`}>
                  {ptsHome} / {totalHome} pts
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {attendedHome.map((p) => (
                  <StatMiniCard key={p.id} player={p} pts={statsMap[p.id]?.pts} onClick={() => openStats(p)} />
                ))}
              </div>
            </div>

            {/* Separador vertical */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-white/8" />

            {/* Visitante */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{awayTeamName}</p>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                  ptsAway === totalAway ? "text-green-400 bg-green-500/10" : "text-white/30 bg-white/6"
                }`}>
                  {ptsAway} / {totalAway} pts
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {attendedAway.map((p) => (
                  <StatMiniCard key={p.id} player={p} pts={statsMap[p.id]?.pts} onClick={() => openStats(p)} />
                ))}
              </div>
            </div>
          </div>

          {/* hint sutil cuando hay desajuste */}
          {!statsValid && hasStats && (
            <p className="mt-3 text-[11px] text-red-400/60 text-center">
              Los puntos no coinciden con el marcador — rectifica antes de continuar.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-7">
        <Button
          onClick={onBack}
          variant="outline"
          className="rounded-full h-12 border-white/20 text-white/50 sm:w-auto w-full"
        >
          ← Atrás
        </Button>
        <Button
          onClick={() => {
            if (!hasScore) {
              sileo.warning({ title: "Falta el marcador", description: "Ingresa los puntos de ambos equipos" });
              return;
            }
            if (!statsValid) {
              const msgs: string[] = [];
              if (!homeMatch) msgs.push(`${homeTeamName}: ${ptsHome} pts registrados vs ${totalHome} en marcador`);
              if (!awayMatch) msgs.push(`${awayTeamName}: ${ptsAway} pts registrados vs ${totalAway} en marcador`);
              sileo.error({ title: "Puntos no coinciden", description: msgs.join(" · ") });
              return;
            }
            onNext();
          }}
          className="rounded-full h-12 bg-brand-orange hover:bg-brand-orange/80 text-white font-bold sm:w-auto w-full"
        >
          Guardar y continuar →
        </Button>
      </div>
    </div>
  );
}
