import { TEAM_CONFIG, DEFAULT_TEAM } from "@/types/carousel.types";

export function TeamLogo({
  name,
  size = 48,
  radius = 12,
  dimmed = false,
}: {
  name: string;
  size?: number;
  radius?: number;
  dimmed?: boolean;
}) {
  const cfg = TEAM_CONFIG[name] ?? DEFAULT_TEAM;
  return (
    <div
      className="flex items-center justify-center relative flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: cfg.bg,
        filter: dimmed ? "grayscale(0.5) brightness(0.7)" : undefined,
      }}
    >
      <span style={{ fontSize: size * 0.46 }}>{cfg.emoji}</span>
      <span
        className="absolute inset-0 border border-white/10 pointer-events-none"
        style={{ borderRadius: radius }}
      />
    </div>
  );
}
