import Phaser from 'phaser';
import { generateAllTextures } from '../textures';
import type { GameCallbacks, GameStats } from '../types';

interface BootData {
  skinId?: string;
  gameData: {
    levelIndex: number;
    callbacks: GameCallbacks;
    carriedStats?: Partial<GameStats>;
    skinId?: string;
  };
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(data: BootData): void {
    generateAllTextures(this, data?.skinId ?? 'default');
    this.scene.start('GameScene', data?.gameData ?? {
      levelIndex: 0
    });
  }
}
