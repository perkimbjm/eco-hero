/**
 * Game data access layer, backed by browser-local SQLite (see lib/db/client).
 *
 * This module replaces the former Supabase client. The function signatures are
 * unchanged and still async, so callers are agnostic about where data lives —
 * the only visible difference is that data is now per-browser rather than
 * shared across players.
 */

import { selectAll, selectOne, execute, lastInsertId } from '@/lib/db/client';

export interface HighScore {
  id: number;
  player_name: string;
  score: number;
  level_reached: number;
  trash_collected: number;
  facts_learned: number;
  enemies_defeated: number;
  created_at: string;
}

export interface AchievementRecord {
  id: number;
  player_name: string;
  achievement_id: string;
  unlocked_at: string;
}

const HIGH_SCORE_COLUMNS =
  'id, player_name, score, level_reached, trash_collected, facts_learned, enemies_defeated, created_at';

// ── Leaderboard ─────────────────────────────────────────────

export async function fetchTopScores(limit = 20): Promise<HighScore[]> {
  return selectAll<HighScore>(
    `SELECT ${HIGH_SCORE_COLUMNS}
       FROM high_scores
      ORDER BY score DESC, created_at ASC
      LIMIT ?`,
    [limit]
  );
}

export async function submitScore(entry: {
  player_name: string;
  score: number;
  level_reached: number;
  trash_collected: number;
  facts_learned: number;
  enemies_defeated: number;
}): Promise<HighScore | null> {
  await execute(
    `INSERT INTO high_scores
       (player_name, score, level_reached, trash_collected, facts_learned, enemies_defeated)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entry.player_name,
      entry.score,
      entry.level_reached,
      entry.trash_collected,
      entry.facts_learned,
      entry.enemies_defeated,
    ]
  );

  const id = await lastInsertId();
  return selectOne<HighScore>(
    `SELECT ${HIGH_SCORE_COLUMNS} FROM high_scores WHERE id = ?`,
    [id]
  );
}

// ── Achievements ────────────────────────────────────────────

/**
 * Records an unlock. Re-unlocking is a no-op: the unique index on
 * (player_name, achievement_id) makes OR IGNORE swallow the duplicate, which
 * replaces the old Postgres error-code 23505 check.
 */
export async function submitAchievement(playerName: string, achievementId: string): Promise<void> {
  await execute(
    `INSERT OR IGNORE INTO achievements (player_name, achievement_id) VALUES (?, ?)`,
    [playerName, achievementId]
  );
}

export async function fetchPlayerAchievements(playerName: string): Promise<string[]> {
  const rows = await selectAll<{ achievement_id: string }>(
    `SELECT achievement_id FROM achievements WHERE player_name = ?`,
    [playerName]
  );
  return rows.map((row) => row.achievement_id);
}

// ── Player progression ──────────────────────────────────────

export interface PlayerProgressRow {
  player_name: string;
  total_xp: number;
  eco_coins: number;
  total_trash_collected: number;
  total_enemies_defeated: number;
  total_secrets_found: number;
  total_animals_saved: number;
  levels_completed: number;
  beaches_completed: number;
  rivers_completed: number;
  equipped_skin: string;
  unlocked_skins: string[];
  unlocked_badges: string[];
  created_at: string;
  updated_at: string;
}

/** How the row actually sits in SQLite: the two arrays are JSON text. */
type PlayerProgressRecord = Omit<PlayerProgressRow, 'unlocked_skins' | 'unlocked_badges'> & {
  unlocked_skins: string;
  unlocked_badges: string;
};

/** Columns a caller may update; anything else is rejected before it reaches SQL. */
const UPDATABLE_COLUMNS = [
  'total_xp',
  'eco_coins',
  'total_trash_collected',
  'total_enemies_defeated',
  'total_secrets_found',
  'total_animals_saved',
  'levels_completed',
  'beaches_completed',
  'rivers_completed',
  'equipped_skin',
  'unlocked_skins',
  'unlocked_badges',
] as const;

type UpdatableColumn = (typeof UPDATABLE_COLUMNS)[number];

export type PlayerProgressUpdate = Partial<Pick<PlayerProgressRow, UpdatableColumn>>;

/** Tolerates malformed JSON rather than breaking a save the player already earned. */
function parseIdList(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function toRow(record: PlayerProgressRecord): PlayerProgressRow {
  return {
    ...record,
    unlocked_skins: parseIdList(record.unlocked_skins),
    unlocked_badges: parseIdList(record.unlocked_badges),
  };
}

export async function fetchPlayerProgress(playerName: string): Promise<PlayerProgressRow | null> {
  const record = await selectOne<PlayerProgressRecord>(
    `SELECT * FROM player_progress WHERE player_name = ?`,
    [playerName]
  );
  return record ? toRow(record) : null;
}

/** Every player starts owning the free skin, so the shop always has one usable entry. */
const STARTING_SKINS = ['default'];
const STARTING_EQUIPPED_SKIN = 'default';

/**
 * Creates the player's row, or returns the existing one if they already have it.
 *
 * Starting values are written explicitly rather than left to column defaults:
 * an older database may already carry the table with different defaults, and
 * `CREATE TABLE IF NOT EXISTS` would not correct it.
 */
export async function createPlayerProgress(playerName: string): Promise<PlayerProgressRow | null> {
  await execute(
    `INSERT OR IGNORE INTO player_progress (player_name, equipped_skin, unlocked_skins, unlocked_badges)
     VALUES (?, ?, ?, '[]')`,
    [playerName, STARTING_EQUIPPED_SKIN, JSON.stringify(STARTING_SKINS)]
  );
  return fetchPlayerProgress(playerName);
}

export async function updatePlayerProgress(
  playerName: string,
  updates: PlayerProgressUpdate
): Promise<PlayerProgressRow | null> {
  const columns = UPDATABLE_COLUMNS.filter((column) => updates[column] !== undefined);
  if (columns.length === 0) return fetchPlayerProgress(playerName);

  const values = columns.map((column) => {
    const value = updates[column];
    return Array.isArray(value) ? JSON.stringify(value) : (value as string | number);
  });

  // `updated_at` is deliberately absent: the schema trigger maintains it.
  await execute(
    `UPDATE player_progress
        SET ${columns.map((column) => `${column} = ?`).join(', ')}
      WHERE player_name = ?`,
    [...values, playerName]
  );

  return fetchPlayerProgress(playerName);
}

export async function purchaseSkin(
  playerName: string,
  skinId: string,
  price: number
): Promise<{ success: boolean; message: string; progress?: PlayerProgressRow }> {
  const current = await fetchPlayerProgress(playerName);
  if (!current) return { success: false, message: 'Data pemain tidak ditemukan' };

  if (current.unlocked_skins.includes(skinId)) {
    return { success: false, message: 'Skin sudah dimiliki' };
  }
  if (current.eco_coins < price) {
    return { success: false, message: 'Eco Coin tidak cukup' };
  }

  const updated = await updatePlayerProgress(playerName, {
    eco_coins: current.eco_coins - price,
    unlocked_skins: [...current.unlocked_skins, skinId],
  });

  return { success: true, message: 'Skin berhasil dibuka!', progress: updated ?? undefined };
}

export async function equipSkin(
  playerName: string,
  skinId: string
): Promise<{ success: boolean; message: string; progress?: PlayerProgressRow }> {
  const current = await fetchPlayerProgress(playerName);
  if (!current) return { success: false, message: 'Data pemain tidak ditemukan' };
  if (!current.unlocked_skins.includes(skinId)) {
    return { success: false, message: 'Skin belum dimiliki' };
  }

  const updated = await updatePlayerProgress(playerName, { equipped_skin: skinId });
  return { success: true, message: 'Skin dipakai!', progress: updated ?? undefined };
}
