import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { apiGet, apiPut } from "@/lib/apiClient";
import { sileo } from "sileo";
import {
  Radio, Link2, Check, X, PlayCircle, Tv, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface MatchStream {
  id: string;
  jornada: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  scheduledAt: string;
  status: "upcoming" | "live" | "finished" | "suspended";
  streamUrl: string | null;
}

// ---------------------------------------------------------------------------
// Detecta plataforma desde una URL
// ---------------------------------------------------------------------------
function detectPlatform(url: string): "youtube" | "twitch" | "facebook" | "other" {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/twitch\.tv/.test(url)) return "twitch";
  if (/facebook\.com/.test(url)) return "facebook";
  return "other";
}

function PlatformIcon({ url }: { url: string }) {
  const p = detectPlatform(url);
  if (p === "youtube") return <PlayCircle className="w-4 h-4 text-red-400" />;
  if (p === "twitch")  return <Tv        className="w-4 h-4 text-purple-400" />;
  return <Link2 className="w-4 h-4 text-sky-400" />;
}

function platformLabel(url: string) {
  const p = detectPlatform(url);
  if (p === "youtube") return "YouTube";
  if (p === "twitch")  return "Twitch";
  if (p === "facebook") return "Facebook";
  return "Enlace externo";
}

// ---------------------------------------------------------------------------
// Tarjeta de partido con editor de stream URL
// ---------------------------------------------------------------------------
function MatchStreamCard({
  match,
  onSave,
  onStatusChange,
}: {
  match: MatchStream;
  onSave: (id: string, url: string | null) => void;
  onStatusChange: (id: string, status: "live" | "upcoming") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(match.streamUrl ?? "");

  const d = new Date(match.scheduledAt);
  const date = d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });

  const handleSave = () => {
    const trimmed = draft.trim() || null;
    onSave(match.id, trimmed);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(match.streamUrl ?? "");
    setEditing(false);
  };

  const statusColor = {
    live:      "bg-brand-orange/20 border-brand-orange/40 text-brand-orange",
    upcoming:  "bg-white/6 border-white/10 text-white/40",
    finished:  "bg-white/4 border-white/8 text-white/20",
    suspended: "bg-red-500/10 border-red-500/20 text-red-400/60",
  }[match.status];

  const statusLabel = {
    live:      "En vivo",
    upcoming:  "Próximo",
    finished:  "Finalizado",
    suspended: "Suspendido",
  }[match.status];

  return (
    <div className={`glass-panel p-4 rounded-2xl transition-all ${match.status === "live" ? "border border-brand-orange/25 shadow-[0_0_20px_rgba(251,146,60,0.12)]" : ""}`}>
      <div className="flex items-start gap-3">

        {/* Info del partido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
              {statusLabel}
            </span>
            <span className="text-[10px] text-white/25 font-semibold">J{match.jornada} · {date} · {time}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{match.homeTeam.name}</span>
            <span className="text-white/25 text-xs font-bold">vs</span>
            <span className="font-bold text-white text-sm">{match.awayTeam.name}</span>
          </div>
        </div>

        {/* Acciones (si no está editando) */}
        {!editing && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Poner en vivo / Finalizar transmisión */}
            {match.status === "upcoming" && (
              <Button
                size="sm"
                onClick={() => onStatusChange(match.id, "live")}
                className="rounded-full h-7 px-3 text-[11px] font-bold bg-brand-orange hover:bg-brand-orange/85 text-white glow-orange"
              >
                🔴 En vivo
              </Button>
            )}
            {match.status === "live" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStatusChange(match.id, "upcoming")}
                className="rounded-full h-7 px-3 text-[11px] font-bold border border-white/15 text-white/50 hover:text-white hover:bg-white/8"
              >
                ⏹ Finalizar
              </Button>
            )}
            {/* Editar enlace */}
            {match.status !== "finished" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                className="rounded-full h-7 px-3 text-[11px] font-bold border border-white/10 hover:border-brand-orange/40 hover:text-brand-orange transition-all"
              >
                {match.streamUrl ? "Editar" : "+ Enlace"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* URL actual */}
      {!editing && match.streamUrl && (
        <div className="mt-3 flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3 py-2">
          <PlatformIcon url={match.streamUrl} />
          <span className="text-[11px] text-white/60 font-medium flex-1 truncate">
            {platformLabel(match.streamUrl)}
          </span>
          <a
            href={match.streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Editor inline */}
      {editing && (
        <div className="mt-3 space-y-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://youtube.com/watch?v=... o https://twitch.tv/canal"
            className="glass-input h-10 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              className="rounded-full h-8 px-4 bg-brand-orange hover:bg-brand-orange/85 text-white text-[12px] font-bold flex items-center gap-1.5 glow-orange"
            >
              <Check className="w-3 h-3" /> Guardar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="rounded-full h-8 px-3 border border-white/10 text-[12px] flex items-center gap-1.5 hover:bg-white/8"
            >
              <X className="w-3 h-3" /> Cancelar
            </Button>
            {match.streamUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { onSave(match.id, null); setEditing(false); setDraft(""); }}
                className="rounded-full h-8 px-3 text-[12px] text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20 ml-auto"
              >
                Quitar enlace
              </Button>
            )}
          </div>
          {draft && (
            <div className="flex items-center gap-2 text-[11px] text-white/30">
              <PlatformIcon url={draft} />
              <span>Detectado: {platformLabel(draft)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function StreamPage() {
  const qc = useQueryClient();

  const { data: matches = [], isLoading } = useQuery<MatchStream[]>({
    queryKey: ["/api/matches"],
    queryFn: () => apiGet<MatchStream[]>("/api/matches"),
  });

  const streamMutation = useMutation({
    mutationFn: ({ id, streamUrl }: { id: string; streamUrl: string | null }) =>
      apiPut(`/api/matches/${id}`, { streamUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/matches"] });
      sileo.success({ title: "Enlace actualizado" });
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "live" | "upcoming" }) =>
      apiPut(`/api/matches/${id}`, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["/api/matches"] });
      sileo.success({ title: status === "live" ? "¡Transmisión en vivo!" : "Transmisión finalizada" });
    },
    onError: (e) => sileo.error({ title: "Error", description: (e as Error).message }),
  });

  // Agrupar por jornada, ordenar por jornada asc
  const byJornada = matches
    .filter((m) => m.status !== "suspended" && m.status !== "finished")
    .reduce<Record<number, MatchStream[]>>((acc, m) => {
      (acc[m.jornada] ??= []).push(m);
      return acc;
    }, {});

  const sortedJornadas = Object.keys(byJornada)
    .map(Number)
    .sort((a, b) => a - b);

  // Resaltar la jornada activa (live o la próxima con upcoming)
  const activeJornada = sortedJornadas.find((j) =>
    byJornada[j].some((m) => m.status === "live" || m.status === "upcoming"),
  ) ?? sortedJornadas[sortedJornadas.length - 1];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center">
          <Radio className="w-5 h-5 text-brand-orange" />
        </div>
        <SectionTitle whiteText="Gestión de" orangeText="Transmisiones" className="mb-0 leading-tight" />
      </div>

      {isLoading ? (
        <div className="text-center text-white/30 py-12">Cargando partidos...</div>
      ) : sortedJornadas.length === 0 ? (
        <div className="text-center text-white/30 py-12">No hay partidos registrados.</div>
      ) : (
        <div className="space-y-8">
          {sortedJornadas.map((jornada) => (
            <div key={jornada}>
              {/* Encabezado de jornada */}
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-sm font-black uppercase tracking-wider ${jornada === activeJornada ? "text-brand-orange" : "text-white/30"}`}>
                  Jornada {jornada}
                </span>
                {jornada === activeJornada && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-orange">
                    Activa
                  </span>
                )}
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-[10px] text-white/20">
                  {byJornada[jornada].filter((m) => m.streamUrl).length}/{byJornada[jornada].length} con enlace
                </span>
              </div>

              <div className="space-y-3">
                {byJornada[jornada]
                  .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                  .map((match) => (
                    <MatchStreamCard
                      key={match.id}
                      match={match}
                      onSave={(id, url) => streamMutation.mutate({ id, streamUrl: url })}
                      onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leyenda de plataformas */}
      <div className="mt-10 glass-panel px-4 py-3 rounded-2xl flex items-center gap-4 flex-wrap">
        <span className="text-[10px] text-white/25 font-bold uppercase tracking-widest">Soportado</span>
        <span className="flex items-center gap-1.5 text-[11px] text-red-400/70"><PlayCircle className="w-3.5 h-3.5" /> YouTube</span>
        <span className="flex items-center gap-1.5 text-[11px] text-purple-400/70"><Tv className="w-3.5 h-3.5" /> Twitch</span>
        <span className="flex items-center gap-1.5 text-[11px] text-sky-400/70"><Link2 className="w-3.5 h-3.5" /> Facebook / Otro</span>
      </div>
    </div>
  );
}
