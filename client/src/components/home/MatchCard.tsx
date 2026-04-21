import { Match, MatchStatus, getWinner } from "@/types/carousel.types";
import { TeamLogo } from "./TeamLogo";
import { sileo } from "sileo";

export function MatchCard({
  match,
  status,
  onHoverChange,
  onClick,
  selected,
}: {
  match: Match;
  status: MatchStatus;
  onHoverChange: (val: boolean) => void;
  onClick: () => void;
  selected: boolean;
}) {
  const dayLabel = match.dayLabel;
  const isClickable = true;

  const handleClick = () => {
    if (status === "upcoming") {
      sileo.info({
        title: "Partido próximo",
        description: `${match.teamA} vs ${match.teamB} se jugará el ${match.dayLabel} a las ${match.time}. ¡Vuelve cuando inicie!`,
      });
      return;
    }
    onClick();
  };
  const winner = getWinner(match);

  return (
    <div
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onClick={handleClick}
      className={[
        "min-w-[min(252px,calc(100vw-68px))] rounded-[20px] p-[18px] flex-shrink-0 select-none transition-all duration-200",
        selected
          ? status === "live"
            ? "bg-brand-orange/36 border-2 border-brand-orange cursor-pointer scale-[1.03] shadow-[0_0_30px_rgba(255,69,0,0.35)] ring-1 ring-brand-orange/40"
            : status === "finished"
              ? "bg-white/24 border-2 border-white/35 cursor-pointer scale-[1.03] shadow-[0_0_22px_rgba(255,255,255,0.16)] ring-1 ring-white/20"
              : "bg-white/18 border-2 border-white/25 cursor-pointer scale-[1.02]"
          : status === "live"
            ? "bg-brand-orange/12 border border-brand-orange/70 cursor-pointer hover:scale-[1.02] hover:border-brand-orange"
            : status === "finished"
              ? "bg-white/10 border border-white/25 cursor-pointer hover:scale-[1.02] hover:bg-white/12 hover:border-white/35"
              : "bg-white/8 border border-white/20 cursor-pointer hover:scale-[1.02] hover:bg-white/10",
      ].join(" ")}
    >
      {/* Badge */}
      <div className="mb-2">
        {status === "live" && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full bg-brand-orange text-white tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            EN VIVO
          </span>
        )}
        {status === "finished" && (
          <span className="inline-flex items-center text-[10px] font-semibold px-3 py-1 rounded-full bg-white/6 text-white/30 tracking-wide">
            Finalizado
          </span>
        )}
        {status === "upcoming" && (
          <span className="inline-flex items-center text-[10px] font-semibold px-3 py-1 rounded-full bg-white/5 text-white/25 tracking-wide">
            {dayLabel}
          </span>
        )}
      </div>

      {/* Equipos */}
      <div className="flex items-center justify-between gap-2">
        {/* Equipo A */}
        <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
          <TeamLogo name={match.teamA} dimmed={status === "finished" || status === "upcoming"} />
          <span className={`text-[11px] font-semibold ${status === "upcoming" ? "text-white/50" : status === "finished" ? "text-white/55" : "text-white/80"}`}>
            {match.teamA}
          </span>
        </div>

        {/* Marcador / VS */}
        <div className="flex flex-col items-center gap-1">
          {status === "live" && (
            <span className="text-2xl font-bold text-brand-orange tracking-tight leading-none">
              {match.scoreA} - {match.scoreB}
            </span>
          )}
          {status === "finished" && (
            <>
              <div className="flex items-center gap-1.5 leading-none">
                <span className={`text-2xl font-semibold tracking-tight ${winner === match.teamA ? "text-brand-orange" : "text-white/35"}`}>
                  {match.scoreA}
                </span>
                <span className="text-[11px] text-white/20">-</span>
                <span className={`text-2xl font-semibold tracking-tight ${winner === match.teamB ? "text-brand-orange" : "text-white/35"}`}>
                  {match.scoreB}
                </span>
              </div>
              {winner && (
                <span className="text-[9px] text-white/30 bg-white/6 px-2 py-0.5 rounded-full whitespace-nowrap">
                  🏆 {winner}
                </span>
              )}
            </>
          )}
          {status === "upcoming" && (
            <>
              <span className="text-[14px] text-white/15 font-semibold">VS</span>
              <span className="text-[10px] text-white/20">{match.time}</span>
            </>
          )}
        </div>

        {/* Equipo B */}
        <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
          <TeamLogo name={match.teamB} dimmed={status === "finished" || status === "upcoming"} />
          <span className={`text-[11px] font-semibold ${status === "upcoming" ? "text-white/50" : status === "finished" ? "text-white/55" : "text-white/80"}`}>
            {match.teamB}
          </span>
        </div>
      </div>
    </div>
  );
}
