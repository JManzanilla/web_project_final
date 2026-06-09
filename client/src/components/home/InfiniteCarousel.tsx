import React, { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Match, MatchStatus,
  CAROUSEL_SPEED,
  apiMatchToCarouselMatch,
  matchGroupLabel,
} from "@/types/carousel.types";
import { MatchCard } from "./MatchCard";
import { MatchModal } from "./MatchModal";
import { apiGet } from "@/lib/apiClient";

interface ApiMatch {
  id: string;
  jornada: number;
  phase: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  scoreHome: number | null;
  scoreAway: number | null;
  scheduledAt: string;
  status: "upcoming" | "live" | "finished" | "suspended";
  streamUrl: string | null;
  actaUrl: string | null;
}

type ActiveGroup = { jornada: number; phase: string };

/** Grupo activo = partido EN VIVO > próximo upcoming > último registrado */
function getActiveGroup(all: ApiMatch[]): ActiveGroup | null {
  if (all.length === 0) return null;

  const live = all.find((m) => m.status === "live");
  if (live) return { jornada: live.jornada, phase: live.phase };

  const now = Date.now();
  const upcoming = all
    .filter((m) => m.status === "upcoming" && m.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const next = upcoming.find((m) => new Date(m.scheduledAt).getTime() >= now);
  if (next) return { jornada: next.jornada, phase: next.phase };

  if (upcoming.length > 0) {
    const last = upcoming[upcoming.length - 1];
    return { jornada: last.jornada, phase: last.phase };
  }

  const fallback = [...all].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
  return fallback ? { jornada: fallback.jornada, phase: fallback.phase } : null;
}

export const InfiniteCarousel: React.FC = () => {
  const { data: apiMatches = [] } = useQuery<ApiMatch[]>({
    queryKey: ["/api/matches"],
    queryFn: () => apiGet<ApiMatch[]>("/api/matches"),
  });

  // Filtrar solo el grupo activo (jornada + fase, sin suspendidos)
  const activeGroup = getActiveGroup(apiMatches);
  const weekMatches = apiMatches.filter(
    (m) => m.jornada === activeGroup?.jornada && m.phase === activeGroup?.phase && m.status !== "suspended",
  );

  const matches: Match[] = weekMatches.map(apiMatchToCarouselMatch);

  const trackRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);
  const lastRef = useRef<number | null>(null);
  const hoveredRef = useRef(false);
  const modalOpenRef = useRef(false);
  const rafRef = useRef<number>(0);

  const dragActiveRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragLastXRef = useRef(0);
  const pointerDownRef = useRef(false);

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<MatchStatus>("upcoming");

  const isPaused = () => hoveredRef.current || modalOpenRef.current || dragActiveRef.current;

  useEffect(() => {
    if (matches.length === 0) return;
    const step = (ts: number) => {
      const track = trackRef.current;
      if (track && !isPaused()) {
        if (!lastRef.current) lastRef.current = ts;
        const dt = ts - lastRef.current;
        xRef.current -= CAROUSEL_SPEED * dt;
        const cardW = track.firstElementChild
          ? (track.firstElementChild as HTMLElement).offsetWidth + 16
          : 268;
        const setWidth = cardW * matches.length;
        if (Math.abs(xRef.current) >= setWidth) xRef.current += setWidth;
        track.style.transform = `translateX(${xRef.current}px)`;
      }
      lastRef.current = isPaused() ? null : ts;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [matches.length]);

  const handleHover = useCallback((val: boolean) => {
    hoveredRef.current = val;
    lastRef.current = null;
  }, []);

  const handleCardClick = useCallback((match: Match, status: MatchStatus) => {
    if (dragMovedRef.current) { dragMovedRef.current = false; return; }
    setSelectedMatch(match);
    setSelectedStatus(status);
    modalOpenRef.current = true;
    lastRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    setSelectedMatch(null);
    modalOpenRef.current = false;
    lastRef.current = null;
  }, []);

  const handlePointerDown = useCallback((clientX: number) => {
    pointerDownRef.current = true;
    dragActiveRef.current = true;
    dragMovedRef.current = false;
    dragStartXRef.current = clientX;
    dragLastXRef.current = clientX;
    hoveredRef.current = false;
    lastRef.current = null;
  }, []);

  const handlePointerMove = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!pointerDownRef.current || !track) return;
    const dx = clientX - dragLastXRef.current;
    if (Math.abs(clientX - dragStartXRef.current) > 6) dragMovedRef.current = true;
    xRef.current += dx;
    const cardW = track.firstElementChild
      ? (track.firstElementChild as HTMLElement).offsetWidth + 16
      : 268;
    const setWidth = cardW * matches.length;
    while (xRef.current > 0) xRef.current -= setWidth;
    while (xRef.current <= -setWidth) xRef.current += setWidth;
    track.style.transform = `translateX(${xRef.current}px)`;
    dragLastXRef.current = clientX;
  }, [matches.length]);

  const handlePointerUp = useCallback(() => {
    pointerDownRef.current = false;
    dragActiveRef.current = false;
    lastRef.current = null;
  }, []);

  if (matches.length === 0) {
    return (
      <div className="py-6">
        <p className="text-xs text-brand-orange/60 uppercase tracking-widest font-bold mb-1">Semana actual</p>
        <div className="text-white/20 text-sm py-4">No hay partidos programados esta semana.</div>
      </div>
    );
  }

  // 4 copias para loop invisible en cualquier pantalla
  const displayMatches = [...matches, ...matches, ...matches, ...matches];

  return (
    <>
      <div className="mb-1 flex items-center gap-3">
        <p className="text-xs text-brand-orange/60 uppercase tracking-widest font-bold">
          {activeGroup ? matchGroupLabel(activeGroup.jornada, activeGroup.phase) : ""}
        </p>
        {apiMatches.some((m) => m.status === "live") && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-brand-orange bg-brand-orange/10 border border-brand-orange/25 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
            EN VIVO
          </span>
        )}
      </div>

      <p className="text-[10px] text-white/20 font-semibold mb-1 md:hidden">
        ← Desliza para ver más partidos →
      </p>

      <div
        className="overflow-hidden w-full py-3.5 select-none touch-pan-y"
        onMouseEnter={() => handleHover(true)}
        onMouseLeave={() => { handleHover(false); handlePointerUp(); }}
        onMouseDown={(e) => handlePointerDown(e.clientX)}
        onMouseMove={(e) => handlePointerMove(e.clientX)}
        onMouseUp={handlePointerUp}
        onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
        onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerUp}
      >
        <div ref={trackRef} className="flex gap-4 w-max">
          {displayMatches.map((match, idx) => (
            <MatchCard
              key={`${match.id}-${idx}`}
              match={match}
              status={match.status}
              selected={selectedMatch?.id === match.id}
              onHoverChange={handleHover}
              onClick={() => handleCardClick(match, match.status)}
            />
          ))}
        </div>
      </div>

      {selectedMatch && (
        <MatchModal match={selectedMatch} status={selectedStatus} onClose={handleClose} />
      )}
    </>
  );
};
