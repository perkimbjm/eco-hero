import Phaser from 'phaser';
import {
  CATEGORY_ICON_ITEM,
  TRASH_EMOJI_SIZE,
  TRASH_EMOJI_TEXTURE_SIZE,
  TRASH_ITEMS,
  TRASH_ITEM_KINDS,
} from './constants';
import type { TrashType, ThemeKey } from './types';
import { SKINS, type SkinDef } from './progression';

type G = Phaser.GameObjects.Graphics;

export function generateAllTextures(scene: Phaser.Scene, skinId: string = 'default'): void {
  const skin = SKINS.find((s) => s.id === skinId) ?? SKINS[0];
  generateWhitePixel(scene);
  generatePlayerTextures(scene, skin);
  generateEnemyTextures(scene);
  generateFlyingEnemyTextures(scene);
  generateGiantFlyTextures(scene);
  generateToxicTextures(scene);
  generateBossTextures(scene);
  generateTrashTextures(scene);
  generateSecretTextures(scene);
  generateParticleTextures(scene);
  generateGoalTexture(scene);
  generateTreeTextures(scene);
  generateBoostTextures(scene);
  generateHeartTexture(scene);
  generateMysteryBlockTextures(scene);
  generatePowerUpTextures(scene);
  generateDisguisedBlockTextures(scene);
  generateSnakeTextures(scene);
  generateEcoToolTextures(scene);
  generateMountainTextures(scene);
}

function generateWhitePixel(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 4, 4);
  g.generateTexture('__white', 4, 4);
  g.destroy();
}

function makeTexture(scene: Phaser.Scene, key: string, width: number, height: number, draw: (g: G) => void): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

// ── Player ──────────────────────────────────────────────────

function generatePlayerTextures(scene: Phaser.Scene, skin: SkinDef): void {
  const W = 36;
  const H = 56;
  const Y_SHIFT = 14;
  const c = skin.colors;

  const drawPlayer = (g: G, frame: 'idle' | 'run1' | 'run2' | 'jump', facing = 1) => {
    g.clear();
    const cx = W / 2;
    const legOffset = frame === 'run1' ? 3 : frame === 'run2' ? -3 : 0;
    const armOffset = frame === 'run1' ? -2 : frame === 'run2' ? 2 : 0;
    const bodyY = (frame === 'jump' ? -1 : 0) + Y_SHIFT;

    // Body
    g.fillStyle(c.body, 1);
    g.fillRect(cx - 12, 2 + bodyY, 24, 18);
    g.fillStyle(c.bodyLight, 1);
    g.fillRect(cx - 12, 2 + bodyY, 24, 5);

    // Belt
    g.fillStyle(c.belt, 1);
    g.fillRect(cx - 12, 14 + bodyY, 24, 3);

    // Head
    g.fillStyle(c.head, 1);
    g.fillCircle(cx, -4 + bodyY, 10);

    // Cap
    g.fillStyle(c.cap, 1);
    g.fillCircle(cx, -7 + bodyY, 10);
    g.fillRect(cx - 10, -8 + bodyY, 20, 4);
    g.fillStyle(c.capBrim, 1);
    g.fillRect(cx + (facing > 0 ? 8 : -16), -9 + bodyY, 8, 4);

    // Eyes
    g.fillStyle(0x1c1917, 1);
    g.fillCircle(cx + facing * 4, -4 + bodyY, 2);

    // Smile
    g.lineStyle(1.5, 0x1c1917, 1);
    g.beginPath();
    g.arc(cx + facing * 2, -1 + bodyY, 3, 0, Math.PI);
    g.strokePath();

    // Arms
    g.fillStyle(c.head, 1);
    g.fillRect(cx - 14, 4 + bodyY + armOffset, 4, 12);
    g.fillRect(cx + 10, 4 + bodyY - armOffset, 4, 12);

    // Legs
    g.fillStyle(c.legs, 1);
    g.fillRect(cx - 8, 20 + bodyY, 6, 11 + legOffset);
    g.fillRect(cx + 2, 20 + bodyY, 6, 11 - legOffset);

    // Shoes
    g.fillStyle(c.shoes, 1);
    g.fillRect(cx - 10, 29 + bodyY + legOffset, 8, 4);
    g.fillRect(cx + 2, 29 + bodyY - legOffset, 8, 4);
  };

  makeTexture(scene, 'player_idle', W, H, (g) => drawPlayer(g, 'idle'));
  makeTexture(scene, 'player_run1', W, H, (g) => drawPlayer(g, 'run1'));
  makeTexture(scene, 'player_run2', W, H, (g) => drawPlayer(g, 'run2'));
  makeTexture(scene, 'player_jump', W, H, (g) => drawPlayer(g, 'jump'));
}

// ── Enemy (Pollution Blob) ──────────────────────────────────

function generateEnemyTextures(scene: Phaser.Scene): void {
  const W = 40;
  const H = 40;

  const drawEnemy = (g: G, frame: number) => {
    g.clear();
    const cx = W / 2;
    const cy = H / 2;
    const bob = frame === 0 ? 0 : -2;

    // Body
    g.fillStyle(0x6b21a8, 1);
    g.fillCircle(cx, cy + bob, 18);
    g.fillCircle(cx - 12, cy + 4 + bob, 12);
    g.fillCircle(cx + 12, cy + 4 + bob, 12);

    g.fillStyle(0x7e22ce, 1);
    g.fillCircle(cx, cy - 4 + bob, 16);

    // Eyes
    g.fillStyle(0xfefce8, 1);
    g.fillCircle(cx - 7, cy - 5 + bob, 5);
    g.fillCircle(cx + 7, cy - 5 + bob, 5);
    g.fillStyle(0xdc2626, 1);
    g.fillCircle(cx - 7, cy - 4 + bob, 2.5);
    g.fillCircle(cx + 7, cy - 4 + bob, 2.5);

    // Frown
    g.lineStyle(2, 0xfefce8, 1);
    g.beginPath();
    g.arc(cx, cy + 8 + bob, 5, Math.PI, 0, true);
    g.strokePath();
  };

  makeTexture(scene, 'enemy0', W, H, (g) => drawEnemy(g, 0));
  makeTexture(scene, 'enemy1', W, H, (g) => drawEnemy(g, 1));

  // Defeated (squished)
  makeTexture(scene, 'enemy_defeated', W, H, (g) => {
    g.clear();
    g.fillStyle(0x6b21a8, 1);
    g.fillEllipse(W / 2, H - 8, 34, 14);
    g.fillStyle(0x581c87, 1);
    g.fillEllipse(W / 2, H - 6, 28, 8);
  });
}

// ── Flying Enemy ────────────────────────────────────────────

function generateFlyingEnemyTextures(scene: Phaser.Scene): void {
  const W = 40;
  const H = 30;

  const drawFlyer = (g: G) => {
    g.clear();
    const cx = W / 2;
    const cy = H / 2;

    // Wings
    g.fillStyle(0x9333ea, 0.8);
    g.fillEllipse(cx, cy + 4, 30, 10);
    g.fillStyle(0xa855f7, 0.7);
    g.fillEllipse(cx, cy + 2, 24, 8);

    // Body
    g.fillStyle(0x6b21a8, 1);
    g.fillCircle(cx, cy - 2, 10);
    g.fillStyle(0x7e22ce, 1);
    g.fillCircle(cx, cy - 4, 8);

    // Eyes
    g.fillStyle(0xfefce8, 1);
    g.fillCircle(cx - 4, cy - 5, 3);
    g.fillCircle(cx + 4, cy - 5, 3);
    g.fillStyle(0xdc2626, 1);
    g.fillCircle(cx - 4, cy - 4, 1.5);
    g.fillCircle(cx + 4, cy - 4, 1.5);
  };

  makeTexture(scene, 'enemy_fly', W, H, (g) => drawFlyer(g));
}

// ── Giant Fly (Lalat Raksasa) ───────────────────────────────

function generateGiantFlyTextures(scene: Phaser.Scene): void {
  const W = 56;
  const H = 44;

  const drawFly = (g: G, wing: 'up' | 'down', angry: boolean) => {
    g.clear();
    const cx = W / 2;
    const cy = H / 2 + 2;
    const wingY = wing === 'up' ? cy - 13 : cy - 3;
    const wingH = wing === 'up' ? 16 : 9;

    // Wings — translucent, flap between two poses
    g.fillStyle(0xe0f2fe, 0.45);
    g.fillEllipse(cx - 15, wingY, 26, wingH);
    g.fillEllipse(cx + 15, wingY, 26, wingH);
    g.fillStyle(0xffffff, 0.3);
    g.fillEllipse(cx - 17, wingY - 1, 16, Math.max(4, wingH - 4));
    g.fillEllipse(cx + 17, wingY - 1, 16, Math.max(4, wingH - 4));

    // Abdomen (striped, grimy)
    g.fillStyle(0x1c1917, 1);
    g.fillEllipse(cx + 3, cy + 4, 34, 22);
    g.fillStyle(0x3f3f46, 1);
    g.fillEllipse(cx + 5, cy + 2, 26, 15);
    g.fillStyle(0x65a30d, 0.8);
    g.fillEllipse(cx + 11, cy + 3, 9, 12);
    g.fillEllipse(cx + 1, cy + 3, 7, 14);

    // Thorax
    g.fillStyle(0x27272a, 1);
    g.fillCircle(cx - 11, cy, 12);
    g.fillStyle(0x52525b, 1);
    g.fillCircle(cx - 12, cy - 3, 8);

    // Head + compound eyes
    g.fillStyle(0x18181b, 1);
    g.fillCircle(cx - 21, cy + 1, 9);
    const eye = angry ? 0xef4444 : 0xdc2626;
    g.fillStyle(eye, 1);
    g.fillCircle(cx - 24, cy - 3, 6);
    g.fillCircle(cx - 19, cy + 4, 5);
    g.fillStyle(0xfca5a5, 1);
    g.fillCircle(cx - 26, cy - 5, 2);

    // Legs
    g.lineStyle(2, 0x18181b, 1);
    g.beginPath();
    g.moveTo(cx - 8, cy + 9); g.lineTo(cx - 14, cy + 18);
    g.moveTo(cx, cy + 11); g.lineTo(cx - 2, cy + 20);
    g.moveTo(cx + 8, cy + 11); g.lineTo(cx + 12, cy + 19);
    g.strokePath();

    // Proboscis
    g.lineStyle(3, 0x84cc16, 1);
    g.beginPath();
    g.moveTo(cx - 27, cy + 5); g.lineTo(cx - 31, cy + 10);
    g.strokePath();
  };

  makeTexture(scene, 'giant_fly1', W, H, (g) => drawFly(g, 'up', false));
  makeTexture(scene, 'giant_fly2', W, H, (g) => drawFly(g, 'down', false));
  makeTexture(scene, 'giant_fly_angry', W, H, (g) => drawFly(g, 'down', true));
}

// ── Toxic Waste (Limbah Beracun) ────────────────────────────

function generateToxicTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'toxic_bubble', 14, 14, (g) => {
    g.clear();
    g.fillStyle(0xa3e635, 0.85);
    g.fillCircle(7, 7, 6);
    g.fillStyle(0xecfccb, 0.9);
    g.fillCircle(5, 5, 2);
  });

  makeTexture(scene, 'toxic_sign', 30, 40, (g) => {
    g.clear();
    // Post
    g.fillStyle(0x44403c, 1);
    g.fillRect(13, 20, 4, 20);
    // Warning triangle
    g.fillStyle(0x1c1917, 1);
    g.fillTriangle(15, 0, 1, 24, 29, 24);
    g.fillStyle(0xfacc15, 1);
    g.fillTriangle(15, 4, 4, 22, 26, 22);
    // Skull glyph
    g.fillStyle(0x1c1917, 1);
    g.fillCircle(15, 14, 5);
    g.fillRect(12, 17, 6, 4);
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(13, 13, 1.5);
    g.fillCircle(17, 13, 1.5);
  });
}

// ── Mini Boss: Raja Sampah TPA ──────────────────────────────

function generateBossTextures(scene: Phaser.Scene): void {
  const W = 150;
  const H = 170;

  // The king is literally built from junk: tires, bottles, cans, dead electronics.
  makeTexture(scene, 'boss_king', W, H, (g) => {
    g.clear();
    const cx = W / 2;

    // ── Legs: two stacked tires
    for (const lx of [cx - 34, cx + 34]) {
      g.fillStyle(0x18181b, 1);
      g.fillCircle(lx, H - 24, 24);
      g.fillStyle(0x3f3f46, 1);
      g.fillCircle(lx, H - 24, 13);
      g.fillStyle(0x27272a, 1);
      g.fillCircle(lx, H - 24, 7);
      // Tread notches
      g.fillStyle(0x09090b, 1);
      for (let a = 0; a < 8; a++) {
        const ang = (Math.PI * 2 * a) / 8;
        g.fillRect(lx + Math.cos(ang) * 19 - 2, H - 24 + Math.sin(ang) * 19 - 2, 4, 4);
      }
    }

    // ── Torso: a crushed dumpster of compacted waste
    g.fillStyle(0x3f3f46, 1);
    g.fillRect(cx - 48, 60, 96, 82);
    g.fillStyle(0x52525b, 1);
    g.fillRect(cx - 44, 64, 88, 32);
    g.fillStyle(0x27272a, 1);
    g.fillRect(cx - 48, 126, 96, 16);

    // Junk poking out of the torso
    g.fillStyle(0x3b82f6, 1);      // plastic bottle
    g.fillRect(cx - 40, 100, 12, 26);
    g.fillStyle(0x93c5fd, 1);
    g.fillRect(cx - 40, 100, 12, 6);
    g.fillStyle(0x94a3b8, 1);      // can
    g.fillRect(cx + 22, 104, 16, 22);
    g.fillStyle(0xe2e8f0, 1);
    g.fillEllipse(cx + 30, 104, 16, 6);
    g.fillStyle(0xf59e0b, 1);      // crumpled paper
    g.fillCircle(cx + 2, 116, 11);
    g.fillStyle(0x14b8a6, 0.9);    // broken glass shard
    g.fillTriangle(cx - 16, 126, cx - 6, 104, cx - 2, 126);

    // ── Arms: bottle-and-tire limbs
    for (const dir of [-1, 1]) {
      const ax = cx + dir * 58;
      g.fillStyle(0x27272a, 1);
      g.fillRect(ax - 9, 70, 18, 46);
      g.fillStyle(0x0ea5e9, 0.9);
      g.fillRect(ax - 7, 78, 14, 16);
      // Fist = a tire
      g.fillStyle(0x18181b, 1);
      g.fillCircle(ax, 126, 17);
      g.fillStyle(0x3f3f46, 1);
      g.fillCircle(ax, 126, 8);
    }

    // ── Head: a dead CRT television
    g.fillStyle(0x1c1917, 1);
    g.fillRect(cx - 36, 14, 72, 50);
    g.fillStyle(0x44403c, 1);
    g.fillRect(cx - 32, 18, 64, 42);
    // Cracked screen
    g.fillStyle(0x052e16, 1);
    g.fillRect(cx - 27, 22, 54, 32);
    g.fillStyle(0x22c55e, 0.25);
    g.fillRect(cx - 27, 22, 54, 10);
    // Angry glitch eyes
    g.fillStyle(0xef4444, 1);
    g.fillRect(cx - 20, 30, 14, 8);
    g.fillRect(cx + 6, 30, 14, 8);
    g.fillStyle(0xfca5a5, 1);
    g.fillRect(cx - 17, 32, 5, 4);
    g.fillRect(cx + 9, 32, 5, 4);
    // Jagged mouth
    g.fillStyle(0xfacc15, 1);
    for (let i = 0; i < 5; i++) {
      g.fillTriangle(cx - 20 + i * 10, 50, cx - 15 + i * 10, 42, cx - 10 + i * 10, 50);
    }
    // Crack line
    g.lineStyle(2, 0x84cc16, 0.9);
    g.beginPath();
    g.moveTo(cx - 27, 26); g.lineTo(cx - 10, 38); g.lineTo(cx - 16, 48); g.lineTo(cx + 4, 54);
    g.strokePath();

    // ── Crown of crushed cans (kept inside the texture bounds)
    g.fillStyle(0xca8a04, 1);
    g.fillRect(cx - 30, 8, 60, 8);
    g.fillStyle(0xfacc15, 1);
    for (let i = 0; i < 5; i++) {
      g.fillTriangle(cx - 28 + i * 14, 8, cx - 21 + i * 14, 0, cx - 14 + i * 14, 8);
    }
  });

  // Recycling machine — the only way to convert junk into ammo.
  makeTexture(scene, 'recycle_machine', 96, 116, (g) => {
    g.clear();
    // Body
    g.fillStyle(0x14532d, 1);
    g.fillRect(6, 20, 84, 96);
    g.fillStyle(0x16a34a, 1);
    g.fillRect(10, 24, 76, 60);
    g.fillStyle(0x052e16, 1);
    g.fillRect(6, 100, 84, 16);

    // Intake hopper
    g.fillStyle(0x1c1917, 1);
    g.fillTriangle(14, 20, 82, 20, 68, 2);
    g.fillStyle(0x334155, 1);
    g.fillTriangle(20, 18, 76, 18, 64, 6);

    // Display panel
    g.fillStyle(0x022c22, 1);
    g.fillRect(20, 34, 56, 30);
    g.fillStyle(0x4ade80, 0.9);
    g.fillCircle(34, 49, 8);
    g.lineStyle(3, 0x022c22, 1);
    g.beginPath();
    g.arc(34, 49, 8, 0.6, 2.4);
    g.strokePath();
    g.fillStyle(0xbbf7d0, 1);
    g.fillRect(50, 44, 18, 4);
    g.fillRect(50, 52, 12, 4);

    // Output chute + indicator lights
    g.fillStyle(0x0f172a, 1);
    g.fillRect(24, 74, 48, 18);
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(18, 94, 4);
    g.fillStyle(0x22d3ee, 1);
    g.fillCircle(32, 94, 4);
    g.fillStyle(0xef4444, 1);
    g.fillCircle(46, 94, 4);
  });

  // Recycled energy orb — the boss's only weakness.
  makeTexture(scene, 'energy_orb', 34, 34, (g) => {
    g.clear();
    const c = 17;
    g.fillStyle(0x22c55e, 0.25);
    g.fillCircle(c, c, 16);
    g.fillStyle(0x4ade80, 0.55);
    g.fillCircle(c, c, 12);
    g.fillStyle(0xbbf7d0, 1);
    g.fillCircle(c, c, 8);
    // Recycle arrows
    g.fillStyle(0x15803d, 1);
    for (let i = 0; i < 3; i++) {
      const ang = (Math.PI * 2 * i) / 3 - Math.PI / 2;
      const px = c + Math.cos(ang) * 5;
      const py = c + Math.sin(ang) * 5;
      g.fillTriangle(px, py - 3, px - 3, py + 3, px + 3, py + 3);
    }
  });

  // Junk projectile the boss hurls.
  makeTexture(scene, 'boss_junk', 30, 30, (g) => {
    g.clear();
    g.fillStyle(0x44403c, 1);
    g.fillCircle(15, 15, 13);
    g.fillStyle(0x78716c, 1);
    g.fillCircle(12, 12, 8);
    g.fillStyle(0x3b82f6, 1);
    g.fillRect(16, 6, 7, 12);
    g.fillStyle(0x94a3b8, 1);
    g.fillRect(5, 17, 10, 8);
    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(21, 22, 4);
  });
}

// ── Trash ───────────────────────────────────────────────────

/**
 * Emoji, rendered into a canvas texture. Colour emoji come from the platform
 * font, so a recognisable pictogram costs no image asset and no icon library.
 */
function makeEmojiTexture(scene: Phaser.Scene, key: string, emoji: string, fontSize: number, boxSize: number): void {
  // Textures are regenerated when the equipped skin changes, and createCanvas
  // refuses to overwrite an existing key.
  if (scene.textures.exists(key)) scene.textures.remove(key);

  const canvas = scene.textures.createCanvas(key, boxSize, boxSize);
  const ctx = canvas?.getContext();
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, boxSize, boxSize);
  ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // A soft drop shadow keeps the pictogram readable over busy backgrounds.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  ctx.fillText(emoji, boxSize / 2, boxSize / 2 + 1);

  canvas.refresh();
}

function generateTrashTextures(scene: Phaser.Scene): void {
  // One texture per collectible object...
  for (const kind of TRASH_ITEM_KINDS) {
    makeEmojiTexture(
      scene,
      `trashitem_${kind}`,
      TRASH_ITEMS[kind].emoji,
      TRASH_EMOJI_SIZE,
      TRASH_EMOJI_TEXTURE_SIZE
    );
  }

  // ...plus one per sorting category, for everywhere only the bin matters
  // (the mini boss's carried icon, machine prompts, arena litter).
  for (const category of Object.keys(CATEGORY_ICON_ITEM) as TrashType[]) {
    makeEmojiTexture(
      scene,
      `trash_${category}`,
      TRASH_ITEMS[CATEGORY_ICON_ITEM[category]].emoji,
      TRASH_EMOJI_SIZE,
      TRASH_EMOJI_TEXTURE_SIZE
    );
  }
}

// ── Secrets (Maggot & Compost) ──────────────────────────────

function generateSecretTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'secret_maggot', 24, 24, (g) => {
    g.clear();
    g.fillStyle(0xfbbf24, 1);
    g.fillEllipse(12, 12, 18, 10);
    g.fillStyle(0xfde68a, 1);
    g.fillEllipse(8, 12, 6, 6);
    g.fillStyle(0x1c1917, 1);
    g.fillCircle(6, 11, 1.5);
    g.fillCircle(10, 11, 1.5);
  });

  makeTexture(scene, 'secret_compost', 24, 24, (g) => {
    g.clear();
    g.fillStyle(0x65a30d, 1);
    g.fillCircle(12, 12, 11);
    g.fillStyle(0x84cc16, 1);
    g.fillCircle(9, 9, 5);
    g.fillStyle(0x365314, 1);
    g.fillCircle(15, 14, 3);
    g.fillCircle(8, 15, 2);
    g.fillStyle(0x15803d, 1);
    g.fillRect(10, 2, 4, 6);
  });
}

// ── Particles ───────────────────────────────────────────────

function generateParticleTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'particle', 8, 8, (g) => {
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
  });

  makeTexture(scene, 'spark', 6, 6, (g) => {
    g.clear();
    g.fillStyle(0xfde047, 1);
    g.fillCircle(3, 3, 3);
  });

  makeTexture(scene, 'leaf', 12, 12, (g) => {
    g.clear();
    g.fillStyle(0x22c55e, 1);
    g.fillEllipse(6, 6, 10, 6);
  });
}

// ── Goal Flag ───────────────────────────────────────────────

function generateGoalTexture(scene: Phaser.Scene): void {
  makeTexture(scene, 'goal_pole', 8, 80, (g) => {
    g.clear();
    g.fillStyle(0xe2e8f0, 1);
    g.fillRect(1, 0, 6, 80);
  });

  makeTexture(scene, 'goal_flag', 44, 30, (g) => {
    g.clear();
    g.fillStyle(0xfacc15, 1);
    g.fillRect(0, 0, 44, 30);
    g.fillStyle(0x1c1917, 1);
    g.fillCircle(22, 15, 9);
    g.lineStyle(2, 0x1c1917, 1);
    g.beginPath();
    g.moveTo(15, 12);
    g.lineTo(19, 18);
    g.lineTo(22, 14);
    g.lineTo(25, 18);
    g.lineTo(29, 12);
    g.strokePath();
  });
}

// ── Trees / Decorations ─────────────────────────────────────

function generateTreeTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'tree', 50, 60, (g) => {
    g.clear();
    g.fillStyle(0x4a2e0a, 1);
    g.fillRect(23, 30, 4, 30);
    g.fillStyle(0x16a34a, 1);
    g.fillCircle(25, 20, 18);
    g.fillCircle(11, 25, 14);
    g.fillCircle(39, 25, 14);
    g.fillStyle(0x22c55e, 1);
    g.fillCircle(25, 16, 14);
  });

  makeTexture(scene, 'palm', 50, 60, (g) => {
    g.clear();
    g.fillStyle(0x78350f, 1);
    g.fillRect(23, 20, 6, 40);
    g.fillStyle(0x92400e, 1);
    g.fillRect(24, 20, 4, 40);
    g.fillStyle(0x15803d, 1);
    for (let a = 0; a < 5; a++) {
      const angle = (Math.PI / 4) * (a - 2) - Math.PI / 2;
      const ex = 27 + Math.cos(angle) * 16;
      const ey = 18 + Math.sin(angle) * 12;
      g.fillEllipse(ex, ey, 18, 7);
    }
  });

  makeTexture(scene, 'reed', 30, 50, (g) => {
    g.clear();
    g.fillStyle(0x15803d, 1);
    for (let i = -1; i <= 1; i++) {
      g.fillRect(14 + i * 6, 12, 3, 38);
    }
    g.fillStyle(0xca8a04, 1);
    g.fillEllipse(17, 12, 3, 7);
  });

  makeTexture(scene, 'mound', 50, 30, (g) => {
    g.clear();
    g.fillStyle(0x44403c, 1);
    g.fillEllipse(25, 30, 44, 24);
    g.fillStyle(0x65a30d, 1);
    g.fillCircle(20, 16, 5);
    g.fillCircle(30, 16, 4);
    g.fillCircle(25, 12, 4);
  });

  makeTexture(scene, 'fir', 50, 60, (g) => {
    g.clear();
    g.fillStyle(0x451a03, 1);
    g.fillRect(23, 30, 4, 30);
    g.fillStyle(0x15803d, 1);
    g.fillTriangle(25, 2, 12, 30, 38, 30);
    g.fillTriangle(25, 10, 14, 35, 36, 35);
    g.fillStyle(0x22c55e, 1);
    g.fillTriangle(25, 18, 16, 40, 34, 40);
  });

  makeTexture(scene, 'pine', 50, 60, (g) => {
    g.clear();
    g.fillStyle(0x78350f, 1);
    g.fillRect(23, 20, 6, 40);
    g.fillStyle(0x1e3a8a, 1);
    g.fillTriangle(25, 2, 8, 25, 42, 25);
    g.fillTriangle(25, 12, 12, 32, 38, 32);
    g.fillStyle(0x60a5fa, 1);
    g.fillTriangle(25, 20, 16, 38, 34, 38);
  });

  makeTexture(scene, 'antenna', 50, 60, (g) => {
    g.clear();
    g.fillStyle(0x334155, 1);
    g.fillRect(22, 20, 6, 40);
    g.fillStyle(0x475569, 1);
    g.fillRect(20, 15, 10, 8);
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(25, 8, 5);
    g.fillStyle(0xef4444, 1);
    g.fillCircle(25, 8, 2);
  });

  makeTexture(scene, 'coral', 50, 40, (g) => {
    g.clear();
    g.fillStyle(0xf43f5e, 1);
    g.fillCircle(18, 25, 8);
    g.fillCircle(32, 25, 7);
    g.fillStyle(0xfb923c, 1);
    g.fillCircle(25, 20, 9);
    g.fillStyle(0x22d3ee, 1);
    g.fillCircle(38, 30, 6);
    g.fillStyle(0x65a30d, 1);
    g.fillCircle(12, 30, 5);
  });

  makeTexture(scene, 'cloud', 80, 30, (g) => {
    g.clear();
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(20, 15, 15);
    g.fillCircle(40, 12, 18);
    g.fillCircle(60, 15, 14);
    g.fillCircle(40, 20, 20);
  });
}

export function getDecorationKey(theme: ThemeKey): string {
  switch (theme) {
    case 'park': return 'tree';
    case 'beach': return 'palm';
    case 'river': return 'reed';
    case 'landfill': return 'mound';
    case 'forest': return 'fir';
    case 'mountain': return 'pine';
    case 'city': return 'antenna';
    case 'ocean': return 'coral';
  }
}

function generateBoostTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'boost_magnet', 24, 24, (g) => {
    g.clear();
    g.fillStyle(0xa855f7, 0.3);
    g.fillCircle(12, 12, 10);
    g.fillStyle(0xa855f7, 1);
    g.fillCircle(12, 12, 6);
    g.fillStyle(0xd8b4fe, 1);
    g.fillCircle(10, 10, 2);
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(12, 12, 2);
  });

  makeTexture(scene, 'boost_shield', 24, 24, (g) => {
    g.clear();
    g.fillStyle(0x06b6d4, 0.4);
    g.fillCircle(12, 12, 10);
    g.fillStyle(0x06b6d4, 1);
    g.fillCircle(12, 12, 7);
    g.fillStyle(0x67e8f9, 1);
    g.fillCircle(10, 10, 3);
  });

  makeTexture(scene, 'boost_jump', 24, 24, (g) => {
    g.clear();
    g.fillStyle(0xf97316, 0.4);
    g.fillCircle(12, 12, 10);
    g.fillStyle(0xf97316, 1);
    g.fillCircle(12, 12, 7);
    g.fillStyle(0xfdba74, 1);
    g.fillTriangle(12, 4, 6, 14, 18, 14);
  });
}

// ── Heart (Health Pickup) ────────────────────────────────────

function generateHeartTexture(scene: Phaser.Scene): void {
  makeTexture(scene, 'heart', 28, 26, (g) => {
    g.clear();
    // Outer glow
    g.fillStyle(0xef4444, 0.3);
    g.fillCircle(9, 10, 9);
    g.fillCircle(19, 10, 9);
    g.fillTriangle(2, 13, 26, 13, 14, 25);
    // Main heart body
    g.fillStyle(0xef4444, 1);
    g.fillCircle(9, 9, 7);
    g.fillCircle(19, 9, 7);
    g.fillTriangle(3, 11, 25, 11, 14, 24);
    // Highlight
    g.fillStyle(0xfca5a5, 1);
    g.fillCircle(7, 6, 3);
    g.fillCircle(16, 6, 2);
  });
}

// ── Hidden block + eco power-ups ─────────────────────────────

/**
 * The "?" crate and its spent counterpart. Sized to MYSTERY_BLOCK_SIZE so the
 * static body can be built straight from the texture without scaling.
 */
function generateMysteryBlockTextures(scene: Phaser.Scene): void {
  const S = 40;

  makeTexture(scene, 'mystery_block', S, S, (g) => {
    g.clear();
    // Crate body — recycled-cardboard brown with a green eco frame.
    g.fillStyle(0x14532d, 1);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0xca8a04, 1);
    g.fillRect(3, 3, S - 6, S - 6);
    g.fillStyle(0xfacc15, 1);
    g.fillRect(3, 3, S - 6, S - 10);
    g.fillStyle(0xfef08a, 1);
    g.fillRect(3, 3, S - 6, 4);

    // Corner rivets
    g.fillStyle(0x14532d, 1);
    for (const [rx, ry] of [[6, 6], [S - 10, 6], [6, S - 10], [S - 10, S - 10]]) {
      g.fillRect(rx, ry, 4, 4);
    }

    // Question mark
    g.fillStyle(0x14532d, 1);
    g.fillRect(13, 9, 14, 5);
    g.fillRect(23, 9, 5, 11);
    g.fillRect(16, 17, 12, 5);
    g.fillRect(17, 20, 5, 8);
    g.fillRect(17, 31, 5, 5);
    g.fillStyle(0x22c55e, 1);
    g.fillRect(14, 10, 12, 3);
    g.fillRect(18, 32, 3, 3);
  });

  makeTexture(scene, 'mystery_block_used', S, S, (g) => {
    g.clear();
    g.fillStyle(0x1c1917, 1);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x78716c, 1);
    g.fillRect(3, 3, S - 6, S - 6);
    g.fillStyle(0x8f8a85, 1);
    g.fillRect(3, 3, S - 6, S - 12);
    // Sunken centre so a spent block reads as empty at a glance.
    g.fillStyle(0x57534e, 1);
    g.fillRect(9, 9, S - 18, S - 18);
    g.fillStyle(0x44403c, 1);
    g.fillRect(9, 9, S - 18, 3);
  });
}

/** Eco Badge (glowing recycle emblem) and Rompi Eco Hero (hi-vis eco vest). */
function generatePowerUpTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'powerup_ecoBadge', 28, 28, (g) => {
    g.clear();
    // Glow halo
    g.fillStyle(0x4ade80, 0.28);
    g.fillCircle(14, 14, 13.5);
    g.fillStyle(0x86efac, 0.45);
    g.fillCircle(14, 14, 11.5);
    // Badge disc
    g.fillStyle(0x15803d, 1);
    g.fillCircle(14, 14, 10);
    g.fillStyle(0x22c55e, 1);
    g.fillCircle(14, 13, 8.5);
    // Recycle triangle (outer ring minus inner cut-out)
    g.fillStyle(0xecfdf5, 1);
    g.fillTriangle(14, 5, 22.5, 19.5, 5.5, 19.5);
    g.fillStyle(0x22c55e, 1);
    g.fillTriangle(14, 10.5, 18.5, 18, 9.5, 18);
    // Arrow heads that make the loop read as "recycle"
    g.fillStyle(0xecfdf5, 1);
    g.fillTriangle(14, 2.5, 10.5, 7, 17.5, 7);
    g.fillTriangle(4, 21.5, 8.5, 17.5, 9, 23.5);
    g.fillTriangle(24, 21.5, 19.5, 17.5, 19, 23.5);
    // Specular highlight
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(10, 8, 1.8);
  });

  makeTexture(scene, 'powerup_ecoVest', 28, 28, (g) => {
    g.clear();
    // Glow halo
    g.fillStyle(0x4ade80, 0.25);
    g.fillCircle(14, 14, 13.5);
    // Vest body
    g.fillStyle(0x14532d, 1);
    g.fillRect(5, 6, 18, 18);
    g.fillStyle(0x16a34a, 1);
    g.fillRect(6, 7, 16, 16);
    // Shoulders
    g.fillStyle(0x15803d, 1);
    g.fillRect(4, 4, 7, 5);
    g.fillRect(17, 4, 7, 5);
    // Front opening
    g.fillStyle(0x052e16, 1);
    g.fillRect(13, 6, 2, 18);
    // Reflective stripes
    g.fillStyle(0xbbf7d0, 1);
    g.fillRect(6, 12, 16, 3);
    g.fillStyle(0xecfdf5, 0.85);
    g.fillRect(6, 18, 16, 2);
    // Leaf emblem on the chest
    g.fillStyle(0x86efac, 1);
    g.fillEllipse(9, 9, 7, 4);
    g.fillStyle(0x14532d, 1);
    g.fillRect(6, 9, 6, 1);
  });
}

// ── Forest obstacles + Eco Tool ──────────────────────────────

/**
 * A mystery block dressed as a mossy stump or a boulder, so it reads as scenery
 * until the player thinks to jump underneath it. Same 40x40 body as the crate.
 */
function generateDisguisedBlockTextures(scene: Phaser.Scene): void {
  const S = 40;

  makeTexture(scene, 'mystery_stump', S, S, (g) => {
    g.clear();
    // Trunk
    g.fillStyle(0x422006, 1);
    g.fillRect(4, 6, S - 8, S - 6);
    g.fillStyle(0x713f12, 1);
    g.fillRect(6, 8, S - 12, S - 8);
    // Bark grooves
    g.fillStyle(0x422006, 1);
    g.fillRect(11, 12, 2, S - 14);
    g.fillRect(20, 10, 2, S - 12);
    g.fillRect(28, 14, 2, S - 16);
    // Cut top with growth rings
    g.fillStyle(0xa16207, 1);
    g.fillEllipse(S / 2, 8, S - 8, 11);
    g.fillStyle(0xca8a04, 1);
    g.fillEllipse(S / 2, 8, S - 16, 7);
    g.fillStyle(0xa16207, 1);
    g.fillEllipse(S / 2, 8, 8, 3);
    // Moss, the only hint that this stump is special
    g.fillStyle(0x4d7c0f, 1);
    g.fillCircle(9, 12, 4);
    g.fillCircle(31, 14, 3);
    g.fillStyle(0x65a30d, 1);
    g.fillCircle(8, 11, 2);
  });

  makeTexture(scene, 'mystery_stump_used', S, S, (g) => {
    g.clear();
    g.fillStyle(0x292524, 1);
    g.fillRect(4, 6, S - 8, S - 6);
    g.fillStyle(0x44403c, 1);
    g.fillRect(6, 8, S - 12, S - 8);
    // Hollowed-out top
    g.fillStyle(0x1c1917, 1);
    g.fillEllipse(S / 2, 9, S - 10, 12);
    g.fillStyle(0x57534e, 1);
    g.fillEllipse(S / 2, 7, S - 10, 8);
    g.fillStyle(0x1c1917, 1);
    g.fillEllipse(S / 2, 8, S - 18, 5);
  });

  makeTexture(scene, 'mystery_boulder', S, S, (g) => {
    g.clear();
    g.fillStyle(0x292524, 1);
    g.fillCircle(S / 2, S / 2 + 2, 19);
    g.fillStyle(0x57534e, 1);
    g.fillCircle(S / 2, S / 2, 18);
    g.fillStyle(0x78716c, 1);
    g.fillCircle(S / 2 - 2, S / 2 - 3, 14);
    g.fillStyle(0xa8a29e, 1);
    g.fillCircle(S / 2 - 6, S / 2 - 7, 5);
    // Lichen speckles
    g.fillStyle(0x4d7c0f, 1);
    g.fillCircle(28, 26, 3);
    g.fillCircle(13, 29, 2);
  });

  makeTexture(scene, 'mystery_boulder_used', S, S, (g) => {
    g.clear();
    g.fillStyle(0x1c1917, 1);
    g.fillCircle(S / 2, S / 2 + 2, 19);
    g.fillStyle(0x44403c, 1);
    g.fillCircle(S / 2, S / 2, 18);
    // Split open down the middle
    g.fillStyle(0x1c1917, 1);
    g.fillRect(S / 2 - 3, S / 2 - 16, 6, 32);
    g.fillStyle(0x57534e, 1);
    g.fillCircle(S / 2 - 8, S / 2 - 5, 7);
    g.fillCircle(S / 2 + 8, S / 2 - 5, 7);
  });
}

/** Snake head — the only part of a hanging snake that can hurt the player. */
function generateSnakeTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'snake_head', 26, 22, (g) => {
    g.clear();
    // Head
    g.fillStyle(0x166534, 1);
    g.fillEllipse(13, 11, 24, 18);
    g.fillStyle(0x22c55e, 1);
    g.fillEllipse(13, 9, 20, 13);
    // Scale pattern
    g.fillStyle(0x15803d, 1);
    g.fillEllipse(9, 8, 5, 4);
    g.fillEllipse(17, 8, 5, 4);
    // Eyes
    g.fillStyle(0xfef08a, 1);
    g.fillCircle(8, 9, 3);
    g.fillCircle(18, 9, 3);
    g.fillStyle(0x1c1917, 1);
    g.fillRect(7, 7, 2, 5);
    g.fillRect(17, 7, 2, 5);
    // Forked tongue
    g.fillStyle(0xef4444, 1);
    g.fillRect(12, 18, 2, 4);
    g.fillRect(10, 21, 2, 1);
    g.fillRect(14, 21, 2, 1);
  });
}

/** The Recycle Vacuum pickup: a green nozzle with a recycling intake. */
function generateEcoToolTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'powerup_recycleVacuum', 30, 30, (g) => {
    g.clear();
    // Halo
    g.fillStyle(0x38bdf8, 0.28);
    g.fillCircle(15, 15, 14.5);
    // Canister
    g.fillStyle(0x0c4a6e, 1);
    g.fillRect(8, 10, 15, 16);
    g.fillStyle(0x0ea5e9, 1);
    g.fillRect(9, 11, 13, 14);
    g.fillStyle(0x7dd3fc, 1);
    g.fillRect(9, 11, 13, 4);
    // Intake funnel pointing up-left
    g.fillStyle(0x155e75, 1);
    g.fillTriangle(9, 12, 1, 3, 8, 2);
    g.fillStyle(0x22d3ee, 1);
    g.fillTriangle(9, 11, 3, 4, 8, 4);
    // Recycling green core
    g.fillStyle(0x16a34a, 1);
    g.fillCircle(15, 20, 5);
    g.fillStyle(0x86efac, 1);
    g.fillTriangle(15, 16, 19, 23, 11, 23);
    g.fillStyle(0x16a34a, 1);
    g.fillTriangle(15, 19, 17, 22, 13, 22);
    // Highlight
    g.fillStyle(0xffffff, 0.75);
    g.fillCircle(11, 13, 1.6);
  });
}

// ── Mountain hazards + Raja Polusi ───────────────────────────

function generateMountainTextures(scene: Phaser.Scene): void {
  // Burung Pemakan Sampah — a scruffy scavenging bird, two wing poses.
  const drawBird = (g: G, wing: 'up' | 'down', angry: boolean) => {
    g.clear();
    const cx = 24;
    const cy = 18;
    const wingY = wing === 'up' ? cy - 11 : cy + 3;

    // Wings
    g.fillStyle(0x44403c, 1);
    g.fillEllipse(cx - 13, wingY, 24, 11);
    g.fillEllipse(cx + 13, wingY, 24, 11);
    g.fillStyle(0x57534e, 1);
    g.fillEllipse(cx - 14, wingY - 1, 16, 6);
    g.fillEllipse(cx + 14, wingY - 1, 16, 6);

    // Body + tail
    g.fillStyle(0x292524, 1);
    g.fillEllipse(cx, cy + 2, 26, 17);
    g.fillStyle(0x44403c, 1);
    g.fillEllipse(cx, cy, 20, 12);
    g.fillStyle(0x1c1917, 1);
    g.fillTriangle(cx + 11, cy, cx + 22, cy - 5, cx + 22, cy + 6);

    // Head + beak
    g.fillStyle(0x292524, 1);
    g.fillCircle(cx - 12, cy - 4, 8);
    g.fillStyle(0xf59e0b, 1);
    g.fillTriangle(cx - 19, cy - 5, cx - 30, cy - 2, cx - 19, cy + 2);
    // Eye
    g.fillStyle(0xfef3c7, 1);
    g.fillCircle(cx - 14, cy - 6, 3);
    g.fillStyle(angry ? 0xdc2626 : 0x1c1917, 1);
    g.fillCircle(cx - 14, cy - 6, 1.6);
  };

  makeTexture(scene, 'bird_up', 48, 36, (g) => drawBird(g, 'up', false));
  makeTexture(scene, 'bird_down', 48, 36, (g) => drawBird(g, 'down', false));
  makeTexture(scene, 'bird_angry', 48, 36, (g) => drawBird(g, 'up', true));

  // Nest the bird returns to.
  makeTexture(scene, 'bird_nest', 44, 22, (g) => {
    g.clear();
    g.fillStyle(0x422006, 1);
    g.fillEllipse(22, 14, 42, 16);
    g.fillStyle(0x713f12, 1);
    g.fillEllipse(22, 11, 36, 12);
    g.fillStyle(0x292524, 1);
    g.fillEllipse(22, 9, 24, 7);
    // Twigs
    g.fillStyle(0x57534e, 1);
    g.fillRect(3, 12, 12, 2);
    g.fillRect(30, 15, 12, 2);
  });

  // Batu longsor — a rough boulder, drawn round so rotation reads as rolling.
  makeTexture(scene, 'rolling_boulder', 52, 52, (g) => {
    g.clear();
    g.fillStyle(0x1c1917, 1);
    g.fillCircle(26, 26, 25);
    g.fillStyle(0x57534e, 1);
    g.fillCircle(26, 26, 23);
    g.fillStyle(0x78716c, 1);
    g.fillCircle(21, 20, 15);
    g.fillStyle(0xa8a29e, 1);
    g.fillCircle(18, 16, 6);
    // Chips, so the spin is visible.
    g.fillStyle(0x292524, 1);
    g.fillCircle(35, 32, 5);
    g.fillCircle(16, 36, 4);
    g.fillCircle(38, 17, 3);
  });

  // Pollution ball the storm cloud lobs.
  makeTexture(scene, 'pollution_ball', 26, 26, (g) => {
    g.clear();
    g.fillStyle(0x1c1917, 0.4);
    g.fillCircle(13, 13, 12);
    g.fillStyle(0x44403c, 1);
    g.fillCircle(13, 13, 9);
    g.fillStyle(0x6b21a8, 1);
    g.fillCircle(11, 11, 6);
    g.fillStyle(0xa855f7, 1);
    g.fillCircle(10, 10, 3);
  });

  // Eco Energy Orb the player gathers and fires back.
  makeTexture(scene, 'eco_orb', 28, 28, (g) => {
    g.clear();
    g.fillStyle(0x22c55e, 0.3);
    g.fillCircle(14, 14, 13);
    g.fillStyle(0x16a34a, 1);
    g.fillCircle(14, 14, 10);
    g.fillStyle(0x4ade80, 1);
    g.fillCircle(14, 14, 7);
    g.fillStyle(0xecfdf5, 1);
    g.fillCircle(14, 14, 3.5);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(10, 10, 2);
  });

  // The bolt the Eco Blaster fires.
  makeTexture(scene, 'eco_shot', 30, 16, (g) => {
    g.clear();
    g.fillStyle(0x86efac, 0.5);
    g.fillEllipse(15, 8, 30, 15);
    g.fillStyle(0x22c55e, 1);
    g.fillEllipse(15, 8, 24, 10);
    g.fillStyle(0xecfdf5, 1);
    g.fillEllipse(17, 8, 13, 5);
  });
}
