import { useEffect, useRef, useCallback } from "react";
import { FileText } from "lucide-react";
import { CAROUSEL_SPEED } from "@/types/carousel.types";

interface ResultMatch {
  id: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  scoreHome: number | null;
  scoreAway: number | null;
  scheduledAt: string;
  actaUrl: string | null;
}

function ResultSlide({ match }: { match: ResultMatch }) {
  const scoreA = match.scoreHome ?? 0;
  const scoreB = match.scoreAway ?? 0;
  const winA   = scoreA > scoreB;

  const date = new Date(match.scheduledAt).toLocaleDateString("es-MX", {
    day: "numeric", month: "short",
  });

  return (
    <div className="flex-shrink-0 min-w-[min(220px,calc(100vw-80px))] bg-white/6 border border-white/12 rounded-2xl px-4 py-3 select-none">
      <div className="text-[9px] text-white/25 font-bold uppercase tracking-widest mb-2">{date}</div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-[11px] font-black text-white/50 flex-shrink-0">
            {match.homeTeam.name.charAt(0)}
          </div>
          <span className={`text-[10px] font-bold truncate w-full text-center ${winA ? "text-white" : "text-white/35"}`}>
            {match.homeTeam.name}
          </span>
        </div>

        <div className="flex flex-col items-center flex-shrink-0 px-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-xl font-black tabular-nums ${winA ? "text-brand-orange" : "text-white/25"}`}>{scoreA}</span>
            <span className="text-white/15 text-sm">-</span>
            <span className={`text-xl font-black tabular-nums ${!winA ? "text-brand-orange" : "text-white/25"}`}>{scoreB}</span>
          </div>
          <span className="text-[8px] text-white/20 uppercase tracking-widest">Final</span>
        </div>

        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-[11px] font-black text-white/50 flex-shrink-0">
            {match.awayTeam.name.charAt(0)}
          </div>
          <span className={`text-[10px] font-bold truncate w-full text-center ${!winA ? "text-white" : "text-white/35"}`}>
            {match.awayTeam.name}
          </span>
        </div>
      </div>

      {match.actaUrl && (
        <a href={match.actaUrl} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center justify-center gap-1 text-[9px] text-brand-orange/40 hover:text-brand-orange transition-colors">
          <FileText className="w-3 h-3" /> Acta
        </a>
      )}
    </div>
  );
}

export function ResultsCarousel({ matches }: { matches: ResultMatch[] }) {
  const trackRef  = useRef<HTMLDivElement>(null);
  const xRef      = useRef(0);
  const lastRef   = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const rafRef    = useRef<number>(0);

  const pointerDownRef  = useRef(false);
  const dragLastXRef    = useRef(0);
  const dragMovedRef    = useRef(false);
  const dragStartXRef   = useRef(0);

  const display = [...matches, ...matches, ...matches, ...matches];

  useEffect(() => {
    if (matches.length === 0) return;
    const step = (ts: number) => {
      const track = trackRef.current;
      if (track && !pausedRef.current) {
        if (!lastRef.current) lastRef.current = ts;
        const dt = ts - lastRef.current;
        xRef.current -= CAROUSEL_SPEED * dt;
        const cardW = track.firstElementChild
          ? (track.firstElementChild as HTMLElement).offsetWidth + 12
          : 232;
        const setWidth = cardW * matches.length;
        if (Math.abs(xRef.current) >= setWidth) xRef.current += setWidth;
        track.style.transform = `translateX(${xRef.current}px)`;
      }
      lastRef.current = pausedRef.current ? null : ts;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [matches.length]);

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
      ? (track.firstElementChild as HTMLElement).offsetWidth + 12
      : 232;
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
    <div
      className="overflow-hidden w-full py-2 select-none touch-pan-y"
      onMouseEnter={() => { pausedRef.current = true; lastRef.current = null; }}
      onMouseLeave={() => { pausedRef.current = false; lastRef.current = null; onPointerUp(); }}
      onMouseDown={(e) => onPointerDown(e.clientX)}
      onMouseMove={(e) => onPointerMove(e.clientX)}
      onMouseUp={onPointerUp}
      onTouchStart={(e) => onPointerDown(e.touches[0].clientX)}
      onTouchMove={(e) => onPointerMove(e.touches[0].clientX)}
      onTouchEnd={onPointerUp}
      onTouchCancel={onPointerUp}
    >
      <div ref={trackRef} className="flex gap-3 w-max">
        {display.map((match, idx) => (
          <ResultSlide key={`${match.id}-${idx}`} match={match} />
        ))}
      </div>
    </div>
  );
}
