import {
  pgTable, uuid, text, integer, boolean, timestamp, pgEnum, jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Tipo de permisos por sección (compartido con el cliente vía shared/)
export type SectionKey = "roster" | "match" | "schedule" | "config" | "accounts" | "stream";
export type SectionPerm = { view: boolean; edit: boolean };
export type UserPermissions = Partial<Record<SectionKey, SectionPerm>>;

// ---------------------------------------------------------------------------
// ENUMS
// ---------------------------------------------------------------------------
// role es text libre — validación en Zod, no en DB (permite agregar roles sin migración)
export const statusEnum  = pgEnum("match_status", ["upcoming", "live", "finished", "suspended"]);

// ---------------------------------------------------------------------------
// TEAMS
// ---------------------------------------------------------------------------
export const teams = pgTable("teams", {
  id:           uuid("id").primaryKey().defaultRandom(),
  name:         text("name").notNull().unique(),
  logoUrl:      text("logo_url"),
  rosterLocked: boolean("roster_locked").notNull().default(false),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id:           uuid("id").primaryKey().defaultRandom(),
  username:     text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name:         text("name").notNull(),
  role:         text("role").notNull().default("lider"),
  teamId:       uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  firstLogin:   boolean("first_login").notNull().default(true),
  active:       boolean("active").notNull().default(true),
  permissions:  jsonb("permissions").$type<UserPermissions>().default({}),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// PLAYERS
// ---------------------------------------------------------------------------
export const players = pgTable("players", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      text("name").notNull(),
  lastName:  text("last_name").notNull(),
  number:    text("number").notNull(),
  teamId:    uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  photoUrl:  text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// MATCHES
// ---------------------------------------------------------------------------
export const matches = pgTable("matches", {
  id:          uuid("id").primaryKey().defaultRandom(),
  jornada:     integer("jornada").notNull(),
  homeTeamId:  uuid("home_team_id").notNull().references(() => teams.id),
  awayTeamId:  uuid("away_team_id").notNull().references(() => teams.id),
  scoreHome:   integer("score_home"),
  scoreAway:   integer("score_away"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status:      statusEnum("status").notNull().default("upcoming"),
  streamUrl:   text("stream_url"),
  actaUrl:     text("acta_url"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// MATCH OFFICIALS (árbitros + anotador)
// ---------------------------------------------------------------------------
export const matchOfficials = pgTable("match_officials", {
  id:       uuid("id").primaryKey().defaultRandom(),
  matchId:  uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  ref1:     text("ref1"),
  ref2:     text("ref2"),
  scorer:   text("scorer"),
});

// ---------------------------------------------------------------------------
// PLAYER MATCH STATS (asistencia + puntos + faltas + asistencias)
// ---------------------------------------------------------------------------
export const playerMatchStats = pgTable("player_match_stats", {
  id:       uuid("id").primaryKey().defaultRandom(),
  matchId:  uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  attended: boolean("attended").notNull().default(false),
  pts:      integer("pts").notNull().default(0),
  ast:      integer("ast").notNull().default(0),
  flt:      integer("flt").notNull().default(0),
});

// ---------------------------------------------------------------------------
// TOURNAMENT CONFIG
// ---------------------------------------------------------------------------
export const tournamentConfig = pgTable("tournament_config", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  name:                  text("name").notNull().default("Torneo Municipal"),
  format:                text("format").notNull().default("liga"),   // "liga" | "eliminacion"
  vueltas:               integer("vueltas").notNull().default(1),
  totalTeams:            integer("total_teams").notNull().default(8),
  rosterLockJornada:     integer("roster_lock_jornada").notNull().default(4),
  transferWindowJornada: integer("transfer_window_jornada"),         // null = sin ventana
  updatedAt:             timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// RELATIONS
// ---------------------------------------------------------------------------
export const teamsRelations = relations(teams, ({ many, one }) => ({
  players:       many(players),
  homeMatches:   many(matches, { relationName: "homeTeam" }),
  awayMatches:   many(matches, { relationName: "awayTeam" }),
  leader:        one(users, { fields: [teams.id], references: [users.teamId] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  team:  one(teams, { fields: [players.teamId], references: [teams.id] }),
  stats: many(playerMatchStats),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  homeTeam:  one(teams, { fields: [matches.homeTeamId], references: [teams.id], relationName: "homeTeam" }),
  awayTeam:  one(teams, { fields: [matches.awayTeamId], references: [teams.id], relationName: "awayTeam" }),
  officials: one(matchOfficials, { fields: [matches.id], references: [matchOfficials.matchId] }),
  stats:     many(playerMatchStats),
}));

export const playerMatchStatsRelations = relations(playerMatchStats, ({ one }) => ({
  match:  one(matches, { fields: [playerMatchStats.matchId], references: [matches.id] }),
  player: one(players, { fields: [playerMatchStats.playerId], references: [players.id] }),
}));
