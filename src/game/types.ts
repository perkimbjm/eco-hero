import type { EcoPowerState } from './skills';

/**
 * Sorting category — what a bin (and the recycling machine) cares about.
 * `hazard` (limbah B3) is collectable but never recyclable, so it is
 * deliberately absent from TRASH_TYPES, which drives the boss sorting puzzle.
 */
export type TrashType = 'plastic' | 'paper' | 'organic' | 'metal' | 'glass' | 'hazard';

/**
 * The concrete object the player picks up. Each kind is drawn from a Unicode
 * emoji — no icon library, no image assets — so the pickup is recognisable at a
 * glance and can be named on collection.
 */
export type TrashItemKind =
  | 'botolPlastik'
  | 'gelasPlastik'
  | 'kantongPlastik'
  | 'kaleng'
  | 'kertas'
  | 'kardus'
  | 'botolKaca'
  | 'organik'
  | 'limbahB3';
export type SecretType = 'maggot' | 'compost';
export type BoostType = 'magnet' | 'shield' | 'jump';
/**
 * Items that pop out of a hidden block (Super Mario style, eco themed).
 * `ecoBadge` and `ecoVest` grant the grow buff; `recycleVacuum` is an Eco Tool
 * with its own behaviour — see POWERUP_INFO.kindOfPower.
 */
export type PowerUpKind = 'ecoBadge' | 'ecoVest' | 'recycleVacuum';

/** How a platform is drawn. Collision is always the plain rectangle. */
export type PlatformKind = 'ground' | 'brick' | 'log' | 'boulder' | 'branch' | 'stump';

export type MoveAxis = 'horizontal' | 'vertical';
export type ThemeKey = 'park' | 'beach' | 'river' | 'landfill' | 'forest' | 'mountain' | 'city' | 'ocean';
export type EnemyVariant = 'walker' | 'flyer';

export interface PlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
  type: PlatformKind;
}

export interface MovingPlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
  range: number;
  speed: number;
  phase: number;
  /** Which way it travels. Defaults to horizontal. */
  axis?: MoveAxis;
  /** How it is drawn; defaults to the theme's brick. */
  kind?: PlatformKind;
}

/**
 * A log hung from a branch that swings like a pendulum. It is a real platform —
 * the player rides it across a gap — but the footing keeps moving.
 */
export interface SwayingLogDef {
  /** Anchor point the log hangs from. */
  x: number;
  y: number;
  /** Distance from the anchor down to the log. */
  length: number;
  width: number;
  /** Maximum swing away from vertical, in degrees. */
  swayDeg: number;
  /** Swing speed in radians per second. */
  speed: number;
  phase: number;
}

/**
 * A snake hanging from a branch, swaying over a path the player must cross.
 * Touching it costs a life; it never chases and never bites, so it reads as a
 * thing to time your run around rather than a fight.
 */
export interface HangingSnakeDef {
  x: number;
  y: number;
  length: number;
  swayDeg: number;
  speed: number;
  phase: number;
}

/** Boggy ground that drags the hero's footing down to MUD_SPEED_MULTIPLIER. */
export interface MudPatchDef {
  x: number;
  width: number;
}

/** Respawn point, activated by walking past it. */
export interface CheckpointDef {
  x: number;
  y: number;
}

/**
 * A stone shelf that gives way a moment after it takes weight. It shakes first,
 * so stepping on one is a decision about timing rather than a hidden trap.
 */
export interface CrumblingRockDef {
  x: number;
  y: number;
  width: number;
}

/**
 * A column of sky that lightning periodically strikes. The zone always glows
 * and crackles before the bolt lands, so the strike can be walked out of.
 */
export interface LightningZoneDef {
  x: number;
  width: number;
  /** Time between strikes. */
  intervalMs: number;
  /** Offsets the cycle so neighbouring zones do not fire together. */
  phase: number;
}

/**
 * Burung Pemakan Sampah — perches on a nest, dives at the player when they come
 * close, then climbs back to the nest. Stompable like any other flyer.
 */
export interface TrashBirdDef {
  /** Nest position; the bird always returns here. */
  x: number;
  y: number;
  /** How close the player must come before it commits to a dive. */
  range: number;
}

/** A boulder that rolls down the slope on a timer and has to be jumped. */
export interface RollingBoulderDef {
  /** Where the boulder appears. */
  x: number;
  y: number;
  /** Travel direction: -1 rolls left, 1 rolls right. */
  dir: -1 | 1;
  speed: number;
  /** How far it travels before it tumbles off the mountain. */
  distance: number;
  intervalMs: number;
  phase: number;
}

/** Decorative falling water. Collectibles can be tucked behind the curtain. */
export interface WaterfallDef {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Fog banks that roll across the screen and hide the level for a few seconds. */
export interface FogDef {
  intervalMs: number;
  durationMs: number;
  /** 0-1 fraction of the viewport height each bank covers. */
  coverage: number;
}

/**
 * Raja Polusi — a storm cloud fought with Eco Energy Orbs rather than by
 * touching it. `hp` is both the hit count and the number of phases.
 */
export interface PollutionBossDef {
  name: string;
  x: number;
  y: number;
  arenaStart: number;
  arenaEnd: number;
  hp: number;
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
  /** Pins a specific object; otherwise the level's themed pool decides. */
  item?: TrashItemKind;
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

/**
 * A hidden block the hero head-butts from below. `x`/`y` are the top-left
 * corner (same convention as PlatformDef) so blocks line up with the tile grid.
 */
export interface MysteryBlockDef {
  x: number;
  y: number;
  /** Which power-up springs out. Each block yields exactly one item. */
  item: PowerUpKind;
  /**
   * What the block pretends to be. `crate` is the obvious "?" box; the others
   * blend into the scenery, so the block only gives itself away to a player who
   * jumps under suspicious-looking terrain.
   */
  disguise?: 'crate' | 'stump' | 'boulder';
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
  /**
   * Which concrete objects stand in for each sorting category in this level, so
   * a beach is littered with bottles and a landfill with cardboard and B3.
   * Falls back to DEFAULT_TRASH_POOL for any category left out.
   */
  trashItems?: Partial<Record<TrashType, TrashItemKind[]>>;
  secrets: SecretDef[];
  enemies: EnemyDef[];
  flyingEnemies?: FlyingEnemyDef[];
  giantFlies?: GiantFlyDef[];
  toxicWaste?: ToxicWasteDef[];
  boss?: BossDef;
  healthPickups?: HealthPickupDef[];
  boosts?: BoostDef[];
  mysteryBlocks?: MysteryBlockDef[];
  swayingLogs?: SwayingLogDef[];
  hangingSnakes?: HangingSnakeDef[];
  mudPatches?: MudPatchDef[];
  /** Extra respawn points; the player's start always counts as the first. */
  checkpoints?: CheckpointDef[];
  crumblingRocks?: CrumblingRockDef[];
  lightningZones?: LightningZoneDef[];
  trashBirds?: TrashBirdDef[];
  rollingBoulders?: RollingBoulderDef[];
  waterfalls?: WaterfallDef[];
  fog?: FogDef;
  pollutionBoss?: PollutionBossDef;
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
