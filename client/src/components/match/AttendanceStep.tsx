import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { Player } from "@/types/match.types";
import { AttendanceCard } from "./AttendanceCard";

interface AttendanceStepProps {
  homePlayers: Player[];
  awayPlayers: Player[];
  homeTeamName: string;
  awayTeamName: string;
  attendanceTab: "home" | "away";
  setAttendanceTab: (tab: "home" | "away") => void;
  toggleAttendance: (team: "home" | "away", id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function AttendanceStep({
  homePlayers,
  awayPlayers,
  homeTeamName,
  awayTeamName,
  attendanceTab,
  setAttendanceTab,
  toggleAttendance,
  onBack,
  onNext,
}: AttendanceStepProps) {
  return (
    <div className="glass-panel p-5 sm:p-8 animate-in fade-in duration-300">
      <h3 className="text-lg font-display font-bold mb-5 border-b border-white/10 pb-4">
        Jugadores que asistieron al partido
      </h3>

      {/* Tabs — solo visible en móvil */}
      <div className="flex md:hidden rounded-2xl bg-white/5 border border-white/8 p-1 mb-5">
        <button
          onClick={() => setAttendanceTab("home")}
          className={`flex-1 h-10 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
            attendanceTab === "home"
              ? "bg-brand-orange text-white"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <Trophy className="w-3 h-3" />
          {homeTeamName}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            attendanceTab === "home" ? "bg-white/20" : "bg-white/8"
          }`}>
            {homePlayers.filter((p) => p.attended).length}/{homePlayers.length}
          </span>
        </button>
        <button
          onClick={() => setAttendanceTab("away")}
          className={`flex-1 h-10 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
            attendanceTab === "away"
              ? "bg-white/15 text-white"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <Trophy className="w-3 h-3" />
          {awayTeamName}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            attendanceTab === "away" ? "bg-white/20" : "bg-white/8"
          }`}>
            {awayPlayers.filter((p) => p.attended).length}/{awayPlayers.length}
          </span>
        </button>
      </div>

      {/* Grid desktop / panel activo en móvil */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className={attendanceTab === "home" ? "block" : "hidden md:block"}>
          <p className="text-xs text-brand-orange font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" />
            {homeTeamName} (local)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {homePlayers.map((p) => (
              <AttendanceCard
                key={p.id}
                player={p}
                onToggle={() => toggleAttendance("home", p.id)}
              />
            ))}
          </div>
        </div>
        <div className={attendanceTab === "away" ? "block" : "hidden md:block"}>
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" />
            {awayTeamName} (visitante)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {awayPlayers.map((p) => (
              <AttendanceCard
                key={p.id}
                player={p}
                onToggle={() => toggleAttendance("away", p.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {(() => {
        const MIN = 5;
        const homeCount = homePlayers.filter((p) => p.attended).length;
        const awayCount = awayPlayers.filter((p) => p.attended).length;
        const homeOk = homeCount >= MIN;
        const awayOk = awayCount >= MIN;
        const valid  = homeOk && awayOk;
        return (
          <>
            {!valid && (
              <p className="text-[11px] text-white/25 mt-4 text-center">
                {!homeOk && !awayOk
                  ? `Mínimo ${MIN} jugadores por equipo (reglamento FIBA)`
                  : !homeOk
                  ? `${homeTeamName}: ${homeCount}/${MIN} — faltan ${MIN - homeCount}`
                  : `${awayTeamName}: ${awayCount}/${MIN} — faltan ${MIN - awayCount}`}
              </p>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-4">
              <Button
                onClick={onBack}
                variant="outline"
                className="rounded-full h-12 border-white/20 text-white/50 sm:w-auto w-full"
              >
                ← Atrás
              </Button>
              <Button
                onClick={onNext}
                disabled={!valid}
                className="rounded-full h-12 bg-brand-orange hover:bg-brand-orange/80 text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed sm:w-auto w-full"
              >
                Confirmar asistencia →
              </Button>
            </div>
          </>
        );
      })()}
    </div>
  );
}
