import type { EcoPowerState } from './skills';

export type TrashType = 'plastic' | 'paper' | 'organic' | 'metal' | 'glass';
export type SecretType = 'maggot' | 'compost';
export type BoostType = 'magnet' | 'shield' | 'jump';
export type ThemeKey = 'park' | 'beach' | 'river' | 'landfill' | 'forest' | 'mountain' | 'city' | 'ocean';
export type EnemyVariant = 'walker' | 'flyer';

export interface PlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'brick';
}

export interface MovingPlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
  range: number;
  speed: number;
  phase: number;
}

export interface FlyingEnemyDef {
  x: number;
  y: number;
  range: number;
  amplitude: number;
  speed: number;
}

/** Giant fly — patrols a path, then dives at the player when it gets close. */
export interface GiantFlyDef {
  x: number;
  y: number;
  range: number;
  amplitude: number;
  speed: number;
}

/** Toxic waste mound — a ground hazard that drains a life on contact. */
export interface ToxicWasteDef {
  x: number;
  width: number;
}

/** Mini boss arena definition (currently only "Raja Sampah TPA"). */
export interface BossDef {
  name: string;
  x: number;
  y: number;
  machineX: number;
  machineY: number;
  arenaStart: number;
  arenaEnd: number;
  /** One trash category per boss phase; length also defines boss HP. */
  phases: TrashType[];
}

export interface TrashDef {
  x: number;
  y: number;
  type: TrashType;
}

export interface SecretDef {
  x: number;
  y: number;
  type: SecretType;
}

export interface EnemyDef {
  x: number;
  y: number;
  range: number;
}

export interface StorySegment {
  intro: string;
  outro: string;
}

export interface HealthPickupDef {
  x: number;
  y: number;
}

export interface BoostDef {
  x: number;
  y: number;
  type: BoostType;
}

export interface LevelDef {
  id: number;
  name: string;
  subtitle: string;
  theme: ThemeKey;
  width: number;
  playerStart: { x: number; y: number };
  platforms: PlatformDef[];
  movingPlatforms?: MovingPlatformDef[];
  trash: TrashDef[];
  secrets: SecretDef[];
  enemies: EnemyDef[];
  flyingEnemies?: FlyingEnemyDef[];
  giantFlies?: GiantFlyDef[];
  toxicWaste?: ToxicWasteDef[];
  boss?: BossDef;
  healthPickups?: HealthPickupDef[];
  boosts?: BoostDef[];
  goal: { x: number; y: number };
  story: StorySegment;
  fact: { title: string; text: string; tip: string };
  timeTarget?: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: GameStats) => boolean;
}

export interface GameStats {
  score: number;
  lives: number;
  currentLevel: number;
  trashCollected: number;
  factsLearned: number;
  enemiesDefeated: number;
  flyingEnemiesDefeated: number;
  secretsFound: number;
  xpGained: number;
  coinsGained: number;
  combo: number;
  timeSeconds: number;
}

export interface LevelResult {
  stats: GameStats;
  trashInLevel: number;
  trashCollectedInLevel: number;
  enemiesInLevel: number;
  enemiesDefeatedInLevel: number;
  flyingEnemiesInLevel: number;
  flyingEnemiesDefeatedInLevel: number;
  secretsInLevel: number;
  secretsFoundInLevel: number;
  fact: { title: string; text: string; tip: string };
  outro: string;
  xpGained: number;
  coinsGained: number;
  timeSeconds: number;
  timeBonus: number;
  maxCombo: number;
  rankUp: boolean;
  newRankName: string | null;
  badgeName: string | null;
  hasBoss: boolean;
  bossDefeated: boolean;
  bossName: string | null;
  /** Lives the player had when the level began (for star grading). */
  startLives: number;
  /** Lives lost during the level; 0 means a flawless run. */
  livesLost: number;
}

export interface GameCallbacks {
  onStatsChange: (stats: GameStats) => void;
  onLevelComplete: (result: LevelResult) => void;
  onGameOver: (stats: GameStats) => void;
  onAchievement: (achievement: AchievementDef) => void;
  onStoryRequest: (levelId: number) => void;
  /** Pushes Eco Power meter / skill state to the HUD. */
  onEcoPowerChange?: (state: EcoPowerState) => void;
  /** True while the player holds recycled energy ready to hurl at the mini boss. */
  onThrowReadyChange?: (ready: boolean) => void;
}

export type GameScreenName =
  | 'start'
  | 'story'
  | 'playing'
  | 'levelcomplete'
  | 'gameover'
  | 'victory'
  | 'leaderboard'
  | 'progress';
