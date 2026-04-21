import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Camera, Plus, User, Trophy, Check, Pencil, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiPut, apiUpload } from "@/lib/apiClient";
import { sileo } from "sileo";

interface ApiPlayer {
  id: string;
  name: string;
  lastName: string;
  number: string;
  photoUrl: string | null;
  teamId: string;
}

interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
  rosterLocked: boolean;
}

interface TournamentConfig {
  rosterLockJornada: number;
  transferWindowJornada: number | null;
}

interface FinishedMatch { jornada: number; }

const MIN_PLAYERS = 8;
const MAX_PLAYERS = 15;

export default function RosterPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";

  // Admin elige equipo; lider usa su propio teamId
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    isAdmin ? null : (user?.teamId ?? null)
  );

  // ── Cargar todos los equipos (admin los necesita para el selector) ──────────
  const { data: allTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn:  () => apiGet<Team[]>("/api/teams"),
    enabled:  isAdmin,
  });

  // Si admin y aún no eligió equipo, seleccionar el primero disponible
  React.useEffect(() => {
    if (isAdmin && allTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(allTeams[0].id);
    }
  }, [isAdmin, allTeams, selectedTeamId]);

  const activeTeam = isAdmin
    ? allTeams.find((t) => t.id === selectedTeamId) ?? null
    : null;

  // ── Editar nombre de equipo ────────────────────────────────────────────────
  const [editingName,  setEditingName]  = useState(false);
  const [teamNameVal,  setTeamNameVal]  = useState("");

  const renameMutation = useMutation({
    mutationFn: (name: string) =>
      apiPut<Team>(`/api/teams/${selectedTeamId}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditingName(false);
      sileo.success({ title: "Nombre actualizado", description: teamNameVal });
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  const openRename = () => {
    setTeamNameVal(selectedTeam?.name ?? "");
    setEditingName(true);
  };

  // ── Equipo seleccionado (para rosterLocked, cubre tanto admin como lider) ──
  const { data: selectedTeam } = useQuery<Team>({
    queryKey: ["/api/teams", selectedTeamId],
    queryFn:  () => apiGet<Team>(`/api/teams/${selectedTeamId}`),
    enabled:  !!selectedTeamId,
  });

  // ── Jugadores ──────────────────────────────────────────────────────────────
  const { data: players = [], isLoading } = useQuery<ApiPlayer[]>({
    queryKey: ["/api/players", { teamId: selectedTeamId }],
    queryFn: () =>
      selectedTeamId
        ? apiGet<ApiPlayer[]>(`/api/players?teamId=${selectedTeamId}`)
        : Promise.resolve([]),
    enabled: !!selectedTeamId,
  });

  const addMutation = useMutation({
    mutationFn: (data: { name: string; lastName: string; number: string; teamId: string }) =>
      apiPost<ApiPlayer>("/api/players", data),
    onSuccess: (player) => {
      qc.invalidateQueries({ queryKey: ["/api/players", { teamId: selectedTeamId }] });
      setNewPlayer({ name: "", lastName: "", number: "" });
      if (photoInputRef.current) photoInputRef.current.value = "";
      sileo.success({ title: "Jugador agregado", description: `#${player.number} ${player.name} ${player.lastName}` });
      if (photoFile) {
        const fd = new FormData();
        fd.append("photo", photoFile);
        apiUpload<{ photoUrl: string }>(`/api/players/${player.id}/photo`, fd)
          .then(() => qc.invalidateQueries({ queryKey: ["/api/players", { teamId: selectedTeamId }] }))
          .catch(() => {});
        setPhotoFile(null);
        setPhotoPreview(null);
      }
    },
    onError: (e) => sileo.error({ title: "No se pudo agregar", description: (e as Error).message }),
  });

  const lockMutation = useMutation({
    mutationFn: () =>
      apiPut<Team>(`/api/teams/${selectedTeamId}`, { rosterLocked: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      qc.invalidateQueries({ queryKey: ["/api/teams", selectedTeamId] });
      sileo.success({ title: "Roster finalizado", description: "No se pueden agregar más jugadores" });
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  const [newPlayer,    setNewPlayer]    = useState({ name: "", lastName: "", number: "" });
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef  = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTeamId) return;
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("logo", file);
    apiUpload<{ logoUrl: string }>(`/api/teams/${selectedTeamId}/logo`, fd)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["/api/teams"] });
        qc.invalidateQueries({ queryKey: ["/api/teams", selectedTeamId] });
        sileo.success({ title: "Logo actualizado" });
      })
      .catch((e) => sileo.error({ title: "Error al subir logo", description: (e as Error).message }));
  };

  const addPlayer = () => {
    if (!selectedTeamId || players.length >= MAX_PLAYERS || !newPlayer.name.trim() || !newPlayer.lastName.trim() || !newPlayer.number) return;
    addMutation.mutate({ ...newPlayer, teamId: selectedTeamId });
  };

  // ── Config y jornada actual ─────────────────────────────────────────────────
  const { data: config } = useQuery<TournamentConfig>({
    queryKey: ["/api/config"],
    queryFn:  () => apiGet<TournamentConfig>("/api/config"),
  });

  const { data: finishedMatches = [] } = useQuery<FinishedMatch[]>({
    queryKey: ["/api/matches", { status: "finished" }],
    queryFn:  () => apiGet<FinishedMatch[]>("/api/matches?status=finished"),
  });

  const maxJornadaPlayed = finishedMatches.length > 0
    ? Math.max(...finishedMatches.map((m) => m.jornada))
    : 0;

  const lockJornada      = config?.rosterLockJornada     ?? 4;
  const transferJornada  = config?.transferWindowJornada ?? null;

  const rosterStatus: "open" | "locked" | "transfer_window" =
    maxJornadaPlayed < lockJornada
      ? "open"
      : transferJornada !== null && maxJornadaPlayed >= transferJornada
        ? "transfer_window"
        : "locked";

  const isComplete   = players.length >= MIN_PLAYERS;
  const remaining    = Math.max(0, MIN_PLAYERS - players.length);
  const rosterLocked = (selectedTeam?.rosterLocked ?? false) || rosterStatus === "locked";

  // Nombre del equipo activo
  const activeTeamName = selectedTeam?.name ?? (isAdmin ? "—" : "Mi equipo");

  if (!isAdmin && !user?.teamId) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-white/40">
        No tienes un equipo asignado.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <SectionTitle whiteText="Gestión" orangeText="Roster" className="mb-0" />
        <div className="glass-panel px-5 py-2.5 rounded-full flex items-center gap-3">
          <span className="text-white/50 font-semibold uppercase tracking-wider text-xs">Capacidad</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-xl font-bold font-display ${isComplete ? "text-brand-orange" : "text-white"}`}>
              {players.length}
            </span>
            <span className="text-white/30 text-sm">/ {MAX_PLAYERS}</span>
          </div>
        </div>
      </div>

      {/* ── Selector de equipo (solo admin) ────────────────────────────────── */}
      {isAdmin && allTeams.length > 0 && (
        <div className="mb-6 relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="w-full glass-panel px-5 py-3 rounded-2xl flex items-center justify-between hover:border-brand-orange/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-4 h-4 text-brand-orange flex-shrink-0" />
              <span className="font-display font-bold text-white">{activeTeamName}</span>
              <span className="text-[11px] text-white/30">{players.length} jugadores</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showSelector ? "rotate-180" : ""}`} />
          </button>

          {showSelector && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              {allTeams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => { setSelectedTeamId(team.id); setShowSelector(false); setLogoPreview(null); }}
                  className={`w-full px-5 py-3 text-left flex items-center gap-3 transition-all hover:bg-white/8 ${
                    team.id === selectedTeamId ? "bg-brand-orange/10 text-white" : "text-white/60"
                  }`}
                >
                  <Trophy className={`w-3.5 h-3.5 flex-shrink-0 ${team.id === selectedTeamId ? "text-brand-orange" : "text-white/20"}`} />
                  <span className="font-semibold text-sm">{team.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_2fr] lg:grid-cols-3 gap-8">

        {/* ── Formulario ─────────────────────────────────────────────────── */}
        <div className="md:col-span-1 lg:col-span-1">
          <div className="glass-panel p-5 sm:p-8 sticky top-8">

            {/* Nombre del equipo + editar */}
            <div className="flex flex-col items-center gap-2 mb-6 pb-6 border-b border-white/8">
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/15 flex items-center justify-center cursor-pointer hover:border-brand-orange/50 transition-colors overflow-hidden group"
              >
                {(logoPreview ?? selectedTeam?.logoUrl) ? (
                  <img src={logoPreview ?? selectedTeam!.logoUrl!} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Trophy className="w-7 h-7 text-white/25 group-hover:text-brand-orange/50 transition-colors" />
                )}
              </div>
              <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
                {(logoPreview ?? selectedTeam?.logoUrl) ? "Cambiar logo" : "Logo del equipo"}
              </span>

              {/* Nombre del equipo editable */}
              {editingName ? (
                <div className="flex items-center gap-2 w-full mt-1">
                  <Input
                    value={teamNameVal}
                    onChange={(e) => setTeamNameVal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && teamNameVal.trim() && renameMutation.mutate(teamNameVal.trim())}
                    className="glass-input h-9 text-center font-bold text-sm flex-1"
                    autoFocus
                  />
                  <button
                    onClick={() => teamNameVal.trim() && renameMutation.mutate(teamNameVal.trim())}
                    disabled={!teamNameVal.trim() || renameMutation.isPending}
                    className="w-9 h-9 rounded-xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center flex-shrink-0 hover:bg-brand-orange/30 disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/40 flex items-center justify-center flex-shrink-0 hover:bg-white/10"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={openRename}
                  className="flex items-center gap-1.5 group mt-1"
                >
                  <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">
                    {activeTeamName}
                  </span>
                  <Pencil className="w-3 h-3 text-white/20 group-hover:text-brand-orange transition-colors" />
                </button>
              )}
            </div>

            <h3 className="text-xl font-display font-semibold mb-6 text-center">Nuevo Jugador</h3>

            {/* Foto del jugador */}
            <div className="flex justify-center mb-6">
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              <div
                onClick={() => photoInputRef.current?.click()}
                className="w-24 h-24 rounded-full border-2 border-dashed border-white/15 flex flex-col items-center justify-center cursor-pointer hover:border-brand-orange/50 transition-colors overflow-hidden group"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-white/30 group-hover:text-brand-orange/60 transition-colors mb-1" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-white/30 group-hover:text-brand-orange/60 transition-colors">
                      Foto
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Campos */}
            <div className="space-y-3">
              <Input
                placeholder="Nombre"
                className="glass-input h-13 px-5 text-base"
                value={newPlayer.name}
                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
              />
              <Input
                placeholder="Apellido"
                className="glass-input h-13 px-5 text-base"
                value={newPlayer.lastName}
                onChange={(e) => setNewPlayer({ ...newPlayer, lastName: e.target.value })}
              />
              <Input
                placeholder="Número (0-99)"
                type="number"
                min={0}
                max={99}
                step={1}
                className="glass-input h-13 px-5 text-base text-center font-display font-bold text-xl"
                value={newPlayer.number}
                onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value })}
              />

              {(() => {
                const canAdd = !rosterLocked && players.length < MAX_PLAYERS && !!newPlayer.name.trim() && !!newPlayer.lastName.trim() && !!newPlayer.number && !!selectedTeamId && !addMutation.isPending;
                return (
                  <Button
                    onClick={addPlayer}
                    disabled={!canAdd}
                    className={`w-full rounded-full h-12 font-bold text-base mt-1 transition-all duration-300 ${
                      canAdd
                        ? "bg-brand-orange hover:bg-brand-orange/85 text-white glow-orange"
                        : "bg-white/6 text-white/25 border border-white/8 cursor-not-allowed"
                    }`}
                  >
                    <Plus className="mr-2 w-4 h-4" />Agregar al Roster
                  </Button>
                );
              })()}
            </div>

            {/* Finalizar / Estado del roster */}
            <div className="mt-7 pt-7 border-t border-white/10">
              {selectedTeam?.rosterLocked ? (
                <div className="w-full rounded-full h-14 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 font-bold text-base">
                  <Check className="w-4 h-4" />
                  ROSTER FINALIZADO
                </div>
              ) : rosterStatus === "locked" ? (
                <div className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 bg-red-500/8 border border-red-500/20 text-red-400/80 text-sm font-medium">
                  <Trophy className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Registro cerrado — jornada {lockJornada} superada.
                    {transferJornada !== null && ` Ventana de traspasos abre en jornada ${transferJornada}.`}
                  </span>
                </div>
              ) : rosterStatus === "transfer_window" ? (
                <div className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 bg-brand-orange/8 border border-brand-orange/25 text-brand-orange/80 text-sm font-medium">
                  <Trophy className="w-4 h-4 flex-shrink-0" />
                  Ventana de traspasos activa — puedes hacer altas y bajas
                </div>
              ) : (
                <>
                  <Button
                    onClick={() => isComplete && lockMutation.mutate()}
                    disabled={!isComplete || lockMutation.isPending}
                    className={`w-full rounded-full h-14 text-lg font-bold transition-all duration-500 ${
                      isComplete
                        ? "bg-brand-orange hover:bg-brand-orange/90 text-white glow-orange-strong"
                        : "bg-white/5 text-white/20 cursor-not-allowed border border-white/8"
                    }`}
                  >
                    FINALIZAR ROSTER
                  </Button>
                  {!isComplete && (
                    <p className="text-center text-red-400/70 text-xs mt-3 font-medium">
                      Faltan {remaining} jugador{remaining !== 1 ? "es" : ""} mínimo
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Tarjetas de jugadores ───────────────────────────────────────── */}
        <div className="md:col-span-1 lg:col-span-2">
          {isLoading ? (
            <div className="text-center text-white/40 py-12">Cargando jugadores...</div>
          ) : players.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/8 rounded-3xl">
              <User className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-semibold">Aún no hay jugadores</p>
              <p className="text-xs mt-1 opacity-60">Agrega el primero usando el formulario</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="relative glass-panel overflow-hidden group hover:border-brand-orange/20 transition-all duration-200"
                >
                  <div className="absolute -right-3 -top-3 text-8xl font-display font-black text-white/[0.04] select-none pointer-events-none leading-none">
                    {player.number}
                  </div>

                  <div className="relative z-10 p-5 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-white/5 border-2 border-brand-orange/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {player.photoUrl ? (
                        <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-9 h-9 text-white/25" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-brand-orange font-display font-bold text-xl mb-0.5">#{player.number}</div>
                      <div className="text-lg font-bold uppercase leading-tight truncate">{player.name}</div>
                      <div className="text-sm text-white/50 uppercase leading-tight truncate">{player.lastName}</div>
                    </div>
                  </div>

                  <div className="relative z-10 bg-black/35 px-5 py-3 border-t border-white/5 flex justify-between">
                    {[
                      { label: "PTS", value: "—" },
                      { label: "FLT", value: "—" },
                      { label: "AST", value: "—" },
                    ].map((stat, i, arr) => (
                      <React.Fragment key={stat.label}>
                        <div className="text-center">
                          <div className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-1">{stat.label}</div>
                          <div className="font-display font-bold text-base text-white/80">{stat.value}</div>
                        </div>
                        {i < arr.length - 1 && <div className="w-px bg-white/8 self-stretch" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
