import type { TrashType, TrashItemKind, ThemeKey, BoostType, PowerUpKind } from './types';

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

/**
 * Player hitbox, in texture space. The Arcade body multiplies both the size and
 * the offset by the sprite's scale, so growing the hero with `setScale` keeps
 * the hitbox proportional — see `setPlayerScale` in GameScene.
 */
export const PLAYER_BODY_WIDTH = 22;
export const PLAYER_BODY_HEIGHT = 38;
export const PLAYER_BODY_OFFSET_X = 7;
export const PLAYER_BODY_OFFSET_Y = 14;

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

// ── Hidden eco power-up (blok rahasia ala Super Mario) ───────

/** Blocks are one tile square so they sit cleanly on the level grid. */
export const MYSTERY_BLOCK_SIZE = TILE;
/** How far the block kicks upward when head-butted, and for how long. */
export const MYSTERY_BLOCK_BUMP_PX = 12;
export const MYSTERY_BLOCK_BUMP_MS = 110;
/** Time the item takes to rise out of the block before physics take over. */
export const POWERUP_EMERGE_MS = 520;
/** Patrol speed once the item lands — slow enough to always be catchable. */
export const POWERUP_WALK_SPEED = 90;
/**
 * How long a released item stays in play before it fades away. Timed from the
 * moment it can actually be picked up, not from the block bump, so the player
 * always gets the full window.
 */
export const POWERUP_LIFETIME_MS = 9000;
/** Tail of the lifetime where the item blinks as a "hurry up" tell. */
export const POWERUP_EXPIRY_WARNING_MS = 2500;
/**
 * How far ahead of itself the item checks for solid ground. Anything wider than
 * roughly half its body would turn it around while still safely on a ledge.
 */
export const POWERUP_LEDGE_PROBE_PX = 8;
/** Depth below the item's feet used when probing for footing. */
export const POWERUP_FOOTING_PROBE_PX = 6;
export const POWERUP_SCALE = 1.4;
/**
 * Extra jump HEIGHT the power-up grants. Height scales with the square of the
 * launch velocity, so the velocity is multiplied by the square root of this —
 * multiplying the velocity by 1.15 directly would jump ~32% higher.
 */
export const POWERUP_JUMP_HEIGHT_MULTIPLIER = 1.15;
export const POWERUP_JUMP_VELOCITY_MULTIPLIER = Math.sqrt(POWERUP_JUMP_HEIGHT_MULTIPLIER);
export const POWERUP_DURATION_MS = 10000;
export const POWERUP_SCORE = 400;
/** How much a pollution enemy swells after swallowing a power-up. */
export const EMPOWERED_ENEMY_SCALE = 1.5;
/** Last stretch of the buff where the aura blinks as a run-out warning. */
export const POWERUP_WARNING_MS = 2000;

export const POWERUP_INFO: Record<
  PowerUpKind,
  {
    label: string;
    blurb: string;
    main: number;
    cssColor: string;
    /** `grow` gives the Mario-style buff; `tool` runs its own Eco Tool logic. */
    power: 'grow' | 'tool';
  }
> = {
  ecoBadge: {
    label: 'Eco Badge',
    blurb: 'Lencana daur ulang bercahaya',
    main: 0x22c55e,
    cssColor: '#4ade80',
    power: 'grow',
  },
  ecoVest: {
    label: 'Rompi Eco Hero',
    blurb: 'Rompi pelindung relawan kebersihan',
    main: 0x16a34a,
    cssColor: '#86efac',
    power: 'grow',
  },
  recycleVacuum: {
    label: 'Recycle Vacuum',
    blurb: 'Penyedot sampah bertenaga daur ulang',
    main: 0x0ea5e9,
    cssColor: '#7dd3fc',
    power: 'tool',
  },
};

// ── Eco Tool: Recycle Vacuum ─────────────────────────────────

export const VACUUM_DURATION_MS = 12000;
/** Reach of the suction cone. Generous, but never the whole screen. */
export const VACUUM_RADIUS = 210;
/** How fast collectibles are dragged in once they are caught. */
export const VACUUM_PULL_SPEED = 520;
/** Distance at which a dragged pickup counts as swallowed. */
export const VACUUM_SWALLOW_DISTANCE = 26;
/**
 * How long a small flyer stays dazed. Long enough to walk past safely, short
 * enough that the level still has to be played rather than switched off.
 */
export const VACUUM_STUN_MS = 4000;
/** Cadence of the whirr loop and the suction particle stream. */
export const VACUUM_SFX_INTERVAL_MS = 620;
export const VACUUM_PARTICLE_INTERVAL_MS = 70;

// ── Mountain obstacles ───────────────────────────────────────

/** How long a crumbling rock holds once the player lands on it. */
export const CRUMBLE_DELAY_MS = 900;
/** How long the debris takes to fade after the shelf gives way. */
export const CRUMBLE_FALL_MS = 500;
/** How long before the shelf reforms, so a mistake is never permanent. */
export const CRUMBLE_RESPAWN_MS = 3200;

/** Warning window before a bolt lands. Long enough to walk out of the column. */
export const LIGHTNING_WARN_MS = 950;
/** How long the bolt itself is dangerous. */
export const LIGHTNING_STRIKE_MS = 220;
export const LIGHTNING_KNOCKBACK_Y = -340;

/** Burung Pemakan Sampah. */
export const TRASH_BIRD_SCORE = 220;
export const TRASH_BIRD_TELEGRAPH_MS = 520;
export const TRASH_BIRD_DIVE_SPEED = 320;
export const TRASH_BIRD_RETURN_SPEED = 210;
export const TRASH_BIRD_COOLDOWN_MS = 2400;

/** Batu longsor. */
export const BOULDER_KNOCKBACK_Y = -360;
export const BOULDER_RADIUS = 26;

/** Fog banks on the summit. */
export const FOG_FADE_MS = 700;

// ── Mini boss: Raja Polusi ───────────────────────────────────

export const POLLUTION_BOSS_PHASE_SCORE = 700;
export const POLLUTION_BOSS_DEFEAT_SCORE = 3500;
/** Drift speed per phase — the cloud gets angrier as it thins out. */
export const POLLUTION_BOSS_SPEEDS = [34, 46, 74];
/** Cadence of the pollution balls it lobs, per phase. */
export const POLLUTION_BALL_INTERVAL_MS = [2600, 2100, 1500];
export const POLLUTION_BALL_SPEED = 210;
/** From phase 2 the cloud also calls lightning down into the arena. */
export const POLLUTION_BOSS_BOLT_INTERVAL_MS = 3400;
/** And drags the player sideways, so jumps have to be aimed into the wind. */
export const POLLUTION_BOSS_WIND_FORCE = 165;
export const POLLUTION_BOSS_WIND_SWITCH_MS = 2600;
/** How often a fresh Eco Energy Orb appears in the arena. */
export const ECO_ORB_SPAWN_MS = 2600;
export const ECO_ORB_MAX = 3;
/** Speed of the shot the Eco Blaster fires. */
export const ECO_BLASTER_SPEED = 560;
/** How long a carried orb stays charged before it fizzles and is reissued. */
export const ECO_ORB_HOLD_MS = 14000;
export const POLLUTION_BOSS_STAGGER_MS = 1500;

// ── Forest obstacles ─────────────────────────────────────────

/** Mud drags the hero to 70% speed — noticeable, never a trap. */
export const MUD_SPEED_MULTIPLIER = 0.7;
export const MUD_HEIGHT = 20;
/** Snakes throw the player clear so they never land back on the hazard. */
export const SNAKE_KNOCKBACK_Y = -380;
/** Hitbox of the snake's head, the only damaging part. */
export const SNAKE_HEAD_SIZE = 22;
/** Half-height of a swaying log's collision slab. */
export const SWAY_LOG_HEIGHT = 22;

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
/** Reward for a Fire Guardian breaking down a pool by walking through it. */
export const TOXIC_NEUTRALISE_SCORE = 150;

// ── Flood wave (banjir) ──────────────────────────────────────

export const FLOOD_WAVE_WIDTH = 140;
/**
 * Height of the damaging water band. Kept below the ~112px a single jump
 * clears, so the wave is always dodgeable.
 */
export const FLOOD_DAMAGE_HEIGHT = 84;
/**
 * Crest height — purely visual. Sits inside the ~194px a double jump reaches,
 * so the wave looks big but never taller than the player can plausibly clear.
 */
export const FLOOD_CREST_HEIGHT = 140;
export const FLOOD_SPEED = 300;
/** Strong upward toss so being caught by the flood reads clearly. */
export const FLOOD_KNOCKBACK_Y = -380;

// ── Skin traits (guardian passives) ──────────────────────────

/** Green Guardian: how much faster the Eco Power meter fills. */
export const ECO_SURGE_MULTIPLIER = 1.35;
/** Earth Guardian: knockback scale, so a hit barely moves them. */
export const STEADFAST_KNOCKBACK_SCALE = 0.5;

// ── Mini boss: Raja Sampah TPA ───────────────────────────────

/**
 * How long the recycled energy stays charged. Generous on purpose: the charge
 * is a safe window to line up a throw, not a sprint timer. When it runs out the
 * machine simply hands out another orb, so progress is never lost.
 */
export const BOSS_ENERGY_DURATION_MS = 20000;
export const BOSS_PHASE_SCORE = 600;
export const BOSS_DEFEAT_SCORE = 3000;
export const BOSS_STUN_MS = 1400;
export const BOSS_PATROL_SPEED = 46;
/**
 * Junk throws only started actually arcing at the player once the velocity /
 * group-add ordering bug was fixed, so the cadence is deliberately slack to
 * keep the fight no harder than it was before.
 */
export const BOSS_THROW_INTERVAL_MS = 4200;
export const BOSS_SLAM_INTERVAL_MS = 9000;
export const BOSS_SLAM_TELEGRAPH_MS = 700;
/** Kept under the gap to the arena platforms so they always work as cover. */
export const BOSS_SLAM_RADIUS = 180;
export const BOSS_TRASH_MAX = 6;
export const BOSS_TRASH_SPAWN_MS = 1800;
export const BOSS_MACHINE_CYCLE_MS = 750;
/** Speed of the energy orb the player hurls at the king. */
export const BOSS_ORB_SPEED = 520;
/** Speed at which a fresh orb homes in on the player, so it is never a fetch quest. */
export const BOSS_ORB_MAGNET_SPEED = 600;
/** How far left of the arena the king refuses to walk, keeping the sorting area safe. */
export const BOSS_PATROL_MARGIN = 380;

export const TRASH_COLORS: Record<
  TrashType,
  { main: string; light: string; dark: string; label: string }
> = {
  plastic: { main: '#3b82f6', light: '#93c5fd', dark: '#1e40af', label: 'Plastik' },
  paper: { main: '#f59e0b', light: '#fcd34d', dark: '#92400e', label: 'Kertas' },
  organic: { main: '#22c55e', light: '#86efac', dark: '#15803d', label: 'Organik' },
  metal: { main: '#94a3b8', light: '#e2e8f0', dark: '#475569', label: 'Logam' },
  glass: { main: '#14b8a6', light: '#5eead4', dark: '#0f766e', label: 'Kaca' },
  hazard: { main: '#ef4444', light: '#fecaca', dark: '#991b1b', label: 'Limbah B3' },
};

// ── Collectible trash objects (emoji-based, no external assets) ──

/**
 * Every pickup in the game. The emoji IS the artwork: it is rendered into a
 * canvas texture at boot, so the player recognises the object instantly and the
 * pickup can announce its own name.
 */
export const TRASH_ITEMS: Record<
  TrashItemKind,
  { emoji: string; label: string; category: TrashType }
> = {
  botolPlastik: { emoji: '🧴', label: 'Botol Plastik', category: 'plastic' },
  gelasPlastik: { emoji: '🥤', label: 'Gelas Plastik', category: 'plastic' },
  kantongPlastik: { emoji: '🛍️', label: 'Kantong Plastik', category: 'plastic' },
  kaleng: { emoji: '🥫', label: 'Kaleng', category: 'metal' },
  kertas: { emoji: '📄', label: 'Kertas', category: 'paper' },
  kardus: { emoji: '📦', label: 'Kardus', category: 'paper' },
  botolKaca: { emoji: '🍾', label: 'Botol Kaca', category: 'glass' },
  organik: { emoji: '🍌', label: 'Sampah Organik', category: 'organic' },
  limbahB3: { emoji: '🔋', label: 'Limbah B3', category: 'hazard' },
};

export const TRASH_ITEM_KINDS = Object.keys(TRASH_ITEMS) as TrashItemKind[];

/** Used for any category a level does not theme itself. */
export const DEFAULT_TRASH_POOL: Record<TrashType, TrashItemKind[]> = {
  plastic: ['botolPlastik', 'gelasPlastik', 'kantongPlastik'],
  paper: ['kertas', 'kardus'],
  organic: ['organik'],
  metal: ['kaleng'],
  glass: ['botolKaca'],
  hazard: ['limbahB3'],
};

/** The object that stands for a whole category wherever only the bin matters. */
export const CATEGORY_ICON_ITEM: Record<TrashType, TrashItemKind> = {
  plastic: 'botolPlastik',
  paper: 'kertas',
  organic: 'organik',
  metal: 'kaleng',
  glass: 'botolKaca',
  hazard: 'limbahB3',
};

/** Rendered size of a trash emoji, and the texture box it is drawn into. */
export const TRASH_EMOJI_SIZE = 26;
export const TRASH_EMOJI_TEXTURE_SIZE = 34;
/** Hitbox of a trash pickup — a little forgiving relative to the artwork. */
export const TRASH_BODY_SIZE = 26;

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

/**
 * Categories the recycling machine accepts, i.e. the ones the mini boss can ask
 * for. `hazard` is intentionally excluded: limbah B3 must never be recycled.
 */
export const TRASH_TYPES: TrashType[] = ['plastic', 'paper', 'organic', 'metal', 'glass'];

export const BOOST_COLORS: Record<
  BoostType,
  { main: string; light: string; label: string }
> = {
  magnet: { main: '#a855f7', light: '#d8b4fe', label: 'Magnet' },
  shield: { main: '#06b6d4', light: '#67e8f9', label: 'Perisai' },
  jump: { main: '#f97316', light: '#fdba74', label: 'Lompat' },
};
