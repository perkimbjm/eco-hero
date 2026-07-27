import type Phaser from 'phaser';
import type { PlatformKind } from './types';
import type { THEME_COLORS } from './constants';

type ThemePalette = (typeof THEME_COLORS)['park'];
type G = Phaser.GameObjects.Graphics;

const hex = (css: string): number => parseInt(css.slice(1), 16);

/**
 * Draws a platform's artwork with its top-left corner at the Graphics object's
 * own origin, so callers position the Graphics and never repeat the maths.
 *
 * Only the look changes between kinds — every platform collides as the plain
 * `width x height` rectangle it was authored as, so a mossy log is exactly as
 * predictable to land on as a brick.
 */
export function drawPlatformArt(
  g: G,
  kind: PlatformKind,
  width: number,
  height: number,
  theme: ThemePalette
): void {
  g.clear();
  switch (kind) {
    case 'log':
      drawLog(g, width, height);
      break;
    case 'boulder':
      drawBoulder(g, width, height);
      break;
    case 'branch':
      drawBranch(g, width, height);
      break;
    case 'stump':
      drawStump(g, width, height);
      break;
    default:
      drawBrick(g, width, height, theme);
  }
}

/** The original themed slab, kept for every non-forest level. */
function drawBrick(g: G, width: number, height: number, theme: ThemePalette): void {
  g.fillStyle(hex(theme.platformDark), 1);
  g.fillRect(0, 4, width, height);
  g.fillStyle(hex(theme.platform), 1);
  g.fillRect(0, 0, width, height - 6);
  g.fillStyle(0xffffff, 0.15);
  g.fillRect(0, 0, width, 4);
}

/** A felled trunk lying on its side: bark, grain, and a cut end with rings. */
function drawLog(g: G, width: number, height: number): void {
  const capW = Math.min(16, width * 0.22);

  g.fillStyle(0x3f2109, 1);
  g.fillRoundedRect(0, 3, width, height, height / 2.6);
  g.fillStyle(0x713f12, 1);
  g.fillRoundedRect(0, 0, width, height - 4, height / 2.6);
  g.fillStyle(0x8a5522, 1);
  g.fillRoundedRect(2, 1, width - 4, (height - 4) * 0.45, height / 4);

  // Bark grain, thinning towards the ends so it reads as a cylinder.
  g.fillStyle(0x4a2a0c, 0.75);
  for (let x = capW + 6; x < width - capW - 4; x += 22) {
    g.fillRect(x, height * 0.42, 12, 2);
    g.fillRect(x + 7, height * 0.62, 8, 2);
  }

  // Sawn end with growth rings.
  g.fillStyle(0xa16207, 1);
  g.fillEllipse(capW / 2 + 1, (height - 4) / 2, capW, height - 6);
  g.fillStyle(0xca8a04, 1);
  g.fillEllipse(capW / 2 + 1, (height - 4) / 2, capW * 0.62, (height - 6) * 0.62);
  g.fillStyle(0xa16207, 1);
  g.fillEllipse(capW / 2 + 1, (height - 4) / 2, capW * 0.24, (height - 6) * 0.24);

  // Moss on the top edge — this is a forest, nothing stays bare.
  g.fillStyle(0x4d7c0f, 1);
  for (let x = capW + 4; x < width - 8; x += 34) {
    g.fillEllipse(x, 2, 20, 6);
  }
}

/** A weathered boulder, wider than it is tall, with a flat standing surface. */
function drawBoulder(g: G, width: number, height: number): void {
  g.fillStyle(0x292524, 1);
  g.fillRoundedRect(0, 4, width, height, 10);
  g.fillStyle(0x57534e, 1);
  g.fillRoundedRect(0, 0, width, height - 3, 10);
  // Lit top face
  g.fillStyle(0x78716c, 1);
  g.fillRoundedRect(3, 0, width - 6, Math.max(6, height * 0.42), 8);
  g.fillStyle(0xa8a29e, 1);
  g.fillRoundedRect(6, 1, width * 0.35, Math.max(4, height * 0.2), 6);
  // Cracks
  g.fillStyle(0x1c1917, 0.55);
  g.fillRect(width * 0.42, height * 0.45, 2, height * 0.4);
  g.fillRect(width * 0.7, height * 0.5, 2, height * 0.32);
  // Lichen
  g.fillStyle(0x4d7c0f, 0.9);
  g.fillCircle(width * 0.22, 3, 5);
  g.fillCircle(width * 0.78, 4, 4);
}

/** A slim living branch with leaves sprouting along it. */
function drawBranch(g: G, width: number, height: number): void {
  const barkH = Math.max(8, height * 0.5);
  const barkY = height - barkH - 2;

  // Leaves first, so the branch sits in front of them.
  g.fillStyle(0x15803d, 1);
  for (let x = 8; x < width - 6; x += 26) {
    g.fillEllipse(x, barkY - 1, 22, 12);
  }
  g.fillStyle(0x22c55e, 1);
  for (let x = 18; x < width - 6; x += 26) {
    g.fillEllipse(x, barkY - 3, 16, 9);
  }

  g.fillStyle(0x3f2109, 1);
  g.fillRoundedRect(0, barkY + 3, width, barkH, barkH / 2);
  g.fillStyle(0x78350f, 1);
  g.fillRoundedRect(0, barkY, width, barkH, barkH / 2);
  g.fillStyle(0x9a5b2a, 1);
  g.fillRoundedRect(2, barkY + 1, width - 4, barkH * 0.4, barkH / 3);

  // A couple of twig stubs to break the straight line.
  g.fillStyle(0x78350f, 1);
  g.fillRect(width * 0.3, barkY - 6, 3, 8);
  g.fillRect(width * 0.68, barkY - 5, 3, 7);
}

/** A wide cut stump — the most solid-looking footing in the forest set. */
function drawStump(g: G, width: number, height: number): void {
  const topH = Math.max(8, height * 0.42);

  g.fillStyle(0x3f2109, 1);
  g.fillRect(2, topH / 2, width - 4, height);
  g.fillStyle(0x713f12, 1);
  g.fillRect(4, topH / 2, width - 8, height - 2);
  // Bark grooves
  g.fillStyle(0x4a2a0c, 0.8);
  for (let x = 10; x < width - 8; x += 18) {
    g.fillRect(x, topH * 0.8, 2, height - topH * 0.8 - 2);
  }
  // Sawn top with rings
  g.fillStyle(0xa16207, 1);
  g.fillEllipse(width / 2, topH / 2, width - 6, topH);
  g.fillStyle(0xca8a04, 1);
  g.fillEllipse(width / 2, topH / 2, (width - 6) * 0.66, topH * 0.62);
  g.fillStyle(0xa16207, 1);
  g.fillEllipse(width / 2, topH / 2, (width - 6) * 0.3, topH * 0.28);
  // Moss skirt
  g.fillStyle(0x4d7c0f, 1);
  g.fillEllipse(9, topH * 0.75, 14, 7);
  g.fillEllipse(width - 11, topH * 0.85, 12, 6);
}
