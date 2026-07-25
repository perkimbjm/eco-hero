import type { SkillElement } from './skills';

export interface EcoRank {
  id: string;
  name: string;
  minXp: number;
  color: string;
  icon: string;
}

export const ECO_RANKS: EcoRank[] = [
  { id: 'beginner', name: 'Eco Beginner', minXp: 0, color: '#94a3b8', icon: 'sprout' },
  { id: 'warrior', name: 'Green Warrior', minXp: 400, color: '#22c55e', icon: 'swords' },
  { id: 'guardian', name: 'Earth Guardian', minXp: 1200, color: '#0891b2', icon: 'shield' },
  { id: 'ranger', name: 'Forest Ranger', minXp: 2200, color: '#16a34a', icon: 'trees' },
  { id: 'explorer', name: 'Eco Explorer', minXp: 3600, color: '#f59e0b', icon: 'compass' },
  { id: 'champion', name: 'Planet Champion', minXp: 5200, color: '#ec4899', icon: 'globe' },
  { id: 'legend', name: 'Eco Legend', minXp: 7000, color: '#f59e0b', icon: 'crown' },
  { id: 'master', name: 'Master of Peduli Sampah', minXp: 9000, color: '#dc2626', icon: 'award' },
];

export function getRankForXp(xp: number): EcoRank {
  let rank = ECO_RANKS[0];
  for (const r of ECO_RANKS) {
    if (xp >= r.minXp) rank = r;
  }
  return rank;
}

export function getNextRank(xp: number): EcoRank | null {
  for (const r of ECO_RANKS) {
    if (xp < r.minXp) return r;
  }
  return null;
}

export function getRankProgress(xp: number): { current: EcoRank; next: EcoRank | null; pct: number; xpIntoRank: number; xpForNext: number } {
  const current = getRankForXp(xp);
  const next = getNextRank(xp);
  if (!next) return { current, next: null, pct: 100, xpIntoRank: xp - current.minXp, xpForNext: 0 };
  const xpIntoRank = xp - current.minXp;
  const xpForNext = next.minXp - current.minXp;
  return { current, next, pct: Math.min(100, (xpIntoRank / xpForNext) * 100), xpIntoRank, xpForNext };
}

// ── XP rewards ──────────────────────────────────────────────

export const XP_REWARDS = {
  trash: 15,
  enemy: 40,
  flyingEnemy: 60,
  secret: 60,
  levelComplete: 200,
  allTrashBonus: 50,
  allSecretsBonus: 50,
  allEnemiesBonus: 80,
  noDamageBonus: 150,
  timeBonus: 120,
  boost: 10,
} as const;

// ── Eco Coin rewards ────────────────────────────────────────

export const COIN_REWARDS = {
  trash: 3,
  enemy: 8,
  flyingEnemy: 12,
  secret: 12,
  levelComplete: 50,
  allTrashBonus: 15,
  allSecretsBonus: 15,
  allEnemiesBonus: 25,
  noDamageBonus: 50,
  timeBonus: 30,
  boost: 5,
} as const;

// ── Skins ───────────────────────────────────────────────────

export interface SkinDef {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Elemental Eco Power skill this character grants. */
  skill: SkillElement;
  colors: {
    body: number;
    bodyLight: number;
    head: number;
    cap: number;
    capBrim: number;
    belt: number;
    legs: number;
    shoes: number;
  };
}

export const SKINS: SkinDef[] = [
  {
    id: 'default',
    name: 'Green Guardian',
    description: 'Pahlawan bumi andalan. Skill: Green Blast — gelombang energi hijau pembersih polusi.',
    price: 0,
    skill: 'green',
    colors: {
      body: 0x15803d, bodyLight: 0x22c55e, head: 0xfde68a,
      cap: 0xdc2626, capBrim: 0xef4444, belt: 0xfacc15,
      legs: 0x1e3a8a, shoes: 0x451a03,
    },
  },
  {
    id: 'forest',
    name: 'Wind Guardian',
    description: 'Penjaga angin hutan. Skill: Clean Wind — terbang sesaat & tarik sampah ringan.',
    price: 200,
    skill: 'wind',
    colors: {
      body: 0x166534, bodyLight: 0x86efac, head: 0xfde68a,
      cap: 0x15803d, capBrim: 0x22c55e, belt: 0x84cc16,
      legs: 0x365314, shoes: 0x422006,
    },
  },
  {
    id: 'ocean',
    name: 'Aqua Guardian',
    description: 'Penjaga air & sungai. Skill: River Clean Wave — tarik sampah dari jarak jauh.',
    price: 350,
    skill: 'aqua',
    colors: {
      body: 0x0e7490, bodyLight: 0x67e8f9, head: 0xfde68a,
      cap: 0x0284c7, capBrim: 0x38bdf8, belt: 0x06b6d4,
      legs: 0x164e63, shoes: 0x083344,
    },
  },
  {
    id: 'recycle',
    name: 'Fire Guardian',
    description: 'Ahli panas daur ulang. Skill: Recycle Heat — kalahkan seluruh polusi seketika.',
    price: 500,
    skill: 'fire',
    colors: {
      body: 0xca8a04, bodyLight: 0xfde047, head: 0xfde68a,
      cap: 0x65a30d, capBrim: 0x84cc16, belt: 0x422006,
      legs: 0x4d7c0f, shoes: 0x1c1917,
    },
  },
  {
    id: 'future',
    name: 'Lightning Guardian',
    description: 'Pahlawan pemindai berteknologi nano. Skill: Eco Scanner — tandai sampah tersembunyi & bonus skor.',
    price: 800,
    skill: 'lightning',
    colors: {
      body: 0x6366f1, bodyLight: 0xa5b4fc, head: 0xe0e7ff,
      cap: 0x0891b2, capBrim: 0x06b6d4, belt: 0x1e293b,
      legs: 0x1e293b, shoes: 0x0f172a,
    },
  },
  {
    id: 'terra',
    name: 'Earth Guardian',
    description: 'Penjaga bumi berperisai. Skill: Recycle Shield — kebal & hancurkan bahaya lingkungan.',
    price: 650,
    skill: 'earth',
    colors: {
      body: 0x92400e, bodyLight: 0xd97706, head: 0xfde68a,
      cap: 0x78350f, capBrim: 0xa16207, belt: 0x84cc16,
      legs: 0x451a03, shoes: 0x292524,
    },
  },
];

export function getSkinById(id: string): SkinDef | undefined {
  return SKINS.find((s) => s.id === id);
}

// ── Badges ──────────────────────────────────────────────────

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (progress: PlayerProgressData) => boolean;
}

export interface PlayerProgressData {
  totalXp: number;
  ecoCoins: number;
  totalTrashCollected: number;
  totalEnemiesDefeated: number;
  totalSecretsFound: number;
  totalAnimalsSaved: number;
  levelsCompleted: number;
  beachesCompleted: number;
  riversCompleted: number;
  unlockedSkins: string[];
  unlockedBadges: string[];
  equippedSkin: string;
}

export const BADGES: BadgeDef[] = [
  {
    id: 'waste_collector',
    name: 'Waste Collector',
    description: 'Kumpulkan 50 sampah secara total',
    icon: 'trash',
    check: (p) => p.totalTrashCollected >= 50,
  },
  {
    id: 'ocean_guardian',
    name: 'Ocean Guardian',
    description: 'Selesaikan semua level pantai',
    icon: 'waves',
    check: (p) => p.beachesCompleted >= 1,
  },
  {
    id: 'river_protector',
    name: 'River Protector',
    description: 'Selesaikan semua level sungai',
    icon: 'droplet',
    check: (p) => p.riversCompleted >= 1,
  },
  {
    id: 'eco_legend',
    name: 'Eco Legend',
    description: 'Selesaikan seluruh dunia (semua level)',
    icon: 'crown',
    check: (p) => p.levelsCompleted >= 4,
  },
  {
    id: 'enemy_slayer',
    name: 'Pollution Slayer',
    description: 'Kalahkan 20 musuh polusi',
    icon: 'swords',
    check: (p) => p.totalEnemiesDefeated >= 20,
  },
  {
    id: 'secret_hunter',
    name: 'Secret Hunter',
    description: 'Temukan 10 bonus rahasia',
    icon: 'gem',
    check: (p) => p.totalSecretsFound >= 10,
  },
  {
    id: 'eco_master',
    name: 'Master of Peduli Sampah',
    description: 'Capai XP 7000 dan jadi Master',
    icon: 'award',
    check: (p) => p.totalXp >= 7000,
  },
  {
    id: 'skin_collector',
    name: 'Fashion Hero',
    description: 'Buka 3 skin karakter',
    icon: 'shirt',
    check: (p) => p.unlockedSkins.length >= 4,
  },
];

export function checkNewBadges(progress: PlayerProgressData): BadgeDef[] {
  const newBadges: BadgeDef[] = [];
  for (const badge of BADGES) {
    if (!progress.unlockedBadges.includes(badge.id) && badge.check(progress)) {
      newBadges.push(badge);
    }
  }
  return newBadges;
}

// ── Environmental challenges per level theme ─────────────────

export interface EnvironmentalChallenge {
  type: 'wind' | 'flood' | 'smog' | 'none';
  description: string;
  warning: string;
}

export const LEVEL_CHALLENGES: Record<string, EnvironmentalChallenge> = {
  park: { type: 'none', description: '', warning: '' },
  beach: {
    type: 'wind',
    description: 'Angin laut mempercepat gerakan musuh!',
    warning: 'Awas! Angin laut membuat polusi bergerak lebih cepat!',
  },
  river: {
    type: 'flood',
    description: 'Banjir sesaat muncul tiba-tiba — lompati!',
    warning: 'Banjir! Lompati gelombang yang datang!',
  },
  landfill: {
    type: 'smog',
    description: 'Asap tebal menutupi pandangan...',
    warning: 'Asap tebal! Jaga jarak dengan musuh!',
  },
  forest: {
    type: 'wind',
    description: 'Angin hutan membawa debu daun!',
    warning: 'Angin! Tahan apa yang bisa!',
  },
  mountain: {
    type: 'flood',
    description: 'Longsor! Jangan tertimbun!',
    warning: 'Longsor! Lompat ke atas!',
  },
  city: {
    type: 'smog',
    description: 'Polusi kota tebal...',
    warning: 'Polusi! Pandangan mengecil!',
  },
  ocean: {
    type: 'flood',
    description: 'Gelombang besar datang!',
    warning: 'Gelombang! Jaga jejakmu!',
  },
};
