export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { requireAuth, ok, err } from "@/lib/api";
import { eq, inArray } from "drizzle-orm";

const timeRx = /^\d{2}:\d{2}$/;

const schema = z.object({
  teamIds:         z.array(z.string().uuid()).min(3).max(16),
  vueltas:         z.number().int().min(1).max(4),
  startDate:       z.string().datetime(),
  playDays:        z.array(z.number().int().min(0).max(6)).min(1).optional(),
  daysBetween:     z.number().int().min(1).max(60).default(7),
  matchesPerDay:   z.number().int().min(1).max(10).default(2),
  startTime:       z.string().regex(timeRx).default("10:00"),
  endTime:         z.string().regex(timeRx).default("16:00"),
  matchTimes:      z.array(z.string().regex(timeRx)).optional(),
  replaceExisting: z.boolean().default(false),
  startJornada:    z.number().int().min(1).default(1),
});

// ---------------------------------------------------------------------------
// Round Robin — método circular
// ---------------------------------------------------------------------------
function buildRoundRobin(n: number): Array<Array<[number, number]>> {
  const list = Array.from({ length: n }, (_, i) => i);
  if (n % 2 === 1) list.push(-1);
  const m   = list.length;
  const rot = [...list];
  const rounds: Array<Array<[number, number]>> = [];
  for (let r = 0; r < m - 1; r++) {
    const round: Array<[number, number]> = [];
    for (let i = 0; i < m / 2; i++) {
      const home = rot[i];
      const away = rot[m - 1 - i];
      if (home !== -1 && away !== -1) round.push([home, away]);
    }
    rounds.push(round);
    const last = rot[m - 1];
    for (let i = m - 1; i > 1; i--) rot[i] = rot[i - 1];
    rot[1] = last;
  }
  return rounds;
}

// ---------------------------------------------------------------------------
// Avanza al siguiente día de juego a partir de `from` (inclusive).
// ---------------------------------------------------------------------------
function nextPlayDate(from: Date, sortedDays: number[]): Date {
  const d = new Date(from);
  for (let i = 0; i < 14; i++) {
    if (sortedDays.includes(d.getDay())) return d;
    d.setDate(d.getDate() + 1);
  }
  return d;
}

// ---------------------------------------------------------------------------
// Devuelve la fecha del lunes de la semana ISO que contiene `d`.
// Usamos esto para agrupar días de la misma semana bajo la misma jornada.
// ---------------------------------------------------------------------------
function getWeekMonday(d: Date): string {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day  = date.getDay(); // 0=Dom…6=Sáb
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// POST /api/matches/generate — solo admin
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return err(body.error.issues[0].message);

  const {
    teamIds, vueltas, startDate, playDays, daysBetween,
    matchesPerDay, startTime, endTime, matchTimes,
    replaceExisting, startJornada,
  } = body.data;

  const dbTeams = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(inArray(teams.id, teamIds));

  if (dbTeams.length !== teamIds.length) return err("Uno o más equipos no existen");

  const orderedTeams = teamIds.map((id) => dbTeams.find((t) => t.id === id)!);
  const baseRounds   = buildRoundRobin(orderedTeams.length);

  // 1. Aplanar todos los partidos del Round Robin en orden
  //    (cada vuelta alterna local/visitante para la vuelta de regreso)
  const allMatchPairs: { homeTeamId: string; awayTeamId: string }[] = [];
  for (let v = 0; v < vueltas; v++) {
    for (const round of baseRounds) {
      const swap = v % 2 === 1;
      for (const [hi, ai] of round) {
        allMatchPairs.push({
          homeTeamId: swap ? orderedTeams[ai].id : orderedTeams[hi].id,
          awayTeamId: swap ? orderedTeams[hi].id : orderedTeams[ai].id,
        });
      }
    }
  }

  // 2. Slots de tiempo por día de juego
  const slotMinutes: number[] = matchTimes && matchTimes.length > 0
    ? matchTimes.map((t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; })
    : (() => {
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        const s   = sh * 60 + sm;
        const gap = matchesPerDay > 1 ? ((eh * 60 + em) - s) / (matchesPerDay - 1) : 0;
        return Array.from({ length: matchesPerDay }, (_, i) => Math.round(s + i * gap));
      })();

  if (replaceExisting) {
    await db.delete(matches).where(eq(matches.status, "upcoming"));
  }

  const start = new Date(startDate);
  const totalMatches         = allMatchPairs.length;
  const totalPlayDatesNeeded = Math.ceil(totalMatches / matchesPerDay);

  type InsertRow = {
    homeTeamId: string; awayTeamId: string;
    jornada: number; scheduledAt: Date; status: "upcoming";
  };
  const toInsert: InsertRow[] = [];

  if (playDays && playDays.length > 0) {
    // ── Modo playDays: jornada = semana calendario ──────────────────────────
    //
    // Lógica:
    //   • Generar las fechas de juego reales en orden (solo los días seleccionados).
    //   • Todos los días que caigan en la misma semana ISO comparten el mismo
    //     número de jornada.
    //   • Los partidos del RR se reparten secuencialmente: `matchesPerDay`
    //     partidos por día de juego.
    //
    const sortedDays = [...playDays].sort((a, b) => a - b);

    // Generar las fechas de juego necesarias
    const playDates: Date[] = [];
    let current = nextPlayDate(new Date(start), sortedDays);
    while (playDates.length < totalPlayDatesNeeded) {
      playDates.push(new Date(current));
      current = new Date(current);
      current.setDate(current.getDate() + 1);
      current = nextPlayDate(current, sortedDays);
    }

    // Mapear cada fecha a un número de jornada según la semana ISO
    const weekToJornada = new Map<string, number>();
    let jornadaCounter  = startJornada;
    const dateJornada   = playDates.map((d) => {
      const key = getWeekMonday(d);
      if (!weekToJornada.has(key)) weekToJornada.set(key, jornadaCounter++);
      return weekToJornada.get(key)!;
    });

    // Asignar partidos a fechas y jornadas
    for (let i = 0; i < allMatchPairs.length; i++) {
      const dateIdx    = Math.floor(i / matchesPerDay);
      const slotInDay  = i % matchesPerDay;
      const playDate   = playDates[dateIdx];
      const jornadaNum = dateJornada[dateIdx];
      const totalMin   = slotMinutes[slotInDay % slotMinutes.length];
      const dt         = new Date(playDate);
      dt.setHours(Math.floor(totalMin / 60), Math.round(totalMin % 60), 0, 0);
      toInsert.push({ ...allMatchPairs[i], jornada: jornadaNum, scheduledAt: dt, status: "upcoming" });
    }

  } else {
    // ── Modo daysBetween: cada grupo de `matchesPerDay` = un día = una jornada
    for (let i = 0; i < allMatchPairs.length; i++) {
      const dateIdx   = Math.floor(i / matchesPerDay);
      const slotInDay = i % matchesPerDay;
      const d         = new Date(start);
      d.setDate(start.getDate() + dateIdx * daysBetween);
      const totalMin  = slotMinutes[slotInDay % slotMinutes.length];
      d.setHours(Math.floor(totalMin / 60), Math.round(totalMin % 60), 0, 0);
      toInsert.push({ ...allMatchPairs[i], jornada: startJornada + dateIdx, scheduledAt: d, status: "upcoming" });
    }
  }

  const created = await db.insert(matches).values(toInsert).returning();

  // Resumen por jornada (con fechas de inicio y fin)
  const jornadaMap = new Map<number, { dates: Set<string>; count: number }>();
  for (const row of toInsert) {
    if (!jornadaMap.has(row.jornada)) jornadaMap.set(row.jornada, { dates: new Set(), count: 0 });
    const entry = jornadaMap.get(row.jornada)!;
    entry.dates.add(row.scheduledAt.toISOString().slice(0, 10));
    entry.count++;
  }

  const resumen = [...jornadaMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([jornada, { dates, count }]) => {
      const sorted = [...dates].sort();
      return {
        jornada,
        fecha:    sorted[0],
        fechaFin: sorted[sorted.length - 1],
        partidos: count,
      };
    });

  return ok({
    jornadasCreadas: jornadaMap.size,
    partidosCreados: created.length,
    resumen,
  });
}
