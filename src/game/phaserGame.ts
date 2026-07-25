import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';
import type { GameCallbacks, GameStats } from './types';

export interface PhaserGameConfig {
  levelIndex: number;
  callbacks: GameCallbacks;
  carriedStats?: Partial<GameStats>;
  parent: HTMLElement;
  skinId?: string;
}

/** Most zoomed-in view allowed; below this the world starts to feel cropped. */
const MIN_VIEW_HEIGHT = 300;
/** Narrowest slice of the level we will show (portrait play). */
const MIN_VIEW_WIDTH = 300;
/** Extra magnification on short screens (phone landscape / fullscreen). */
const SMALL_SCREEN_ZOOM = 1.12;
/** Magnification for portrait, where width is the scarce dimension. */
const PORTRAIT_ZOOM = 1.1;

/**
 * Picks the design resolution so the FIT scaler always fills the element.
 *
 * The design aspect ratio must match the element's, otherwise Phaser letter-
 * boxes. Phones in landscape are far wider than the authored 800x480, so
 * keeping the full 480px world height meant squeezing ~1200 design pixels into
 * ~836 physical ones — the whole game rendered at 0.7x and looked tiny and far
 * away. On short screens we therefore show a slightly shorter slice of the
 * world, which renders it larger than 1:1. The camera pans vertically to keep
 * the action framed, so nothing becomes unreachable.
 */
function computeGameSize(parent: HTMLElement): { width: number; height: number } {
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  if (w <= 0 || h <= 0) return { width: GAME_WIDTH, height: GAME_HEIGHT };

  // Portrait: width is the scarce dimension, so drive the size from it. The
  // scale is derived from the width alone, which guarantees FIT is width-bound
  // and the canvas always spans the full width of the screen.
  if (h > w) {
    const width = Phaser.Math.Clamp(Math.round(w / PORTRAIT_ZOOM), MIN_VIEW_WIDTH, GAME_WIDTH);
    const scale = w / width;
    const height = Phaser.Math.Clamp(Math.round(h / scale), MIN_VIEW_HEIGHT, GAME_HEIGHT);
    return { width, height };
  }

  const aspect = w / h;
  const zoom = h < GAME_HEIGHT ? SMALL_SCREEN_ZOOM : 1;
  const height = Phaser.Math.Clamp(Math.round(h / zoom), MIN_VIEW_HEIGHT, GAME_HEIGHT);
  // Cap only against absurd ultra-wide values; never force a width that would
  // break the aspect match and reintroduce letterboxing.
  const width = Phaser.Math.Clamp(Math.round(height * aspect), 480, 1400);
  return { width, height };
}

export function createGame(config: PhaserGameConfig): Phaser.Game {
  const size = computeGameSize(config.parent);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: config.parent,
    width: size.width,
    height: size.height,
    backgroundColor: '#87ceeb',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      // Horizontal-only centering: in landscape the canvas fills its parent so
      // this is a no-op, while in portrait the game sits at the top and the
      // leftover height collects at the bottom, under the touch controls.
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    },
    scene: [BootScene, GameScene],
    render: {
      pixelArt: false,
      antialias: true,
    },
    input: {
      activePointers: 3,
    },
    // All audio is synthesised in sound.ts on its own AudioContext. Letting
    // Phaser build a second one means destroy() closes it while an unlock
    // handler is still pending -> "Cannot resume a closed AudioContext".
    audio: {
      noAudio: true,
    },
    callbacks: {
      postBoot: (g) => {
        g.scene.start('BootScene', {
          skinId: config.skinId,
          gameData: {
            levelIndex: config.levelIndex,
            callbacks: config.callbacks,
            carriedStats: config.carriedStats,
            skinId: config.skinId,
          },
        });
      },
    },
  });

  return game;
}

export function startLevel(
  game: Phaser.Game,
  levelIndex: number,
  callbacks: GameCallbacks,
  carriedStats?: Partial<GameStats>
): void {
  const scene = game.scene.getScene('GameScene') as GameScene;
  if (scene) {
    game.scene.stop('GameScene');
    game.scene.start('GameScene', {
      levelIndex,
      callbacks,
      carriedStats,
    });
  }
}

export function setMobileInput(
  game: Phaser.Game,
  key: 'left' | 'right' | 'jump',
  pressed: boolean
): void {
  const scene = game.scene.getScene('GameScene') as GameScene | null;
  if (scene && scene.scene.isActive()) {
    scene.setMobileInput(key, pressed);
  }
}

/**
 * Re-fits the game after the container changes size (orientation flip,
 * fullscreen toggle). Recomputes the design width for the new aspect ratio and
 * refreshes the FIT scaler so the canvas never sticks as a blank/black frame.
 */
export function resizeGame(game: Phaser.Game, parent: HTMLElement): void {
  if (!game.isBooted || !game.scale) return;
  const { width, height } = computeGameSize(parent);
  if (width !== game.scale.gameSize.width || height !== game.scale.gameSize.height) {
    // setGameSize updates gameSize/baseSize and emits RESIZE, which the
    // renderer uses to resize the drawing buffer.
    game.scale.setGameSize(width, height);
  }
  game.scale.refresh();
}

/** Fires the equipped character's Eco Power skill (mobile skill button). */
export function triggerSkill(game: Phaser.Game): void {
  const scene = game.scene.getScene('GameScene') as GameScene | null;
  if (scene && scene.scene.isActive()) {
    scene.activateSkill();
  }
}
