export type MatchStatus = "live" | "finished" | "upcoming";

export interface Match {
  id: string;
  jornada: number;
  teamA: string;
  teamB: string;
  dayLabel: string; // e.g. "Lun 13 Abr"
  time: string;     // "HH:MM"
  scoreA: number | null;
  scoreB: number | null;
  status: MatchStatus;
  streamUrl: string | null;
  actaUrl:   string | null;
}

export const TEAM_CONFIG: Record<string, { emoji: string; bg: string }> = {
  Lakers:   { emoji: "🟡", bg: "rgba(85,37,130,0.35)"   },
  Bulls:    { emoji: "🐂", bg: "rgba(206,17,65,0.25)"   },
  Warriors: { emoji: "⚡", bg: "rgba(29,66,138,0.3)"    },
  Celtics:  { emoji: "☘️", bg: "rgba(0,122,51,0.3)"     },
  Heat:     { emoji: "🔥", bg: "rgba(152,0,46,0.3)"     },
  Knicks:   { emoji: "🏙️", bg: "rgba(0,107,182,0.25)"  },
  Suns:     { emoji: "☀️", bg: "rgba(229,95,32,0.25)"   },
  Mavs:     { emoji: "🐴", bg: "rgba(0,83,188,0.25)"    },
};

export const DEFAULT_TEAM = { emoji: "🏀", bg: "rgba(255,255,255,0.08)" };

export const CAROUSEL_SPEED = 0.03;

export function getWinner(match: Match): string | null {
  if (match.scoreA === null || match.scoreB === null) return null;
  return match.scoreA > match.scoreB ? match.teamA : match.teamB;
}

/** Converts an API match to the carousel Match format */
export function apiMatchToCarouselMatch(m: {
  id: string;
  jornada: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  scoreHome: number | null;
  scoreAway: number | null;
  scheduledAt: string;
  status: MatchStatus;
  streamUrl?: string | null;
  actaUrl?:   string | null;
}): Match {
  const d = new Date(m.scheduledAt);
  const dayLabel = d.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return {
    id: m.id,
    jornada: m.jornada,
    teamA: m.homeTeam.name,
    teamB: m.awayTeam.name,
    dayLabel,
    time,
    scoreA: m.scoreHome,
    scoreB: m.scoreAway,
    status: m.status,
    streamUrl: m.streamUrl ?? null,
    actaUrl:   m.actaUrl   ?? null,
  };
}
