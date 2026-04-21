import { Player } from "@/types/match.types";

export function StatMiniCard({
  player,
  pts,
  onClick,
}: {
  player: Player;
  pts?: number;
  onClick: () => void;
}) {
  const hasStats = pts !== undefined && pts > 0;
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-2.5 text-center cursor-pointer transition-all ${
        hasStats
          ? "bg-brand-orange/8 border-brand-orange/30 hover:bg-brand-orange/14"
          : "bg-black/30 border-white/6 hover:border-brand-orange/35 hover:bg-brand-orange/6"
      }`}
    >
      <div className="text-[10px] text-white/30 font-bold mb-1">
        #{player.number}
      </div>
      <div className="text-[12px] font-bold text-white/70 truncate">
        {player.lastName}
      </div>
      {hasStats && (
        <div className="text-brand-orange font-black text-sm mt-1 leading-none">{pts}</div>
      )}
    </div>
  );
}
