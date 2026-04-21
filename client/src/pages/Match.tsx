import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Lock, Loader2 } from "lucide-react";
import { StepBar } from "@/components/match/StepBar";
import { OfficialStep } from "@/components/match/OfficialStep";
import { AttendanceStep } from "@/components/match/AttendanceStep";
import { ResultsStep } from "@/components/match/ResultsStep";
import { ActaStep } from "@/components/match/ActaStep";
import { PlayerStatsModal } from "@/components/match/PlayerStatsModal";
import { Step, Player, PlayerStats } from "@/types/match.types";
import { apiGet, apiPut } from "@/lib/apiClient";
import { sileo } from "sileo";

// ---------------------------------------------------------------------------
// Tipos de la API
// ---------------------------------------------------------------------------
interface ApiPlayer {
  id: string; name: string; lastName: string; number: string;
}
interface ApiMatch {
  id: string; jornada: number; status: string; actaUrl: string | null;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
}

function toPlayer(p: ApiPlayer): Player {
  return { id: p.id, name: p.name, lastName: p.lastName, number: p.number, eligible: true, attended: false };
}

// ---------------------------------------------------------------------------
// PÁGINA MESA TÉCNICA
// ---------------------------------------------------------------------------
export default function MatchPage() {
  const { id: matchId = "" } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  // ── Datos del partido ────────────────────────────────────────────────────
  const { data: match, isLoading: loadingMatch } = useQuery<ApiMatch>({
    queryKey: ["/api/matches", matchId],
    queryFn:  () => apiGet<ApiMatch>(`/api/matches/${matchId}`),
    enabled:  !!matchId,
  });

  const { data: homeApiPlayers = [], isLoading: loadingHome } = useQuery<ApiPlayer[]>({
    queryKey: ["/api/players", match?.homeTeam.id],
    queryFn:  () => apiGet<ApiPlayer[]>(`/api/players?teamId=${match!.homeTeam.id}`),
    enabled:  !!match?.homeTeam.id,
  });

  const { data: awayApiPlayers = [], isLoading: loadingAway } = useQuery<ApiPlayer[]>({
    queryKey: ["/api/players", match?.awayTeam.id],
    queryFn:  () => apiGet<ApiPlayer[]>(`/api/players?teamId=${match!.awayTeam.id}`),
    enabled:  !!match?.awayTeam.id,
  });

  const { data: config } = useQuery<{ rosterLockJornada: number }>({
    queryKey: ["/api/config"],
    queryFn:  () => apiGet<{ rosterLockJornada: number }>("/api/config"),
  });

  // ── Estado local ─────────────────────────────────────────────────────────
  const [step, setStep]                     = useState<Step>(0);
  const [refs, setRefs]                     = useState({ ref1: "", ref2: "", scorer: "" });
  const [homePlayers, setHomePlayers]       = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers]       = useState<Player[]>([]);
  const [playersReady, setPlayersReady]     = useState(false);
  const [attendanceTab, setAttendanceTab]   = useState<"home" | "away">("home");
  const [score, setScore]                   = useState({ home: "", away: "" });
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [statsMap, setStatsMap]             = useState<Record<string, PlayerStats>>({});
  const [tempStats, setTempStats]           = useState<PlayerStats>({ pts: 0, ast: 0, flt: 0 });

  // Inicializar lista de jugadores cuando llegan de la API (solo una vez)
  if (!playersReady && homeApiPlayers.length > 0 && awayApiPlayers.length > 0) {
    setHomePlayers(homeApiPlayers.map(toPlayer));
    setAwayPlayers(awayApiPlayers.map(toPlayer));
    setPlayersReady(true);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  const officialsMutation = useMutation({
    mutationFn: () => apiPut(`/api/matches/${matchId}/officials`, refs),
    onSuccess:  () => setStep(1),
    onError:    (e) => sileo.error({ title: "Error al guardar árbitros", description: (e as Error).message }),
  });

  const finishMutation = useMutation({
    mutationFn: () => {
      const statsPayload = [...homePlayers, ...awayPlayers].map((p) => ({
        playerId: p.id,
        attended: p.attended,
        ...(statsMap[p.id] ?? { pts: 0, ast: 0, flt: 0 }),
      }));
      return Promise.all([
        apiPut(`/api/matches/${matchId}`, {
          scoreHome: Number(score.home),
          scoreAway: Number(score.away),
          status: "finished",
        }),
        apiPut(`/api/matches/${matchId}/stats`, { stats: statsPayload }),
      ]);
    },
    onSuccess: () => {
      sileo.success({ title: "Partido finalizado", description: "Resultados y acta guardados correctamente" });
      navigate("/matches");
    },
    onError: (e) => sileo.error({ title: "Error al finalizar", description: (e as Error).message }),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleAttendance = (team: "home" | "away", id: string) => {
    const setter = team === "home" ? setHomePlayers : setAwayPlayers;
    setter((prev) => prev.map((p) => (p.id === id ? { ...p, attended: !p.attended } : p)));
  };

  const openStats = (player: Player) => {
    setSelectedPlayer(player);
    setTempStats(statsMap[player.id] ?? { pts: 0, ast: 0, flt: 0 });
  };

  const saveStats = () => {
    if (!selectedPlayer) return;
    setStatsMap((prev) => ({ ...prev, [selectedPlayer.id]: tempStats }));
    setSelectedPlayer(null);
  };

  // ── Loading / error states ────────────────────────────────────────────────
  const isLoading = loadingMatch || loadingHome || loadingAway;

  if (!matchId) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-white/40">No se especificó un partido.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16 flex items-center justify-center gap-3 text-white/40">
        <Loader2 className="w-5 h-5 animate-spin" />
        Cargando partido...
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-white/40">Partido no encontrado.</p>
      </div>
    );
  }

  if (match.status === "finished") {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-white/6 border border-white/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-white/25" />
        </div>
        <div>
          <p className="text-white font-bold text-lg mb-1">Partido finalizado</p>
          <p className="text-white/35 text-sm">
            {match.homeTeam.name} vs {match.awayTeam.name} — Jornada {match.jornada}
          </p>
        </div>
        <button
          onClick={() => navigate("/matches")}
          className="text-brand-orange text-sm font-bold hover:text-brand-orange/80 transition-colors"
        >
          ← Volver a partidos
        </button>
      </div>
    );
  }

  const attendedHome = homePlayers.filter((p) => p.attended);
  const attendedAway = awayPlayers.filter((p) => p.attended);
  const hasScore     = score.home !== "" && score.away !== "";
  const rosterLocked = match.jornada > (config?.rosterLockJornada ?? 4);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <SectionTitle whiteText="Mesa" orangeText="Técnica" className="mb-0" />
        <div className="glass-panel px-5 py-2.5 rounded-full! flex items-center gap-2.5">
          <span className="text-white/50 uppercase font-semibold text-xs tracking-wider">Jornada</span>
          <span className="text-xl font-bold font-display text-white">{match.jornada}</span>
        </div>
      </div>

      {rosterLocked && (
        <div className="mb-6 px-4 py-3 bg-brand-orange/10 border border-brand-orange/30 rounded-2xl flex items-center gap-3 text-brand-orange text-sm font-medium">
          <Lock className="w-4 h-4 flex-shrink-0" />
          Edición de roster bloqueada por reglamento (Jornada &gt; 4)
        </div>
      )}

      <StepBar current={step} />

      {step === 0 && (
        <OfficialStep
          refs={refs}
          setRefs={setRefs}
          onNext={() => officialsMutation.mutate()}
          loading={officialsMutation.isPending}
        />
      )}
      {step === 1 && (
        <AttendanceStep
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          homeTeamName={match.homeTeam.name}
          awayTeamName={match.awayTeam.name}
          attendanceTab={attendanceTab}
          setAttendanceTab={setAttendanceTab}
          toggleAttendance={toggleAttendance}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <ResultsStep
          score={score}
          setScore={setScore}
          homeTeamName={match.homeTeam.name}
          awayTeamName={match.awayTeam.name}
          attendedHome={attendedHome}
          attendedAway={attendedAway}
          hasScore={hasScore}
          openStats={openStats}
          statsMap={statsMap}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <ActaStep
          matchId={matchId}
          existingActaUrl={match.actaUrl ?? null}
          loading={finishMutation.isPending}
          onBack={() => setStep(2)}
          onFinish={() => finishMutation.mutate()}
        />
      )}

      <PlayerStatsModal
        player={selectedPlayer}
        tempStats={tempStats}
        setTempStats={setTempStats}
        onSave={saveStats}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}
