import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Player, PlayerStats } from "@/types/match.types";

interface PlayerStatsModalProps {
  player: Player | null;
  tempStats: PlayerStats;
  setTempStats: (stats: PlayerStats) => void;
  onSave: () => void;
  onClose: () => void;
}

export function PlayerStatsModal({
  player,
  tempStats,
  setTempStats,
  onSave,
  onClose,
}: PlayerStatsModalProps) {
  return (
    <Dialog open={!!player} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-white/10 bg-black/80 backdrop-blur-xl max-w-xs rounded-3xl p-8">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-xl font-black uppercase">
            {player?.name} {player?.lastName}{" "}
            <span className="text-brand-orange ml-1">#{player?.number}</span>
          </DialogTitle>
        </DialogHeader>

        {player?.eligible && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-brand-orange font-bold uppercase tracking-wider -mt-1 mb-2">
            <CheckCircle2 size={12} />
            Indicador 40% + 1
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 py-4">
          <div className="space-y-2 text-center">
            <label className="text-[10px] uppercase font-bold text-white/35 tracking-widest">
              Puntos
            </label>
            <Input
              type="number"
              min={0}
              value={tempStats.pts}
              onChange={(e) => setTempStats({ ...tempStats, pts: Number(e.target.value) })}
              className="glass-input h-14 text-center text-2xl font-display font-black"
            />
          </div>
          <div className="space-y-2 text-center">
            <label className="text-[10px] uppercase font-bold text-white/35 tracking-widest">
              Faltas
            </label>
            <Input
              type="number"
              min={0}
              max={5}
              value={tempStats.flt}
              onChange={(e) => setTempStats({ ...tempStats, flt: Number(e.target.value) })}
              className="glass-input h-14 text-center text-2xl font-display font-black"
            />
          </div>
        </div>

        <Button
          onClick={onSave}
          className="w-full rounded-full h-13 bg-brand-orange hover:bg-brand-orange/80 text-white font-bold text-base glow-orange"
        >
          Guardar Estadísticas
        </Button>
      </DialogContent>
    </Dialog>
  );
}
