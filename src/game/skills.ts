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
    description: 'Gelombang energi hijau membersihkan sampah di sekitar, menghancurkan polusi, dan memberi perlindungan 5 detik.',
    education: 'Aksi kecil membersihkan lingkungan menciptakan dampak besar bagi bumi!',
    color: 0x22c55e,
    colorLight: 0xbbf7d0,
    cssColor: '#22c55e',
    icon: 'leaf',
    durationMs: 5000,
  },
  aqua: {
    element: 'aqua',
    name: 'River Clean Wave',
    guardian: 'Aqua Guardian',
    description: 'Gelombang air menarik sampah dari jauh dan membersihkan seluruh area.',
    education: 'Menjaga sungai bersih melindungi sumber air dan seluruh kehidupan di dalamnya.',
    color: 0x22d3ee,
    colorLight: 0xa5f3fc,
    cssColor: '#22d3ee',
    icon: 'waves',
    durationMs: 1400,
  },
  wind: {
    element: 'wind',
    name: 'Clean Wind',
    guardian: 'Wind Guardian',
    description: 'Terbang sesaat melewati jurang dan menarik sampah ringan seperti plastik dan kertas.',
    education: 'Angin bersih bebas polusi membuat semua makhluk hidup bernapas lebih lega.',
    color: 0x67e8f9,
    colorLight: 0xecfeff,
    cssColor: '#38bdf8',
    icon: 'wind',
    durationMs: 5000,
  },
  fire: {
    element: 'fire',
    name: 'Recycle Heat',
    guardian: 'Fire Guardian',
    description: 'Kalahkan seluruh polusi di layar seketika dengan panas daur ulang.',
    education: 'Tapi ingat: tidak semua sampah boleh dibakar! Plastik & elektronik harus didaur ulang.',
    color: 0xf97316,
    colorLight: 0xfed7aa,
    cssColor: '#f97316',
    icon: 'flame',
    durationMs: 800,
  },
  lightning: {
    element: 'lightning',
    name: 'Eco Scanner',
    guardian: 'Lightning Guardian',
    description: 'Pindai dan tandai sampah tersembunyi, lalu dapatkan bonus skor.',
    education: 'Ketelitian menemukan sampah tersembunyi membuat lingkungan benar-benar bersih.',
    color: 0xfacc15,
    colorLight: 0xfef9c3,
    cssColor: '#facc15',
    icon: 'zap',
    durationMs: 6000,
  },
  earth: {
    element: 'earth',
    name: 'Recycle Shield',
    guardian: 'Earth Guardian',
    description: 'Perisai daur ulang membuatmu kebal, menghancurkan bahaya, dan melindungi dari ancaman lingkungan.',
    education: 'Bumi yang kita lindungi akan memberi perlindungan kembali kepada kita.',
    color: 0xa16207,
    colorLight: 0xfde68a,
    cssColor: '#ca8a04',
    icon: 'shield',
    durationMs: 6000,
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
