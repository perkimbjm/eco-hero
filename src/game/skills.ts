/**
 * Eco Power skill system.
 *
 * Every character skin grants one elemental skill. The player charges an Eco
 * Power meter through positive actions (collecting trash, defeating pollution,
 * finding secrets, building combos); once it hits 100% the skill can be fired
 * exactly once per level for a spectacular, satisfying pay-off that also
 * reinforces the game's environmental message.
 */

export type SkillElement = 'green' | 'aqua' | 'wind' | 'fire' | 'lightning' | 'earth';

export interface SkillDef {
  element: SkillElement;
  /** Skill name shown on activation, e.g. "Green Blast". */
  name: string;
  /** Guardian archetype this skill belongs to, e.g. "Green Guardian". */
  guardian: string;
  /** Short gameplay description. */
  description: string;
  /** Educational takeaway surfaced when the skill fires. */
  education: string;
  /** Primary energy colour (hex int) used for the cinematic and HUD. */
  color: number;
  /** Lighter accent colour (hex int). */
  colorLight: number;
  /** CSS hex string for the HUD skill button. */
  cssColor: string;
  /** Lucide icon name for the HUD skill button. */
  icon: string;
  /** Duration of any lingering effect (shield / flight / invulnerability). */
  durationMs: number;
}

export const SKILLS: Record<SkillElement, SkillDef> = {
  green: {
    element: 'green',
    name: 'Green Blast',
    guardian: 'Green Guardian',
    description:
      'Ledakan energi hijau menyapu area sekitar, membersihkan sampah, mengalahkan monster polusi, dan memberi perlindungan energi selama beberapa detik.',
    education:
      'Setiap tindakan kecil menjaga lingkungan dapat memberikan perubahan besar bagi bumi.',
    color: 0x22c55e,
    colorLight: 0xbbf7d0,
    cssColor: '#22c55e',
    icon: 'leaf',
    durationMs: 7000,
  },

  aqua: {
    element: 'aqua',
    name: 'River Clean Wave',
    guardian: 'Aqua Guardian',
    description:
      'Memanggil gelombang air besar yang bergerak maju, menarik sampah dari kejauhan, membersihkan sungai, dan mendorong musuh polusi.',
    education:
      'Sungai yang bersih menjaga air tetap sehat bagi manusia, hewan, dan tumbuhan.',
    color: 0x22d3ee,
    colorLight: 0xa5f3fc,
    cssColor: '#22d3ee',
    icon: 'waves',
    durationMs: 3000,
  },

  wind: {
    element: 'wind',
    name: 'Clean Wind',
    guardian: 'Wind Guardian',
    description:
      'Menciptakan pusaran angin bersih yang membuat karakter terbang sementara, melewati rintangan, dan menyapu sampah ringan di sekitar.',
    education:
      'Udara bersih membuat semua makhluk hidup dapat bernapas lebih sehat.',
    color: 0x38bdf8,
    colorLight: 0xe0f2fe,
    cssColor: '#38bdf8',
    icon: 'wind',
    durationMs: 5000,
  },

  fire: {
    element: 'fire',
    name: 'Recycle Heat',
    guardian: 'Fire Guardian',
    description:
      'Menghasilkan energi panas daur ulang yang menghancurkan monster polusi dan mengubah limbah berbahaya menjadi energi bersih.',
    education:
      'Api ini bukan untuk membakar sampah, tetapi mengubah polusi menjadi energi bersih.',
    color: 0xf97316,
    colorLight: 0xfed7aa,
    cssColor: '#f97316',
    icon: 'flame',
    durationMs: 2500,
  },

  lightning: {
    element: 'lightning',
    name: 'Eco Thunder',
    guardian: 'Lightning Guardian',
    description:
      'Memanggil petir energi hijau yang menyerang seluruh monster polusi, membuka sampah tersembunyi, dan meningkatkan skor kombo.',
    education:
      'Teknologi pintar membantu manusia menemukan dan mengelola sampah dengan lebih baik.',
    color: 0xfacc15,
    colorLight: 0xfef9c3,
    cssColor: '#facc15',
    icon: 'zap',
    durationMs: 7000,
  },

  earth: {
    element: 'earth',
    name: 'Earthquake Recycle',
    guardian: 'Earth Guardian',
    description:
      'Menghentakkan kekuatan bumi untuk membuat gelombang tanah, menghancurkan penghalang, mengalahkan polusi, dan memberi perlindungan sementara.',
    education:
      'Melindungi bumi berarti menjaga keseimbangan alam agar bumi terus melindungi kita.',
    color: 0xa16207,
    colorLight: 0xfde68a,
    cssColor: '#ca8a04',
    icon: 'mountain',
    durationMs: 5000,
  },
};

export function getSkill(element: SkillElement): SkillDef {
  return SKILLS[element];
}

// ── Eco Power meter ─────────────────────────────────────────

export const ECO_POWER_MAX = 100;

/** How much Eco Power each positive action grants. Tuned to fill roughly
 *  once per level so firing the skill stays a special moment. */
export const ECO_POWER_GAIN = {
  trash: 7,
  secret: 14,
  enemy: 12,
  flyingEnemy: 12,
  /** Bonus added each time a combo of 3+ is extended. */
  combo: 3,
} as const;

/**
 * Window after casting during which the player is returned to the spot they
 * cast from (instead of the level start) if they somehow leave the world.
 * Firing a skill must never cost progress or a life.
 */
export const SKILL_POSITION_GUARD_MS = 1500;

/** Snapshot of the Eco Power state pushed to the HUD. */
export interface EcoPowerState {
  power: number;
  max: number;
  ready: boolean;
  used: boolean;
  skillName: string;
  guardian: string;
  education: string;
  cssColor: string;
  icon: string;
}
