import { useEffect, useRef, useCallback, useState } from "react";
import { CAROUSEL_SPEED, apiMatchToCarouselMatch, Match } from "@/types/carousel.types";
import { MatchCard } from "./MatchCard";
import { MatchModal } from "./MatchModal";

interface ResultMatch {
  id: string;
  jornada: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  scoreHome: number | null;
  scoreAway: number | null;
  scheduledAt: string;
  status: "upcoming" | "live" | "finished" | "suspended";
  streamUrl: string | null;
  actaUrl: string | null;
}

export function ResultsCarousel({ matches }: { matches: ResultMatch[] }) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const modalOpenRef = useRef(false);
  const trackRef     = useRef<HTMLDivElement>(null);
  const xRef         = useRef(0);
  const lastRef      = useRef<number | null>(null);
  const pausedRef    = useRef(false);
  const rafRef       = useRef<number>(0);

  const pointerDownRef = useRef(false);
  const dragLastXRef   = useRef(0);
  const dragMovedRef   = useRef(false);
  const dragStartXRef  = useRef(0);

  const carouselMatches = matches.map(apiMatchToCarouselMatch);
  const display = [...carouselMatches, ...carouselMatches, ...carouselMatches, ...carouselMatches];

  useEffect(() => {
    if (matches.length === 0) return;
    const step = (ts: number) => {
      const track = trackRef.current;
      if (track && !pausedRef.current) {
        if (!lastRef.current) lastRef.current = ts;
        const dt = ts - lastRef.current;
        xRef.current += CAROUSEL_SPEED * dt; // rightward (opposite to top carousel)
        const cardW = track.firstElementChild
          ? (track.firstElementChild as HTMLElement).offsetWidth + 16
          : 268;
        const setWidth = cardW * matches.length;
        if (xRef.current >= 0) xRef.current -= setWidth;
        track.style.transform = `translateX(${xRef.current}px)`;
      }
      lastRef.current = pausedRef.current ? null : ts;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [matches.length]);

  const onHoverChange = useCallback((val: boolean) => {
    pausedRef.current = val || modalOpenRef.current;
    lastRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    setSelectedMatch(null);
    modalOpenRef.current = false;
    lastRef.current = null;
  }, []);

  const onPointerDown = useCallback((clientX: number) => {
    pointerDownRef.current = true;
    pausedRef.current = true;
    dragMovedRef.current = false;
    dragStartXRef.current = clientX;
    dragLastXRef.current = clientX;
    lastRef.current = null;
  }, []);

  const onPointerMove = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!pointerDownRef.current || !track) return;
    if (Math.abs(clientX - dragStartXRef.current) > 6) dragMovedRef.current = true;
    const dx = clientX - dragLastXRef.current;
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

  const onPointerUp = useCallback(() => {
    pointerDownRef.current = false;
    pausedRef.current = false;
    lastRef.current = null;
  }, []);

  if (matches.length === 0) return null;

  return (
    <>
      <div
        className="overflow-hidden w-full py-3.5 select-none touch-pan-y"
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => { onHoverChange(false); onPointerUp(); }}
        onMouseDown={(e) => onPointerDown(e.clientX)}
        onMouseMove={(e) => onPointerMove(e.clientX)}
        onMouseUp={onPointerUp}
        onTouchStart={(e) => onPointerDown(e.touches[0].clientX)}
        onTouchMove={(e) => onPointerMove(e.touches[0].clientX)}
        onTouchEnd={onPointerUp}
        onTouchCancel={onPointerUp}
      >
        <div ref={trackRef} className="flex gap-4 w-max">
          {display.map((match, idx) => (
            <MatchCard
              key={`${match.id}-${idx}`}
              match={match}
              status="finished"
              selected={false}
              onHoverChange={onHoverChange}
              onClick={() => {
                if (!dragMovedRef.current) {
                  setSelectedMatch(match);
                  modalOpenRef.current = true;
                  lastRef.current = null;
                }
              }}
            />
          ))}
        </div>
      </div>

      {selectedMatch && (
        <MatchModal match={selectedMatch} status="finished" onClose={handleClose} />
      )}
    </>
  );
}
