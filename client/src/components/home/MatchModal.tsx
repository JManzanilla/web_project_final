import { useState } from "react";
import { Match, MatchStatus, getWinner } from "@/types/carousel.types";
import { TeamLogo } from "./TeamLogo";
import { X, FileText } from "lucide-react";

// ---------------------------------------------------------------------------
// Genera la URL de embed según la plataforma
// ---------------------------------------------------------------------------
function getEmbedUrl(url: string): string | null {
  // YouTube: watch?v=ID  o  youtu.be/ID  o  live/ID
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;

  // Twitch: twitch.tv/CHANNEL
  const tw = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (tw) {
    const parent = typeof window !== "undefined" ? window.location.hostname : "localhost";
    return `https://player.twitch.tv/?channel=${tw[1]}&parent=${parent}&autoplay=true`;
  }

  // Facebook Live
  if (/facebook\.com/.test(url)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&width=auto&show_text=false&autoplay=true`;
  }

  return null; // plataforma desconocida → abrir en nueva pestaña
}

// ---------------------------------------------------------------------------
// Modal de transmisión embebida
// ---------------------------------------------------------------------------
function StreamModal({
  match,
  onClose,
}: {
  match: Match;
  onClose: () => void;
}) {
  const embedUrl = match.streamUrl ? getEmbedUrl(match.streamUrl) : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl mx-4 animate-in zoom-in-90 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-brand-orange text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              EN VIVO
            </span>
            <span className="text-sm font-bold text-white/70">
              {match.teamA} vs {match.teamB}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player */}
        <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
              title={`Transmisión: ${match.teamA} vs ${match.teamB}`}
            />
          ) : (
            /* Plataforma no embebible → botón para abrir en nueva pestaña */
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/40">
              <p className="text-sm">Esta transmisión no puede mostrarse aquí.</p>
              <a
                href={match.streamUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-full bg-brand-orange text-white text-sm font-bold hover:bg-brand-orange/85 transition-all"
              >
                Abrir transmisión ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de tarjeta de partido (carrusel)
// ---------------------------------------------------------------------------
export function MatchModal({
  match,
  status,
  onClose,
}: {
  match: Match;
  status: MatchStatus;
  onClose: () => void;
}) {
  const [showStream, setShowStream] = useState(false);
  const winner = getWinner(match);

  const hasStream = !!match.streamUrl;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={[
            "rounded-[28px] p-6 w-[360px] max-w-[calc(100vw-32px)] cursor-default animate-in zoom-in-90 duration-300",
            "bg-white/5 backdrop-blur-xl",
            status === "live"
              ? "border border-brand-orange shadow-[0_0_60px_rgba(255,69,0,0.35)]"
              : "border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
          ].join(" ")}
        >
          {/* Badge */}
          <div className="mb-5">
            {status === "live" ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-1.5 rounded-full bg-brand-orange text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                EN VIVO
              </span>
            ) : (
              <span className="inline-flex items-center text-[11px] font-semibold px-3.5 py-1.5 rounded-full bg-white/10 text-white/40">
                {match.dayLabel} · Finalizado
              </span>
            )}
          </div>

          {/* Equipos y marcador */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex flex-col items-center gap-2.5">
              <TeamLogo
                name={match.teamA}
                size={72}
                radius={18}
                dimmed={status === "finished" && winner !== match.teamA}
              />
              <span className={`text-[13px] font-semibold ${status === "finished" && winner === match.teamA ? "text-white" : "text-white/60"}`}>
                {match.teamA}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              {status === "live" ? (
                <>
                  <span className="text-[36px] font-extrabold text-brand-orange leading-none tracking-tight">
                    {match.scoreA} - {match.scoreB}
                  </span>
                  <span className="text-[10px] font-semibold text-brand-orange/70 bg-brand-orange/10 border border-brand-orange/25 px-2.5 py-0.5 rounded-full tracking-wide">
                    EN CURSO
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-1.5 leading-none">
                  <span className={`text-[36px] font-extrabold tracking-tight ${winner === match.teamA ? "text-brand-orange" : "text-white/30"}`}>
                    {match.scoreA}
                  </span>
                  <span className="text-[18px] text-white/20 font-light">-</span>
                  <span className={`text-[36px] font-extrabold tracking-tight ${winner === match.teamB ? "text-brand-orange" : "text-white/30"}`}>
                    {match.scoreB}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2.5">
              <TeamLogo
                name={match.teamB}
                size={72}
                radius={18}
                dimmed={status === "finished" && winner !== match.teamB}
              />
              <span className={`text-[13px] font-semibold ${status === "finished" && winner === match.teamB ? "text-white" : "text-white/60"}`}>
                {match.teamB}
              </span>
            </div>
          </div>

          {/* Ganador */}
          {status === "finished" && winner && (
            <p className="text-center text-[11px] text-white/40 bg-white/5 border border-white/8 rounded-xl py-2.5 mb-5">
              🏆 Ganador: <span className="text-white font-semibold">{winner}</span>
            </p>
          )}

          {/* Botón de acción */}
          {status === "live" && hasStream ? (
            <button
              onClick={() => setShowStream(true)}
              className="w-full h-[52px] rounded-full font-semibold text-[15px] text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-[0.88] active:scale-[0.97] bg-brand-orange glow-orange"
            >
              ▶ Ver transmisión en vivo
            </button>
          ) : status === "live" && !hasStream ? (
            <div className="w-full h-[52px] rounded-full bg-white/6 border border-white/10 flex items-center justify-center text-[13px] text-white/30">
              Transmisión no disponible aún
            </div>
          ) : status === "finished" && match.actaUrl ? (
            <a
              href={match.actaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-[52px] rounded-full font-semibold text-[15px] text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-[0.88] active:scale-[0.97] bg-white/10 border border-white/20 hover:bg-white/15"
            >
              <FileText className="w-4 h-4" /> Ver acta del partido
            </a>
          ) : (
            <div className="w-full h-[52px] rounded-full bg-white/4 border border-white/8 flex items-center justify-center text-[13px] text-white/20">
              Acta no disponible
            </div>
          )}
        </div>
      </div>

      {/* Stream embebido */}
      {showStream && (
        <StreamModal match={match} onClose={() => setShowStream(false)} />
      )}
    </>
  );
}
