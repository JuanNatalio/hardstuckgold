import type { Migration } from './index'

/**
 * Initial schema: the player's own matches, every participant seen in them,
 * and a derived encounter-stats view (spec §5). Encounter counts are computed
 * on read via the view rather than maintained as a table, so they can't drift.
 */
export const migration001: Migration = {
  name: '001-init',
  sql: `
CREATE TABLE matches (
  match_id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL,
  game_creation INTEGER NOT NULL,
  game_duration INTEGER NOT NULL,
  queue_id INTEGER NOT NULL,
  game_version TEXT NOT NULL,
  my_puuid TEXT NOT NULL,
  my_champion_id INTEGER NOT NULL,
  my_win INTEGER NOT NULL,
  raw_json TEXT NOT NULL,
  persisted_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE match_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  puuid TEXT NOT NULL,
  riot_id_game_name TEXT,
  riot_id_tagline TEXT,
  team_id INTEGER NOT NULL,
  champion_id INTEGER NOT NULL,
  win INTEGER NOT NULL,
  kills INTEGER NOT NULL,
  deaths INTEGER NOT NULL,
  assists INTEGER NOT NULL,
  team_position TEXT,
  is_me INTEGER NOT NULL DEFAULT 0,
  raw_json TEXT,
  UNIQUE(match_id, puuid)
);

CREATE INDEX idx_participants_puuid ON match_participants(puuid);
CREATE INDEX idx_participants_match ON match_participants(match_id);

CREATE VIEW encounter_stats AS
SELECT
  other.puuid AS other_puuid,
  COUNT(*) AS games_total,
  SUM(CASE WHEN other.team_id = me.team_id THEN 1 ELSE 0 END) AS games_with,
  SUM(CASE WHEN other.team_id != me.team_id THEN 1 ELSE 0 END) AS games_against,
  SUM(CASE WHEN other.team_id = me.team_id AND me.win = 1 THEN 1 ELSE 0 END) AS wins_with,
  MAX(m.game_creation) AS last_played
FROM match_participants me
JOIN match_participants other
  ON other.match_id = me.match_id AND other.puuid != me.puuid
JOIN matches m ON m.match_id = me.match_id
WHERE me.is_me = 1
GROUP BY other.puuid;
`
}
