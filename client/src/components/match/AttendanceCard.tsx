import { Player } from "@/types/match.types";

export function AttendanceCard({
  player,
  onToggle,
}: {
  player: Player;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-200 ${
        player.attended
          ? "bg-brand-orange/12 border border-brand-orange/35"
          : "bg-white/4 border border-white/8 hover:bg-white/7"
      }`}
    >
      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${
        player.attended ? "bg-brand-orange" : "border border-white/20"
      }`}>
        {player.attended && <span className="text-white text-[9px] font-black">✓</span>}
      </div>
      <span className="text-[11px] font-black text-brand-orange/80 w-5 text-center flex-shrink-0">
        {player.number}
      </span>
      <span className="text-[11px] font-semibold text-white/75 truncate">
        {player.lastName}
      </span>
    </div>
  );
}
