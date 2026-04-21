import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ChevronRight, FileText, LogIn, ExternalLink, Radio, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfiniteCarousel } from "@/components/home/InfiniteCarousel";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPut } from "@/lib/apiClient";
import { sileo } from "sileo";

interface ApiMatch {
  id: string;
  jornada: number;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  scoreHome: number | null;
  scoreAway: number | null;
  scheduledAt: string;
  status: "upcoming" | "live" | "finished" | "suspended";
  streamUrl: string | null;
  actaUrl:   string | null;
  stats: { playerId: string; pts: number; player: { name: string; lastName: string } }[];
}

// Genera URL de embed para el player en Home
function getEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
  const tw = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (tw) {
    const parent = window.location.hostname;
    return `https://player.twitch.tv/?channel=${tw[1]}&parent=${parent}&autoplay=true`;
  }
  if (/facebook\.com/.test(url)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&width=auto&show_text=false&autoplay=true`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: Bloque de TV — siempre visible, dos estados
// ---------------------------------------------------------------------------
function StreamSection({
  liveMatch,
  nextMatch,
  canManage,
  allMatches,
  activeJornada,
}: {
  liveMatch: ApiMatch | null;
  nextMatch: ApiMatch | null;
  canManage: boolean;
  allMatches: ApiMatch[];
  activeJornada: number | null;
}) {
  const isLive    = !!liveMatch;
  const embedUrl  = liveMatch?.streamUrl ? getEmbedUrl(liveMatch.streamUrl) : null;
  const showFrame = isLive && !!liveMatch?.streamUrl;

  const nextDate = nextMatch
    ? new Date(nextMatch.scheduledAt).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })
    : null;
  const nextTime = nextMatch
    ? new Date(nextMatch.scheduledAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="mt-8">
      {/* Título de sección */}
      <div className="flex items-end gap-4 mb-4">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter uppercase font-display leading-none flex items-baseline gap-x-2.5">
          <span className="text-white">Transmisión</span>
          {isLive
            ? <span className="text-brand-orange text-shadow-orange">En vivo</span>
            : <span className="text-white/20">Próxima</span>
          }
        </h2>
        {isLive && (
          <span className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
            <span className="text-[10px] font-bold text-brand-orange/70 uppercase tracking-widest">En curso</span>
          </span>
        )}
        {isLive && liveMatch?.streamUrl && (
          <a href={liveMatch.streamUrl} target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[11px] text-white/25 hover:text-white/50 transition-colors mb-0.5">
            <ExternalLink className="w-3 h-3" /> Abrir en nueva pestaña
          </a>
        )}
      </div>

      {/* Cuadro de TV */}
      <div className={`glass-panel overflow-hidden transition-all duration-500 ${
        isLive
          ? "border border-brand-orange/25 shadow-[0_0_30px_rgba(251,146,60,0.12)]"
          : "border border-white/8"
      }`}>
        {/* Barra superior: marcador (live) o próximo partido (idle) */}
        <div className="px-5 py-3 flex items-center gap-3 border-b border-white/8 bg-black/20">
          {isLive ? (
            <>
              <span className="font-bold text-white text-sm flex-1 text-right">{liveMatch!.homeTeam.name}</span>
              <span className="text-xl font-black text-brand-orange px-2">
                {liveMatch!.scoreHome ?? 0} — {liveMatch!.scoreAway ?? 0}
              </span>
              <span className="font-bold text-white text-sm flex-1">{liveMatch!.awayTeam.name}</span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand-orange flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" /> EN CURSO
              </span>
            </>
          ) : nextMatch ? (
            <>
              <span className="text-[10px] text-white/25 font-bold uppercase tracking-widest flex-shrink-0">Próximo</span>
              <span className="font-bold text-white/60 text-sm flex-1 text-right">{nextMatch.homeTeam.name}</span>
              <span className="text-white/20 text-xs font-bold px-1">vs</span>
              <span className="font-bold text-white/60 text-sm flex-1">{nextMatch.awayTeam.name}</span>
              <span className="text-[10px] text-white/25 flex-shrink-0">{nextDate} · {nextTime}</span>
            </>
          ) : (
            <span className="text-[11px] text-white/20 mx-auto">Sin partidos programados</span>
          )}
        </div>

        {/* Pantalla */}
        <div className="aspect-video bg-black relative">
          {showFrame && embedUrl ? (
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
              title={`${liveMatch!.homeTeam.name} vs ${liveMatch!.awayTeam.name}`} />
          ) : showFrame && !embedUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <a href={liveMatch!.streamUrl ?? "#"} target="_blank" rel="noopener noreferrer"
                className="px-6 py-3 rounded-full bg-brand-orange text-white font-bold text-sm hover:bg-brand-orange/85 transition-all glow-orange">
                Ver transmisión ↗
              </a>
            </div>
          ) : (
            /* Pantalla apagada */
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 select-none">
              <div className="w-12 h-12 rounded-full border border-white/8 flex items-center justify-center">
                <Radio className="w-5 h-5 text-white/10" />
              </div>
              <p className="text-[12px] text-white/15 font-medium">Sin transmisión activa</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel de gestión — solo para el encargado */}
      {canManage && (
        <StreamManagerPanel matches={allMatches} activeJornada={activeJornada} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: Formulario de stream — solo visible al transmisor
// ---------------------------------------------------------------------------
function StreamManagerPanel({ matches, activeJornada }: { matches: ApiMatch[]; activeJornada: number | null }) {
  const qc = useQueryClient();
  const [open,  setOpen]  = useState(false);
  const [draft, setDraft] = useState("");
  const [selId, setSelId] = useState<string>("");

  const candidates = matches
    .filter((m) => m.jornada === activeJornada && m.status !== "suspended" && m.status !== "finished")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const selected = candidates.find((m) => m.id === selId) ?? candidates[0];

  const mutation = useMutation({
    mutationFn: ({ id, streamUrl }: { id: string; streamUrl: string | null }) =>
      apiPut(`/api/matches/${id}`, { streamUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/matches"] });
      sileo.success({ title: "Enlace actualizado" });
      setOpen(false);
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "live" | "upcoming" }) =>
      apiPut(`/api/matches/${id}`, { status }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/matches"] });
      sileo.success({ title: vars.status === "live" ? "¡Partido EN VIVO! 🔴" : "Transmisión finalizada" });
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  if (candidates.length === 0) return null;

  return (
    <div className="mt-6">
      {/* Botón para abrir/cerrar */}
      <button
        onClick={() => { setOpen(!open); if (!open && selected) setDraft(selected.streamUrl ?? ""); }}
        className="flex items-center gap-2 text-[11px] text-white/25 hover:text-white/50 transition-colors"
      >
        <Radio className="w-3.5 h-3.5" />
        <span className="font-bold uppercase tracking-widest">Gestionar transmisión</span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="mt-3 glass-panel p-4 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Selector de partido (si hay más de uno) */}
          {candidates.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Partido</label>
              <div className="flex flex-col gap-1.5">
                {candidates.map((m) => {
                  const d = new Date(m.scheduledAt).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
                  const t = new Date(m.scheduledAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
                  const isSelected = (selId || candidates[0].id) === m.id;
                  return (
                    <button key={m.id} onClick={() => { setSelId(m.id); setDraft(m.streamUrl ?? ""); }}
                      className={`text-left px-3 py-2 rounded-xl border text-sm transition-all ${
                        isSelected ? "border-brand-orange/40 bg-brand-orange/10 text-white" : "border-white/8 bg-white/3 text-white/50 hover:bg-white/6"
                      }`}>
                      <span className="font-bold">{m.homeTeam.name} vs {m.awayTeam.name}</span>
                      <span className="text-[11px] text-white/30 ml-2">{d} · {t}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input de URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
              URL de transmisión {selected && `· ${selected.homeTeam.name} vs ${selected.awayTeam.name}`}
            </label>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://youtube.com/watch?v=... · twitch.tv/canal · facebook.com/..."
              className="glass-input h-10 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter" && selected) mutation.mutate({ id: selected.id, streamUrl: draft.trim() || null }); }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => selected && mutation.mutate({ id: selected.id, streamUrl: draft.trim() || null })}
              disabled={mutation.isPending || !selected}
              className="rounded-full h-9 px-5 bg-brand-orange hover:bg-brand-orange/85 text-white font-bold text-sm flex items-center gap-1.5 glow-orange"
            >
              <Check className="w-3.5 h-3.5" />
              {mutation.isPending ? "Guardando…" : "Guardar enlace"}
            </Button>
            {selected?.streamUrl && (
              selected?.status === "live" ? (
                <Button variant="ghost" size="sm"
                  onClick={() => selected && statusMutation.mutate({ id: selected.id, status: "upcoming" })}
                  disabled={statusMutation.isPending}
                  className="rounded-full h-9 px-4 text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-sm font-bold">
                  ⬛ Terminar transmisión
                </Button>
              ) : (
                <Button variant="ghost" size="sm"
                  onClick={() => selected && statusMutation.mutate({ id: selected.id, status: "live" })}
                  disabled={statusMutation.isPending}
                  className="rounded-full h-9 px-4 text-brand-orange bg-brand-orange/10 border border-brand-orange/30 hover:bg-brand-orange/20 text-sm font-bold">
                  🔴 Marcar EN VIVO
                </Button>
              )
            )}
            {selected?.streamUrl && (
              <Button variant="ghost" size="sm"
                onClick={() => selected && mutation.mutate({ id: selected.id, streamUrl: null })}
                className="rounded-full h-9 px-4 text-white/30 hover:text-red-400 border border-white/10 hover:border-red-500/30 text-sm">
                Quitar enlace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: Tarjeta de resultado reciente
// ---------------------------------------------------------------------------
function ResultCard({ match }: { match: ApiMatch }) {
  const [open, setOpen] = useState(false);
  const scoreA = match.scoreHome ?? 0;
  const scoreB = match.scoreAway ?? 0;
  const winnerA = scoreA > scoreB;

  const topA = match.stats
    .filter((s) => {
      // we need to figure out which team this player is on - use pts sort
      return true;
    })
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);

  const date = new Date(match.scheduledAt).toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={`rounded-[14px] overflow-hidden transition-all duration-200 cursor-pointer
        ${open
          ? "bg-white/8 border border-brand-orange/20"
          : "bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20"
        }`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-[10px] text-white/25 font-bold uppercase min-w-[44px]">
          {date}
        </span>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Equipo local */}
          <div className="flex items-center gap-2 min-w-[80px]">
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0">
              {match.homeTeam.name.charAt(0)}
            </div>
            <span className={`text-[12px] font-bold truncate ${winnerA ? "text-white" : "text-white/40"}`}>
              {match.homeTeam.name}
            </span>
          </div>

          {/* Marcador */}
          <div className="flex items-center gap-1.5 mx-1">
            <span className={`text-[15px] font-black ${winnerA ? "text-brand-orange" : "text-white/30"}`}>
              {scoreA}
            </span>
            <span className="text-[11px] text-white/15">-</span>
            <span className={`text-[15px] font-black ${!winnerA ? "text-brand-orange" : "text-white/30"}`}>
              {scoreB}
            </span>
          </div>

          {/* Equipo visitante */}
          <div className="flex items-center gap-2 min-w-[80px]">
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0">
              {match.awayTeam.name.charAt(0)}
            </div>
            <span className={`text-[12px] font-bold truncate ${!winnerA ? "text-white" : "text-white/40"}`}>
              {match.awayTeam.name}
            </span>
          </div>
        </div>

        <ChevronRight
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-90 text-brand-orange" : "text-white/20"
          }`}
        />
      </div>

      {open && (
        <div
          className="px-4 pb-4 pt-1 border-t border-white/7"
          onClick={(e) => e.stopPropagation()}
        >
          {topA.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              <p className="text-[9px] text-white/25 font-bold uppercase tracking-widest mb-2">
                Anotadores
              </p>
              {topA.map((s, i) => (
                <div
                  key={s.playerId}
                  className="flex items-center gap-2 bg-black/20 rounded-lg px-2.5 py-1.5"
                >
                  <span className="text-[10px] text-white/20 font-bold w-3 text-center">{i + 1}</span>
                  <span className="text-[11px] font-medium text-white/65 flex-1 truncate">
                    {s.player.name} {s.player.lastName}
                  </span>
                  <span className="text-[12px] font-black text-brand-orange">{s.pts}pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-white/25 mt-3">Sin estadísticas registradas</p>
          )}

          {match.actaUrl ? (
            <a href={match.actaUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 mt-3 text-[11px] text-brand-orange/70 font-semibold hover:text-brand-orange transition-colors">
              <FileText className="w-3 h-3" />
              Ver acta PDF
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PÁGINA PRINCIPAL
// ---------------------------------------------------------------------------
export default function HomePage() {
  const { user } = useAuth();

  const { data: allMatches = [] } = useQuery<ApiMatch[]>({
    queryKey: ["/api/matches"],
    queryFn: () => apiGet<ApiMatch[]>("/api/matches"),
  });

  // Jornada activa = la de menor número con partidos upcoming/live
  const activeJornada = (() => {
    const active = allMatches
      .filter((m) => m.status === "live" || m.status === "upcoming")
      .map((m) => m.jornada);
    if (active.length > 0) return Math.min(...active);
    const nums = allMatches.map((m) => m.jornada);
    return nums.length > 0 ? Math.max(...nums) : null;
  })();

  const liveMatch = allMatches.find((m) => m.status === "live") ?? null;

  // Próximo partido de la jornada activa
  const nextMatch = allMatches
    .filter((m) => m.jornada === activeJornada && m.status === "upcoming")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null;

  const canManage = user?.role === "admin" || !!user?.permissions?.stream?.edit;

  // Partidos de la jornada anterior (solo finalizados)
  const prevJornada = activeJornada !== null ? activeJornada - 1 : null;
  const prevResults = prevJornada !== null
    ? allMatches.filter((m) => m.jornada === prevJornada && m.status === "finished")
    : [];

  return (
    <div className="container mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <SectionTitle whiteText="Torneo" orangeText="Municipal" as="h1" />

        {!user && (
          <Link href="/login">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/6 border border-white/12 text-white/60 hover:bg-brand-orange/15 hover:border-brand-orange/40 hover:text-white transition-all duration-200 text-sm font-semibold mt-1 flex-shrink-0">
              <LogIn className="w-4 h-4" />
              Iniciar sesión
            </button>
          </Link>
        )}
      </div>

      {/* Carrusel de partidos */}
      <InfiniteCarousel />

      {/* Sección de transmisión — siempre visible */}
      <StreamSection
        liveMatch={liveMatch}
        nextMatch={nextMatch}
        canManage={canManage}
        allMatches={allMatches}
        activeJornada={activeJornada}
      />

      {/* Resultados de la jornada anterior */}
      {prevResults.length > 0 && (
        <div className="mt-8 max-w-md mx-auto">
          <p className="text-xs text-brand-orange/60 font-bold uppercase tracking-widest mb-3">
            Jornada {prevJornada} — Resultados
          </p>
          <div className="flex flex-col gap-4">
            {prevResults.map((match) => (
              <ResultCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
