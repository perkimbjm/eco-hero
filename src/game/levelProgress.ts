import type { LevelResult } from './types';

/**
 * Local, offline-first progression store for the star / unlock system.
 *
 * Rules (per the game design):
 *  - Levels already reached stay unlocked; not-yet-reached levels are locked.
 *  - Every completed level is scored 1-3 stars.
 *      3 stars: finish + collect >= 80% trash + lose no life + beat all
 *               pollution enemies  -> unlocks secret content.
 *      2 stars: finish + collect >= 60% trash + at least 2 lives left.
 *      1 star : finish the level.
 *
 * Persisted in localStorage so it survives reloads without needing the
 * (credential-gated, optional) Supabase backend.
 */

const STORAGE_KEY = 'eco-hero:level-progress:v1';

export const STAR_TRASH_3 = 0.8;
export const STAR_TRASH_2 = 0.6;
export const STAR_LIVES_2 = 2;

export interface LevelStars {
  /** Best star count earned on this level, 0 = not yet cleared. */
  stars: number;
  bestScore: number;
  completed: boolean;
}

export interface LevelProgress {
  levels: Record<number, LevelStars>;
  /** Highest level index the player is allowed to enter (0-based). */
  highestUnlocked: number;
  /** Set once the player first earns a 3-star rating. */
  secretUnlocked: boolean;
}

export interface StarBreakdown {
  stars: number;
  trashPct: number;
  trashOk3: boolean;
  trashOk2: boolean;
  noLifeLost: boolean;
  allEnemies: boolean;
  livesRemaining: number;
  livesOk2: boolean;
}

function emptyProgress(): LevelProgress {
  return { levels: {}, highestUnlocked: 0, secretUnlocked: false };
}

export function loadProgress(): LevelProgress {
  if (typeof localStorage === 'undefined') return emptyProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<LevelProgress>;
    return {
      levels: parsed.levels ?? {},
      highestUnlocked: parsed.highestUnlocked ?? 0,
      secretUnlocked: parsed.secretUnlocked ?? false,
    };
  } catch {
    return emptyProgress();
  }
}

function saveProgress(progress: LevelProgress): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* storage full or unavailable — progression is best-effort */
  }
}

/** Grades a finished level. Reaching the goal always earns at least 1 star. */
export function computeStars(result: LevelResult): StarBreakdown {
  const trashPct =
    result.trashInLevel > 0 ? result.trashCollectedInLevel / result.trashInLevel : 1;
  const allEnemies =
    result.enemiesInLevel === 0
      ? true
      : result.enemiesDefeatedInLevel >= result.enemiesInLevel;
  const noLifeLost = result.livesLost <= 0;
  const livesRemaining = result.stats.lives;

  const trashOk3 = trashPct >= STAR_TRASH_3;
  const trashOk2 = trashPct >= STAR_TRASH_2;
  const livesOk2 = livesRemaining >= STAR_LIVES_2;

  let stars = 1;
  if (trashOk3 && noLifeLost && allEnemies) {
    stars = 3;
  } else if (trashOk2 && livesOk2) {
    stars = 2;
  }

  return {
    stars,
    trashPct,
    trashOk3,
    trashOk2,
    noLifeLost,
    allEnemies,
    livesRemaining,
    livesOk2,
  };
}

export interface RecordOutcome {
  progress: LevelProgress;
  stars: number;
  previousStars: number;
  improved: boolean;
  newlyUnlockedSecret: boolean;
  unlockedNextLevel: boolean;
}

/**
 * Records a completed level: stores the best star count, unlocks the next
 * level, and flips the secret-content flag the first time 3 stars are earned.
 */
export function recordLevelResult(
  levelIndex: number,
  totalLevels: number,
  breakdown: StarBreakdown,
  score: number
): RecordOutcome {
  const progress = loadProgress();
  const prev = progress.levels[levelIndex] ?? { stars: 0, bestScore: 0, completed: false };

  const stars = breakdown.stars;
  const improved = stars > prev.stars;
  const bestStars = Math.max(prev.stars, stars);
  const bestScore = Math.max(prev.bestScore, score);

  progress.levels[levelIndex] = { stars: bestStars, bestScore, completed: true };

  const nextIndex = levelIndex + 1;
  const unlockedNextLevel =
    nextIndex < totalLevels && nextIndex > progress.highestUnlocked;
  if (unlockedNextLevel) {
    progress.highestUnlocked = nextIndex;
  }

  const newlyUnlockedSecret = stars >= 3 && !progress.secretUnlocked;
  if (newlyUnlockedSecret) {
    progress.secretUnlocked = true;
  }

  saveProgress(progress);

  return {
    progress,
    stars,
    previousStars: prev.stars,
    improved,
    newlyUnlockedSecret,
    unlockedNextLevel,
  };
}

export function isLevelUnlocked(progress: LevelProgress, levelIndex: number): boolean {
  return levelIndex <= progress.highestUnlocked;
}

export function getLevelStars(progress: LevelProgress, levelIndex: number): number {
  return progress.levels[levelIndex]?.stars ?? 0;
}

export function totalStars(progress: LevelProgress): number {
  return Object.values(progress.levels).reduce((sum, l) => sum + l.stars, 0);
}
