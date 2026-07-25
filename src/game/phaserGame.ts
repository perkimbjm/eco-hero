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

export function createGame(config: PhaserGameConfig): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: config.parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
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
      autoCenter: Phaser.Scale.CENTER_BOTH,
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

/** Fires the equipped character's Eco Power skill (mobile skill button). */
export function triggerSkill(game: Phaser.Game): void {
  const scene = game.scene.getScene('GameScene') as GameScene | null;
  if (scene && scene.scene.isActive()) {
    scene.activateSkill();
  }
}
