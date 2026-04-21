import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings2, Calendar, Clock, Check, AlertTriangle,
  Shuffle, ChevronDown, ChevronUp, Plus, Minus, Pencil, Lock,
  Trash2, TriangleAlert, UserPlus, ShieldCheck,
} from "lucide-react";
import { apiGet, apiPut, apiPost, apiDelete } from "@/lib/apiClient";
import { sileo } from "sileo";

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------
interface TournamentConfig {
  id: string; name: string; format: "liga" | "eliminacion";
  vueltas: number; totalTeams: number;
  rosterLockJornada: number;
  transferWindowJornada: number | null;
}

interface Team { id: string; name: string; }

interface GenerateResult {
  jornadasCreadas: number; partidosCreados: number;
  resumen: { jornada: number; fecha: string; fechaFin: string; partidos: number }[];
}

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------
function getRoundRobinInfo(n: number, vueltas: number) {
  const baseRounds = n % 2 === 0 ? n - 1 : n;
  const totalRounds = baseRounds * vueltas;
  const totalGames  = Math.floor(n / 2) * totalRounds;
  return { totalRounds, totalGames };
}

// ---------------------------------------------------------------------------
// CONFIG PAGE
// ---------------------------------------------------------------------------
export default function ConfigPage() {
  const qc = useQueryClient();

  const { data: config } = useQuery<TournamentConfig>({
    queryKey: ["/api/config"],
    queryFn:  () => apiGet<TournamentConfig>("/api/config"),
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn:  () => apiGet<Team[]>("/api/teams"),
  });

  const { data: upcomingMatches = [] } = useQuery<{ id: string }[]>({
    queryKey: ["/api/matches", "upcoming"],
    queryFn:  () => apiGet<{ id: string }[]>("/api/matches?status=upcoming"),
  });
  const hasExistingCalendar = upcomingMatches.length > 0;

  // ── Estado ─────────────────────────────────────────────────────────────────
  const [totalTeams,      setTotalTeams]      = useState(8);
  const [vueltas,         setVueltas]         = useState(1);
  const [startDate,       setStartDate]       = useState("");
  // playDays: 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb
  const [playDays,        setPlayDays]        = useState<number[]>([2, 4]); // Mar+Jue por defecto
  const [matchesPerDay,   setMatchesPerDay]   = useState(2);
  const [scheduleMode,    setScheduleMode]    = useState<"seguidos" | "personalizado">("seguidos");
  const [startTime,       setStartTime]       = useState("10:00");
  const [gapMinutes,      setGapMinutes]      = useState(120);
  const [customTimes,     setCustomTimes]     = useState<string[]>(["10:00", "12:00"]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [resumen,         setResumen]         = useState<GenerateResult | null>(null);
  const [showResumen,     setShowResumen]     = useState(false);

  // Popup editar nombre de equipo
  const [editSlot,  setEditSlot]  = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving,    setSaving]    = useState(false);

  // Panel "Integrar equipo al torneo activo"
  const [suppOpen,        setSuppOpen]        = useState(false);
  const [suppNewIds,      setSuppNewIds]      = useState<string[]>([]);
  const [suppFromJornada, setSuppFromJornada] = useState(2);

  const [rosterLockJornada,     setRosterLockJornada]     = useState(4);
  const [transferWindowEnabled, setTransferWindowEnabled] = useState(false);
  const [transferWindowJornada, setTransferWindowJornada] = useState(8);

  // Sync config
  useEffect(() => {
    if (config) {
      setVueltas(config.vueltas);
      setTotalTeams(config.totalTeams);
      setRosterLockJornada(config.rosterLockJornada ?? 4);
      setTransferWindowEnabled(config.transferWindowJornada !== null);
      setTransferWindowJornada(config.transferWindowJornada ?? 8);
    }
  }, [config]);

  // ── Auto-guardado de config ────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      apiPut("/api/config", {
        vueltas,
        totalTeams,
        rosterLockJornada,
        transferWindowJornada: transferWindowEnabled ? transferWindowJornada : null,
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [vueltas, totalTeams, rosterLockJornada, transferWindowEnabled, transferWindowJornada]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: () => {
      const isCustom = scheduleMode === "personalizado";
      const [sh, sm] = startTime.split(":").map(Number);
      const endMin   = sh * 60 + sm + gapMinutes * (matchesPerDay - 1);
      const endTime  = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      return apiPost<GenerateResult>("/api/matches/generate", {
        teamIds:       teams.slice(0, totalTeams).map((t) => t.id),
        vueltas,
        startDate:     new Date(startDate).toISOString(),
        playDays,
        matchesPerDay: isCustom ? customTimes.length : matchesPerDay,
        startTime,
        endTime,
        ...(isCustom && { matchTimes: customTimes }),
        replaceExisting,
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/matches"] });
      setResumen(data);
      setShowResumen(true);
      sileo.success({
        title: "Calendario generado",
        description: `${data.jornadasCreadas} jornadas · ${data.partidosCreados} partidos creados`,
      });
    },
    onError: (error) => {
      sileo.error({
        title: "Error al generar",
        description: (error as Error).message,
      });
    },
  });

  // ── Supplement: partidos para equipo que se integra tarde ────────────────
  interface SuppResult { partidosAgregados: number; pendientes: number; enJornadas: number; jornadasAfectadas: number[] }

  const suppMutation = useMutation({
    mutationFn: () =>
      apiPost<SuppResult>("/api/matches/generate-supplement", {
        newTeamIds:           suppNewIds,
        allTeamIds:           teams.slice(0, totalTeams).map((t) => t.id),
        integrateFromJornada: suppFromJornada,
        vueltas,
        gapMinutes:           90,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/matches"] });
      setSuppOpen(false);
      setSuppNewIds([]);
      const parts = [];
      if (data.pendientes > 0) parts.push(`${data.pendientes} pendiente${data.pendientes !== 1 ? "s" : ""} (ver en Calendario)`);
      if (data.enJornadas  > 0) parts.push(`${data.enJornadas} en jornadas ${data.jornadasAfectadas.join(", ")}`);
      sileo.success({
        title: "Equipo integrado al calendario",
        description: parts.join(" · "),
      });
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  // ── Guardar nombre de equipo (crear o renombrar) ───────────────────────────
  const handleSaveTeamName = async () => {
    if (editSlot === null || !editValue.trim()) return;
    setSaving(true);
    try {
      const existing = teams[editSlot];
      if (existing) {
        // Renombrar equipo existente
        await apiPut(`/api/teams/${existing.id}`, { name: editValue.trim() });
      } else {
        // Crear nuevo equipo
        await apiPost("/api/teams", { name: editValue.trim() });
      }
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditSlot(null);
      setEditValue("");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (slotIndex: number) => {
    const existing = teams[slotIndex];
    const defaultName = `Equipo ${slotIndex + 1}`;
    setEditSlot(slotIndex);
    setEditValue(existing ? existing.name : "");
    // si el nombre es el genérico, limpiar para que el placeholder lo muestre
    if (existing?.name === defaultName) setEditValue("");
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  type ResetScope = "matches" | "teams" | "all";
  const [resetScope,    setResetScope]    = useState<ResetScope | null>(null);
  const [resetConfirm,  setResetConfirm]  = useState("");

  const RESET_OPTIONS: { scope: ResetScope; label: string; desc: string; color: string }[] = [
    { scope: "matches", label: "Borrar calendario",  desc: "Elimina todos los partidos generados",              color: "amber"  },
    { scope: "teams",   label: "Borrar equipos",     desc: "Elimina equipos, jugadores y partidos en cascada",  color: "orange" },
    { scope: "all",     label: "Resetear todo",      desc: "Elimina partidos, equipos y jugadores",             color: "red"    },
  ];

  const resetMutation = useMutation({
    mutationFn: (scope: ResetScope) => apiDelete("/api/admin/reset", { scope }),
    onSuccess: (_, scope) => {
      qc.invalidateQueries({ queryKey: ["/api/matches"] });
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      setResetScope(null);
      setResetConfirm("");
      const labels: Record<ResetScope, string> = {
        matches: "Calendario eliminado",
        teams:   "Equipos eliminados",
        all:     "Base de datos reseteada",
      };
      sileo.success({ title: labels[scope], description: "Los datos fueron eliminados correctamente" });
    },
    onError: (e) => sileo.error({ title: "Error al resetear", description: (e as Error).message }),
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const readyTeams  = teams.slice(0, totalTeams);
  const namedSlots  = readyTeams.filter((t) => !t.name.match(/^Equipo \d+$/)).length;
  const info        = totalTeams >= 3 ? getRoundRobinInfo(totalTeams, vueltas) : null;

  // ── Generar con validación ─────────────────────────────────────────────────
  const handleGenerate = () => {
    if (hasExistingCalendar && !replaceExisting) return; // bloqueado visualmente
    if (!startDate) {
      sileo.error({
        title: "Fecha requerida",
        description: "Selecciona una fecha de inicio para continuar",
      });
      return;
    }
    if (teams.length < totalTeams) {
      sileo.warning({
        title: "Equipos incompletos",
        description: `Faltan ${totalTeams - teams.length} equipo${totalTeams - teams.length !== 1 ? "s" : ""} por nombrar antes de generar`,
      });
      return;
    }
    generateMutation.mutate();
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <SectionTitle whiteText="Configurar" orangeText="Torneo" />

      <div className="flex flex-col md:flex-row md:items-start gap-8">

        {/* ================================================================ */}
        {/* IZQUIERDA — Parámetros                                            */}
        {/* ================================================================ */}
        <div className="space-y-5 md:flex-1">

          {/* Cantidad de equipos */}
          <div className="glass-panel p-5 sm:p-6">
            <h3 className="text-sm font-display font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
              <Settings2 className="text-brand-orange w-4 h-4" />
              Cantidad de Equipos
            </h3>
            <div className="flex items-center justify-between gap-4">
              <Button onClick={() => setTotalTeams(Math.max(3, totalTeams - 1))}
                disabled={totalTeams <= 3} variant="outline" size="icon"
                className="rounded-full w-12 h-12 border-white/20 hover:bg-brand-orange hover:border-brand-orange disabled:opacity-30 flex-shrink-0">
                <Minus className="w-4 h-4" />
              </Button>
              <div className="text-center flex-1">
                <span className="text-6xl font-display font-black text-brand-orange drop-shadow-[0_0_14px_rgba(255,69,0,0.5)]">
                  {totalTeams}
                </span>
                <p className="text-[11px] text-white/30 mt-1">
                  {Math.floor(totalTeams / 2)} partido{Math.floor(totalTeams / 2) !== 1 ? "s" : ""} por jornada
                </p>
              </div>
              <Button onClick={() => setTotalTeams(Math.min(12, totalTeams + 1))}
                disabled={totalTeams >= 12} variant="outline" size="icon"
                className="rounded-full w-12 h-12 border-white/20 hover:bg-brand-orange hover:border-brand-orange disabled:opacity-30 flex-shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Vueltas */}
          <div className="glass-panel p-5 sm:p-6">
            <h3 className="text-sm font-display font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
              <Settings2 className="text-brand-orange w-4 h-4" />
              Vueltas (Round Robin)
            </h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button key={num} onClick={() => setVueltas(num)}
                  className={`flex-1 h-11 rounded-full font-display font-bold text-base transition-all duration-200 ${
                    vueltas === num
                      ? "bg-brand-orange text-white glow-orange scale-105"
                      : "bg-white/5 text-white/40 hover:bg-white/15 border border-white/10"
                  }`}>
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Reglamento de Roster */}
          <div className="glass-panel p-5 sm:p-6">
            <h3 className="text-sm font-display font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
              <ShieldCheck className="text-brand-orange w-4 h-4" />
              Reglamento de Roster
            </h3>

            {/* Cierre de registro */}
            <div className="mb-5">
              <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold block mb-1">
                Registro libre hasta la jornada
              </label>
              <p className="text-[10px] text-white/25 mb-3">
                Después de esta jornada no se pueden agregar jugadores nuevos.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRosterLockJornada(Math.max(1, rosterLockJornada - 1))}
                  className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white font-bold flex items-center justify-center text-lg flex-shrink-0"
                >−</button>
                <span className="text-3xl font-display font-black text-brand-orange flex-1 text-center">
                  {rosterLockJornada}
                </span>
                <button
                  onClick={() => setRosterLockJornada(rosterLockJornada + 1)}
                  className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white font-bold flex items-center justify-center text-lg flex-shrink-0"
                >+</button>
              </div>
            </div>

            {/* Ventana de traspasos */}
            <button
              onClick={() => setTransferWindowEnabled(!transferWindowEnabled)}
              className={`flex items-center gap-2.5 w-full p-3 rounded-xl border transition-all mb-3 ${
                transferWindowEnabled
                  ? "bg-brand-orange/8 border-brand-orange/30 text-brand-orange"
                  : "bg-white/4 border-white/8 text-white/40 hover:border-white/20"
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                transferWindowEnabled ? "bg-brand-orange border-brand-orange" : "border-white/20"
              }`}>
                {transferWindowEnabled && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-[11px] font-semibold text-left">
                Habilitar ventana de traspasos (2ª vuelta)
              </span>
            </button>

            {transferWindowEnabled && (
              <div className="animate-in fade-in duration-200">
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold block mb-1">
                  Ventana abre en la jornada
                </label>
                <p className="text-[10px] text-white/25 mb-3">
                  A partir de aquí se permiten altas y bajas de jugadores.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTransferWindowJornada(Math.max(rosterLockJornada + 1, transferWindowJornada - 1))}
                    className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white font-bold flex items-center justify-center text-lg flex-shrink-0"
                  >−</button>
                  <span className="text-3xl font-display font-black text-brand-orange flex-1 text-center">
                    {transferWindowJornada}
                  </span>
                  <button
                    onClick={() => setTransferWindowJornada(transferWindowJornada + 1)}
                    className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white font-bold flex items-center justify-center text-lg flex-shrink-0"
                  >+</button>
                </div>
                <p className="text-[10px] text-white/20 text-center mt-2">
                  Debe ser mayor a la jornada de cierre ({rosterLockJornada})
                </p>
              </div>
            )}
          </div>

          {/* Fechas */}
          <div className="glass-panel p-5 sm:p-6">
            <h3 className="text-sm font-display font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
              <Calendar className="text-brand-orange w-4 h-4" />
              Fechas del calendario
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold block mb-2">
                  Fecha de inicio — Jornada 1
                </label>
                <Input type="date" value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="glass-input h-11" />
              </div>
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold block mb-2">
                  Días de juego
                </label>
                {(() => {
                  const DAYS = [
                    { n: 1, label: "Lun" },
                    { n: 2, label: "Mar" },
                    { n: 3, label: "Mié" },
                    { n: 4, label: "Jue" },
                    { n: 5, label: "Vie" },
                    { n: 6, label: "Sáb" },
                    { n: 0, label: "Dom" },
                  ];
                  const toggle = (n: number) =>
                    setPlayDays((prev) =>
                      prev.includes(n)
                        ? prev.length > 1 ? prev.filter((d) => d !== n) : prev
                        : [...prev, n].sort((a, b) => a - b)
                    );
                  return (
                    <>
                      <div className="grid grid-cols-7 gap-1 mb-3">
                        {DAYS.map(({ n, label }) => {
                          const active = playDays.includes(n);
                          return (
                            <button key={n} onClick={() => toggle(n)}
                              className={`h-10 rounded-xl text-[11px] font-bold transition-all border ${
                                active
                                  ? "bg-brand-orange text-white border-brand-orange"
                                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/70"
                              }`}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-white/30 text-center">
                        {playDays.length} jornada{playDays.length !== 1 ? "s" : ""} por semana
                        {" · "}{DAYS.filter((d) => playDays.includes(d.n)).map((d) => d.label).join(", ")}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Horario del día */}
          <div className="glass-panel p-5 sm:p-6">
            <h3 className="text-sm font-display font-semibold mb-4 flex items-center gap-2 text-white/70 uppercase tracking-wider">
              <Clock className="text-brand-orange w-4 h-4" />
              Horario del día de juego
            </h3>

            {/* Toggle de modo */}
            <div className="flex rounded-xl bg-white/5 border border-white/8 p-1 mb-5">
              {(["seguidos", "personalizado"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setScheduleMode(mode)}
                  className={`flex-1 h-9 rounded-lg text-[12px] font-bold capitalize transition-all ${
                    scheduleMode === mode
                      ? "bg-brand-orange text-white"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {mode === "seguidos" ? "Seguidos" : "Personalizado"}
                </button>
              ))}
            </div>

            {/* ── MODO SEGUIDOS ── */}
            {scheduleMode === "seguidos" && (
              <>
                {/* Partidos por día */}
                <div className="mb-4">
                  <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold block mb-2">
                    Partidos por día
                  </label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setMatchesPerDay(Math.max(1, matchesPerDay - 1))}
                      className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white font-bold flex items-center justify-center text-lg">−</button>
                    <span className="text-2xl font-display font-bold text-brand-orange flex-1 text-center">{matchesPerDay}</span>
                    <button onClick={() => setMatchesPerDay(Math.min(10, matchesPerDay + 1))}
                      className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white font-bold flex items-center justify-center text-lg">+</button>
                  </div>
                </div>

                {/* Hora de inicio */}
                <div className="mb-4">
                  <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold block mb-2">
                    Primer partido
                  </label>
                  <Input type="time" value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="glass-input h-11 text-center font-bold" />
                </div>

                {/* Tiempo entre partidos */}
                {matchesPerDay > 1 && (
                  <div className="mb-4">
                    <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold block mb-2">
                      Tiempo entre partidos
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[60, 90, 120, 0].map((min) => {
                        const isOtro     = min === 0;
                        const isSelected = isOtro ? ![60, 90, 120].includes(gapMinutes) : gapMinutes === min;
                        const label      = min === 60 ? "1h" : min === 90 ? "1.5h" : min === 120 ? "2h" : "Otro";
                        return (
                          <button key={min}
                            onClick={() => { if (!isOtro) setGapMinutes(min); else setGapMinutes(150); }}
                            className={`h-10 rounded-xl text-[12px] font-bold transition-all border ${
                              isSelected
                                ? "bg-brand-orange text-white border-brand-orange"
                                : "bg-white/5 text-white/45 border-white/10 hover:bg-white/10 hover:text-white/70"
                            }`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {![60, 90, 120].includes(gapMinutes) && (
                      <div className="flex items-center gap-3 mt-3">
                        <button onClick={() => setGapMinutes(Math.max(15, gapMinutes - 15))}
                          className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white font-bold flex items-center justify-center text-lg flex-shrink-0">−</button>
                        <span className="text-xl font-display font-bold text-brand-orange flex-1 text-center">{gapMinutes} min</span>
                        <button onClick={() => setGapMinutes(Math.min(240, gapMinutes + 15))}
                          className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white font-bold flex items-center justify-center text-lg flex-shrink-0">+</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview seguidos */}
                <div>
                  <p className="text-[10px] text-white/25 font-bold uppercase tracking-widest mb-2">Horario del día</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: matchesPerDay }, (_, i) => {
                      const [sh, sm] = startTime.split(":").map(Number);
                      const total    = sh * 60 + sm + i * gapMinutes;
                      const hh = String(Math.floor(total / 60)).padStart(2, "0");
                      const mm = String(total % 60).padStart(2, "0");
                      return (
                        <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-brand-orange/10 text-brand-orange/80 border border-brand-orange/25">
                          {hh}:{mm}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── MODO PERSONALIZADO ── */}
            {scheduleMode === "personalizado" && (
              <>
                <p className="text-[11px] text-white/35 mb-3">
                  Define la hora exacta de cada partido del día. Puedes agregar o quitar slots.
                </p>
                <div className="space-y-2 mb-4">
                  {customTimes.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[11px] text-white/30 font-bold w-16 text-right flex-shrink-0">
                        Partido {i + 1}
                      </span>
                      <Input
                        type="time"
                        value={t}
                        onChange={(e) => {
                          const updated = [...customTimes];
                          updated[i] = e.target.value;
                          setCustomTimes(updated);
                        }}
                        className="glass-input h-10 text-center font-bold flex-1"
                      />
                      {customTimes.length > 1 && (
                        <button
                          onClick={() => setCustomTimes(customTimes.filter((_, j) => j !== i))}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-white/30 hover:text-red-400 flex items-center justify-center text-lg transition-all flex-shrink-0"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {customTimes.length < 10 && (
                  <button
                    onClick={() => {
                      const last = customTimes[customTimes.length - 1] ?? "10:00";
                      const [h, m] = last.split(":").map(Number);
                      const next   = h * 60 + m + 120;
                      const hh = String(Math.floor(next / 60)).padStart(2, "0");
                      const mm = String(next % 60).padStart(2, "0");
                      setCustomTimes([...customTimes, `${hh}:${mm}`]);
                    }}
                    className="w-full h-9 rounded-xl border border-dashed border-white/15 text-white/35 hover:border-brand-orange/40 hover:text-brand-orange/60 text-[12px] font-bold transition-all"
                  >
                    + Agregar partido
                  </button>
                )}
              </>
            )}
          </div>

          {/* Resumen */}
          {info && (
            <div className="glass-panel p-4 bg-brand-orange/5 border-brand-orange/20">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">Resumen del torneo</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Equipos",  value: totalTeams },
                  { label: "Jornadas", value: info.totalRounds },
                  { label: "Partidos", value: info.totalGames },
                ].map((s) => (
                  <div key={s.label} className="bg-black/20 rounded-xl p-2.5">
                    <div className="text-xl font-black text-brand-orange">{s.value}</div>
                    <div className="text-[9px] text-white/30 font-bold uppercase mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* DERECHA — Nombres de equipos (sorteo)                             */}
        {/* ================================================================ */}
        <div className="glass-panel p-5 sm:p-6 md:flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-display font-semibold">Equipos del torneo</h3>
            <span className="text-[11px] text-brand-orange font-bold">
              {namedSlots} / {totalTeams} nombrados
            </span>
          </div>
          <p className="text-[11px] text-white/30 mb-4">
            Toca un equipo para asignar el nombre tras el sorteo
          </p>

          {/* Grid de slots */}
          <div className="grid grid-cols-2 gap-2 mb-5" style={{ gridAutoRows: "40px" }}>
            {Array.from({ length: totalTeams }, (_, i) => {
              const team    = teams[i];
              const isNamed = !!team && !team.name.match(/^Equipo \d+$/);
              return (
                <button
                  key={i}
                  onClick={() => openEdit(i)}
                  className={`flex items-center gap-2 px-2.5 h-full rounded-xl text-left transition-all duration-150 border group ${
                    isNamed
                      ? "bg-brand-orange/10 border-brand-orange/35 hover:border-brand-orange/60"
                      : team
                        ? "bg-white/5 border-white/12 hover:border-white/25"
                        : "bg-white/3 border-dashed border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* Número */}
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center font-display font-black text-[11px] flex-shrink-0 ${
                    isNamed ? "bg-brand-orange text-white" : "bg-white/8 text-white/30"
                  }`}>
                    {i + 1}
                  </div>

                  {/* Nombre */}
                  <span className={`text-[12px] font-semibold flex-1 truncate ${
                    isNamed ? "text-white" : "text-white/25"
                  }`}>
                    {team ? team.name : `Equipo ${i + 1}`}
                  </span>

                  {/* Icono lápiz */}
                  <Pencil className="w-3 h-3 text-white/15 group-hover:text-brand-orange/60 transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Bloqueo: ya existe calendario */}
          {hasExistingCalendar && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 mb-3">
              <p className="text-amber-400/80 text-[11px] flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Ya existe un calendario con <strong>{upcomingMatches.length}</strong> partido{upcomingMatches.length !== 1 ? "s" : ""} pendientes.
                  Activa "Reemplazar" para poder generar uno nuevo.
                </span>
              </p>
            </div>
          )}

          {/* Opción reemplazar */}
          <button onClick={() => setReplaceExisting(!replaceExisting)}
            className={`flex items-center gap-2.5 w-full p-3 rounded-xl border transition-all mb-3 ${
              replaceExisting
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-white/4 border-white/8 text-white/40 hover:border-white/20"
            }`}>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
              replaceExisting ? "bg-red-500 border-red-500" : "border-white/20"
            }`}>
              {replaceExisting && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className="text-[11px] font-semibold text-left">
              Reemplazar partidos pendientes existentes
            </span>
          </button>

          {/* Aviso si faltan equipos */}
          {teams.length < totalTeams && (
            <p className="text-amber-400/70 text-[11px] flex items-center gap-1.5 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Faltan nombrar {totalTeams - teams.length} equipo{totalTeams - teams.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Botón generar */}
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || (hasExistingCalendar && !replaceExisting)}
            className="w-full rounded-full h-13 text-base font-bold bg-brand-orange hover:bg-brand-orange/85 text-white glow-orange disabled:opacity-40 disabled:cursor-not-allowed">
            {hasExistingCalendar && !replaceExisting
              ? <><Lock className="w-4 h-4 mr-2" />Calendario bloqueado</>
              : generateMutation.isPending
                ? <><Shuffle className="w-4 h-4 mr-2 animate-spin" />Generando...</>
                : <><Shuffle className="w-4 h-4 mr-2" />Generar Calendario</>
            }
          </Button>

          {/* ── Integrar equipo al torneo activo ── */}
          {hasExistingCalendar && (
            <div className="mt-4 border-t border-white/8 pt-4">
              <button
                onClick={() => setSuppOpen(!suppOpen)}
                className="flex items-center gap-2 w-full hover:opacity-80 transition-opacity"
              >
                <UserPlus className="w-4 h-4 text-brand-orange flex-shrink-0" />
                <span className="font-display font-semibold text-white/70 flex-1 text-left text-sm">
                  Integrar equipo al torneo activo
                </span>
                {suppOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </button>

              {suppOpen && (
                <div className="mt-4 space-y-4">

                  {/* Instrucciones */}
                  <div className="bg-white/3 border border-white/8 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">¿Cómo funciona?</p>
                    {[
                      { n: "1", text: "Sube el contador de equipos arriba, nombra y guarda al equipo nuevo." },
                      { n: "2", text: "Selecciona el equipo nuevo en la lista de abajo." },
                      { n: "3", text: "Elige desde qué jornada se integra. Sus partidos se agregan al final de cada jornada existente." },
                      { n: "4", text: "Si perdió jornadas previas, esos partidos quedan en la sección Pendientes del Calendario para que tú decidas cuándo jugarlos." },
                    ].map(({ n, text }) => (
                      <div key={n} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-brand-orange/20 text-brand-orange text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
                        <p className="text-[10px] text-white/35 leading-relaxed">{text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Desde qué jornada se integra */}
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold block mb-2">
                      Se integra a partir de la jornada
                    </label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSuppFromJornada(Math.max(2, suppFromJornada - 1))}
                        className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white font-bold flex items-center justify-center text-lg flex-shrink-0">−</button>
                      <span className="text-2xl font-display font-black text-brand-orange flex-1 text-center">{suppFromJornada}</span>
                      <button onClick={() => setSuppFromJornada(suppFromJornada + 1)}
                        className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white font-bold flex items-center justify-center text-lg flex-shrink-0">+</button>
                    </div>
                    <p className="text-[10px] text-white/25 text-center mt-1">
                      Se generarán pendientes de {suppFromJornada - 1} jornada{suppFromJornada - 1 !== 1 ? "s" : ""} perdida{suppFromJornada - 1 !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Selector equipos nuevos */}
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold block mb-2">
                      Equipo(s) que se integran
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {teams.slice(0, totalTeams).map((t) => {
                        const selected = suppNewIds.includes(t.id);
                        return (
                          <button key={t.id}
                            onClick={() => setSuppNewIds((prev) => selected ? prev.filter((id) => id !== t.id) : [...prev, t.id])}
                            className={`h-9 rounded-xl text-[11px] font-bold px-2 text-left truncate transition-all border ${
                              selected
                                ? "bg-brand-orange/15 border-brand-orange/50 text-white"
                                : "bg-white/4 border-white/10 text-white/40 hover:border-white/25"
                            }`}>
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {suppFromJornada > 1 && (
                    <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
                      <p className="text-[10px] text-amber-400/80 leading-relaxed">
                        Los partidos de las {suppFromJornada - 1} jornada{suppFromJornada - 1 !== 1 ? "s" : ""} perdida{suppFromJornada - 1 !== 1 ? "s" : ""} quedarán en la sección <strong>Pendientes</strong> del Calendario.
                        Puedes reprogramarlos individualmente cuando decidas jugarlos.
                      </p>
                    </div>
                  )}

                  <Button onClick={() => suppMutation.mutate()}
                    disabled={suppNewIds.length === 0 || suppMutation.isPending}
                    className="w-full rounded-full h-10 text-sm font-bold bg-brand-orange hover:bg-brand-orange/85 text-white glow-orange disabled:opacity-40">
                    <UserPlus className="w-3.5 h-3.5 mr-2" />
                    {suppMutation.isPending ? "Generando…" : "Integrar al calendario"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* RESUMEN GENERADO                                                     */}
      {/* ================================================================== */}
      {resumen && showResumen && (
        <div className="mt-8 glass-panel p-5 sm:p-6 border-brand-orange/25 bg-brand-orange/5 animate-in fade-in duration-300">
          <button onClick={() => setShowResumen(!showResumen)}
            className="flex items-center justify-between w-full mb-4">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span className="font-display font-bold text-white">
                Calendario generado —{" "}
                <span className="text-brand-orange">{resumen.jornadasCreadas} jornadas</span>
                {" / "}
                <span className="text-brand-orange">{resumen.partidosCreados} partidos</span>
              </span>
            </div>
            {showResumen
              ? <ChevronUp className="w-4 h-4 text-white/40" />
              : <ChevronDown className="w-4 h-4 text-white/40" />}
          </button>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {resumen.resumen.map((j) => (
              <div key={j.jornada} className="bg-black/25 rounded-xl p-3 text-center border border-white/8">
                <div className="text-[10px] text-white/30 uppercase font-bold">Jornada {j.jornada}</div>
                <div className="text-xs text-brand-orange font-semibold mt-1">{j.fecha}</div>
                {j.fechaFin && j.fechaFin !== j.fecha && (
                  <div className="text-[9px] text-brand-orange/60 mt-0.5">— {j.fechaFin}</div>
                )}
                <div className="text-[10px] text-white/25 mt-0.5">{j.partidos} partidos</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ZONA DE PELIGRO                                                       */}
      {/* ================================================================== */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-3">
          <TriangleAlert className="w-4 h-4 text-red-500/60" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-red-500/60">
            Zona de peligro
          </span>
        </div>
        <div className="glass-panel border-red-500/15 bg-red-500/3 p-4 space-y-2">
          {RESET_OPTIONS.map(({ scope, label, desc, color }) => (
            <div key={scope} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-white/70">{label}</p>
                <p className="text-[11px] text-white/25">{desc}</p>
              </div>
              <button
                onClick={() => { setResetScope(scope); setResetConfirm(""); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all
                  ${color === "amber"
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20"
                    : color === "orange"
                    ? "bg-orange-500/10 border-orange-500/25 text-orange-400 hover:bg-orange-500/20"
                    : "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20"
                  }`}
              >
                <Trash2 className="w-3 h-3" />
                Borrar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal confirmación reset ── */}
      <Dialog open={resetScope !== null} onOpenChange={(open) => { if (!open) { setResetScope(null); setResetConfirm(""); } }}>
        <DialogContent className="glass-panel border-red-500/20 bg-black/85 backdrop-blur-xl w-full max-w-[calc(100vw-32px)] sm:max-w-sm rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-xl font-bold text-red-400">
              ¿Estás seguro?
            </DialogTitle>
          </DialogHeader>

          {resetScope && (() => {
            const opt = RESET_OPTIONS.find((o) => o.scope === resetScope)!;
            return (
              <>
                <p className="text-center text-sm text-white/40 -mt-2 mb-1">
                  {opt.label}
                </p>
                <p className="text-center text-xs text-white/25 mb-5">
                  {opt.desc}. <strong className="text-red-400">Esta acción no se puede deshacer.</strong>
                </p>
                <p className="text-[11px] text-white/40 mb-2 text-center">
                  Escribe <span className="font-bold text-red-400">CONFIRMAR</span> para continuar
                </p>
                <Input
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="CONFIRMAR"
                  className="glass-input h-12 px-4 text-center font-bold mb-5 tracking-widest"
                  autoFocus
                />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setResetScope(null); setResetConfirm(""); }}
                    className="flex-1 rounded-full h-12 border-white/20 text-white/50">
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => resetMutation.mutate(resetScope)}
                    disabled={resetConfirm !== "CONFIRMAR" || resetMutation.isPending}
                    className="flex-1 rounded-full h-12 bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-30"
                  >
                    {resetMutation.isPending ? "Borrando…" : "Confirmar"}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* POPUP — Editar nombre de equipo                                      */}
      {/* ================================================================== */}
      <Dialog open={editSlot !== null} onOpenChange={(open) => { if (!open) { setEditSlot(null); setEditValue(""); } }}>
        <DialogContent className="glass-panel border-white/10 bg-black/80 backdrop-blur-xl w-full max-w-[calc(100vw-32px)] sm:max-w-sm rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-xl font-bold">
              Equipo{" "}
              <span className="text-brand-orange">
                {editSlot !== null ? editSlot + 1 : ""}
              </span>
            </DialogTitle>
          </DialogHeader>

          <p className="text-center text-sm text-white/35 -mt-2 mb-4">
            {teams[editSlot ?? 0]
              ? "Cambia el nombre del equipo"
              : "Escribe el nombre del equipo (del sorteo)"}
          </p>

          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTeamName()}
            placeholder={editSlot !== null ? `Equipo ${editSlot + 1}` : ""}
            className="glass-input h-14 px-6 text-lg text-center font-bold mb-6"
            autoFocus
          />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setEditSlot(null); setEditValue(""); }}
              className="flex-1 rounded-full h-12 border-white/20 text-white/50">
              Cancelar
            </Button>
            <Button onClick={handleSaveTeamName} disabled={!editValue.trim() || saving}
              className="flex-1 rounded-full h-12 bg-brand-orange hover:bg-brand-orange/80 text-white font-bold glow-orange">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
