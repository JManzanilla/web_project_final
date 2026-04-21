export interface Player {
  id: string;
  name: string;
  lastName: string;
  number: string;
  eligible: boolean;
  attended: boolean;
}

export interface PlayerStats {
  pts: number;
  ast: number;
  flt: number;
}

export type MatchStatus = "finished" | "live" | "upcoming";

export type Step = 0 | 1 | 2 | 3;

export const STEPS = ["Oficiales", "Asistencia", "Resultados", "Acta"];
