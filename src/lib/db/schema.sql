-- Eco Hero — SQLite schema (single source of truth, replaces supabase/migrations).
--
-- Applied on every boot. Every statement is idempotent so it produces the same
-- result whether it runs against an empty database or against the seeded
-- public/eco_guardian_game.db, which already carries most of this schema.

-- ── Leaderboard ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS high_scores (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name      TEXT    NOT NULL,
  score            INTEGER NOT NULL DEFAULT 0,
  level_reached    INTEGER NOT NULL DEFAULT 1,
  trash_collected  INTEGER NOT NULL DEFAULT 0,
  facts_learned    INTEGER NOT NULL DEFAULT 0,
  enemies_defeated INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_high_scores_score ON high_scores (score DESC);
CREATE INDEX IF NOT EXISTS idx_high_scores_player ON high_scores (player_name);

-- ── Achievements ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name    TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_achievement_player ON achievements (player_name);

-- Port of the Postgres unique index: an achievement unlocks once per player.
-- Legacy rows are de-duplicated first, otherwise the index cannot be built.
DELETE FROM achievements
WHERE id NOT IN (
  SELECT MIN(id) FROM achievements GROUP BY player_name, achievement_id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_player_achievement
  ON achievements (player_name, achievement_id);

-- ── Player progression ──────────────────────────────────────
-- `unlocked_skins` and `unlocked_badges` hold JSON arrays of ids: SQLite has no
-- array type, so the repository parses/serialises them at the boundary.
CREATE TABLE IF NOT EXISTS player_progress (
  player_name            TEXT PRIMARY KEY,
  total_xp               INTEGER NOT NULL DEFAULT 0,
  eco_coins              INTEGER NOT NULL DEFAULT 0,
  total_trash_collected  INTEGER NOT NULL DEFAULT 0,
  total_enemies_defeated INTEGER NOT NULL DEFAULT 0,
  total_secrets_found    INTEGER NOT NULL DEFAULT 0,
  total_animals_saved    INTEGER NOT NULL DEFAULT 0,
  levels_completed       INTEGER NOT NULL DEFAULT 0,
  beaches_completed      INTEGER NOT NULL DEFAULT 0,
  rivers_completed       INTEGER NOT NULL DEFAULT 0,
  equipped_skin          TEXT    NOT NULL DEFAULT 'default',
  unlocked_skins         TEXT    NOT NULL DEFAULT '["default"]',
  unlocked_badges        TEXT    NOT NULL DEFAULT '[]',
  created_at             TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- The trigger owns `updated_at`; writers never set it by hand, so the column
-- keeps one consistent format regardless of which code path touched the row.
CREATE TRIGGER IF NOT EXISTS update_player_progress_timestamp
AFTER UPDATE ON player_progress
FOR EACH ROW
BEGIN
  UPDATE player_progress
  SET updated_at = datetime('now')
  WHERE player_name = OLD.player_name;
END;
