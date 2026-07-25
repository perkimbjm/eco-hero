import type { TrashType, ThemeKey, BoostType } from './types';

export const TILE = 40;
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 480;

export const GRAVITY = 1400;
export const JUMP_VELOCITY = -560;
export const DOUBLE_JUMP_VELOCITY = -480;
export const MOVE_SPEED = 260;
export const MAX_FALL_SPEED = 700;
export const MAX_JUMP_SPEED = 700;
export const COYOTE_TIME_MS = 120;
export const JUMP_BUFFER_MS = 120;

export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 38;

export const TRASH_SCORE = 100;
export const ENEMY_SCORE = 200;
export const SECRET_SCORE = 300;
export const LEVEL_BONUS = 500;
export const ALL_TRASH_BONUS = 1000;
export const ALL_SECRETS_BONUS = 500;

export const INVINCIBILITY_MS = 1500;
export const BOUNCE_VELOCITY = -380;
export const KNOCKBACK_VELOCITY = 200;
export const SCREEN_SHAKE_DURATION = 250;
export const SCREEN_SHAKE_INTENSITY = 120;

export const COMBO_WINDOW_MS = 1800;
export const COMBO_MAX = 8;
export const COMBO_INITIAL_MULTIPLIER = 1;
export const TIME_TARGET_MS = 45000;
export const TIME_BONUS_PCT = 0.3;
export const BOOST_DURATIONS: Record<BoostType, number> = {
  magnet: 6000,
  shield: 8000,
  jump: 10000,
};

// ── Giant fly (lalat raksasa) ────────────────────────────────

export const GIANT_FLY_SCORE = 250;
/** How close the player must get before the fly commits to a dive. */
export const GIANT_FLY_DETECT_RANGE = 240;
export const GIANT_FLY_PATROL_SPEED = 190;
export const GIANT_FLY_DIVE_SPEED = 330;
export const GIANT_FLY_TELEGRAPH_MS = 420;
export const GIANT_FLY_DIVE_MS = 1000;
export const GIANT_FLY_RECOVER_MS = 900;
export const GIANT_FLY_COOLDOWN_MS = 2200;

// ── Toxic waste (limbah beracun) ─────────────────────────────

export const TOXIC_WASTE_HEIGHT = 30;
/** Strong upward pop so the player is thrown clear of the sludge. */
export const TOXIC_KNOCKBACK_Y = -430;

// ── Mini boss: Raja Sampah TPA ───────────────────────────────

export const BOSS_ENERGY_DURATION_MS = 10000;
export const BOSS_PHASE_SCORE = 600;
export const BOSS_DEFEAT_SCORE = 3000;
export const BOSS_STUN_MS = 1400;
export const BOSS_PATROL_SPEED = 46;
export const BOSS_THROW_INTERVAL_MS = 2800;
export const BOSS_SLAM_INTERVAL_MS = 7000;
export const BOSS_SLAM_TELEGRAPH_MS = 700;
export const BOSS_SLAM_RADIUS = 230;
export const BOSS_TRASH_MAX = 5;
export const BOSS_TRASH_SPAWN_MS = 2400;
export const BOSS_MACHINE_CYCLE_MS = 750;

export const TRASH_COLORS: Record<
  TrashType,
  { main: string; light: string; dark: string; label: string }
> = {
  plastic: { main: '#3b82f6', light: '#93c5fd', dark: '#1e40af', label: 'Plastik' },
  paper: { main: '#f59e0b', light: '#fcd34d', dark: '#92400e', label: 'Kertas' },
  organic: { main: '#22c55e', light: '#86efac', dark: '#15803d', label: 'Organik' },
  metal: { main: '#94a3b8', light: '#e2e8f0', dark: '#475569', label: 'Logam' },
  glass: { main: '#14b8a6', light: '#5eead4', dark: '#0f766e', label: 'Kaca' },
};

export const SECRET_COLORS: Record<
  'maggot' | 'compost',
  { main: string; light: string; label: string }
> = {
  maggot: { main: '#fbbf24', light: '#fef3c7', label: 'Maggot' },
  compost: { main: '#65a30d', light: '#d9f99d', label: 'Pupuk Kompos' },
};

export const THEME_COLORS: Record<
  ThemeKey,
  {
    skyTop: string;
    skyBottom: string;
    ground: string;
    groundDark: string;
    platform: string;
    platformDark: string;
    accent: string;
    hillBack: string;
    hillFront: string;
    cloud: string;
    tree: string;
    treeDark: string;
  }
> = {
  park: {
    skyTop: '#60a5fa',
    skyBottom: '#bbf7d0',
    ground: '#65a30d',
    groundDark: '#365314',
    platform: '#92400e',
    platformDark: '#451a03',
    accent: '#facc15',
    hillBack: '#22c55e',
    hillFront: '#16a34a',
    cloud: '#ffffff',
    tree: '#16a34a',
    treeDark: '#15803d',
  },
  beach: {
    skyTop: '#38bdf8',
    skyBottom: '#fef9c3',
    ground: '#fbbf24',
    groundDark: '#b45309',
    platform: '#fed7aa',
    platformDark: '#c2410c',
    accent: '#fb923c',
    hillBack: '#fde68a',
    hillFront: '#fef3c7',
    cloud: '#ffffff',
    tree: '#15803d',
    treeDark: '#14532d',
  },
  river: {
    skyTop: '#0284c7',
    skyBottom: '#a5f3fc',
    ground: '#0e7490',
    groundDark: '#155e75',
    platform: '#854d0e',
    platformDark: '#451a03',
    accent: '#22d3ee',
    hillBack: '#06b6d4',
    hillFront: '#0891b2',
    cloud: '#f0f9ff',
    tree: '#0891b2',
    treeDark: '#155e75',
  },
  landfill: {
    skyTop: '#78716c',
    skyBottom: '#a8a29e',
    ground: '#57534e',
    groundDark: '#292524',
    platform: '#44403c',
    platformDark: '#1c1917',
    accent: '#84cc16',
    hillBack: '#57534e',
    hillFront: '#44403c',
    cloud: '#d6d3d1',
    tree: '#65a30d',
    treeDark: '#365314',
  },
  forest: {
    skyTop: '#064e3b',
    skyBottom: '#a7f3d0',
    ground: '#166534',
    groundDark: '#0a2e1a',
    platform: '#78716c',
    platformDark: '#44403c',
    accent: '#fcd34d',
    hillBack: '#15803d',
    hillFront: '#14532d',
    cloud: '#d1fae5',
    tree: '#14532d',
    treeDark: '#0f2b1a',
  },
  mountain: {
    skyTop: '#1e3a8a',
    skyBottom: '#bfdbfe',
    ground: '#94a3b8',
    groundDark: '#475569',
    platform: '#475569',
    platformDark: '#1e293b',
    accent: '#f8fafc',
    hillBack: '#cbd5e1',
    hillFront: '#e2e8f0',
    cloud: '#ffffff',
    tree: '#1e3a8a',
    treeDark: '#172554',
  },
  city: {
    skyTop: '#312e81',
    skyBottom: '#c7d2fe',
    ground: '#334155',
    groundDark: '#0f172a',
    platform: '#475569',
    platformDark: '#1e293b',
    accent: '#fbbf24',
    hillBack: '#1e293b',
    hillFront: '#334155',
    cloud: '#e0e7ff',
    tree: '#22c55e',
    treeDark: '#15803d',
  },
  ocean: {
    skyTop: '#075985',
    skyBottom: '#e0f2fe',
    ground: '#0c4a6e',
    groundDark: '#082f49',
    platform: '#1e293b',
    platformDark: '#0f172a',
    accent: '#22d3ee',
    hillBack: '#0369a1',
    hillFront: '#0ea5e9',
    cloud: '#f0f9ff',
    tree: '#0ea5e9',
    treeDark: '#0369a1',
  },
};

export const TRASH_TYPES: TrashType[] = ['plastic', 'paper', 'organic', 'metal', 'glass'];

export const BOOST_COLORS: Record<
  BoostType,
  { main: string; light: string; label: string }
> = {
  magnet: { main: '#a855f7', light: '#d8b4fe', label: 'Magnet' },
  shield: { main: '#06b6d4', light: '#67e8f9', label: 'Perisai' },
  jump: { main: '#f97316', light: '#fdba74', label: 'Lompat' },
};
