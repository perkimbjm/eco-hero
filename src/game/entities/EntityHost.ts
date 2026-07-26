import type Phaser from 'phaser';
import type { SkinTrait } from '../progression';

export interface AwardOptions {
  score?: number;
  xp?: number;
  coins?: number;
  /** Counts towards the "musuh udara" tally shown on the level complete screen. */
  flyingKill?: boolean;
  /** Counts towards the global trash tally (not the per-level collection target). */
  trashPickup?: boolean;
}

/**
 * The slice of GameScene that self-contained entity modules are allowed to touch.
 * Keeping it narrow stops the hazard/boss code from reaching into scene internals.
 */
export interface EntityHost {
  readonly player: Phaser.Physics.Arcade.Sprite;
  /** Named `getScene` because `Phaser.Scene.scene` is already the ScenePlugin. */
  getScene(): Phaser.Scene;
  getPlatforms(): Phaser.Physics.Arcade.StaticGroup;
  isPlaying(): boolean;
  isInvincible(): boolean;
  /** True when the equipped guardian's passive advantage matches `trait`. */
  hasTrait(trait: SkinTrait): boolean;
  damagePlayer(sourceX: number, knockUpVelocity?: number): void;
  bouncePlayer(velocity?: number): void;
  /** Drops a floating heart into the world (used for between-phase top-ups). */
  spawnHealthPickup(x: number, y: number): void;
  burst(x: number, y: number, color: number, count?: number): void;
  floatScore(x: number, y: number, text: string, color: string): void;
  banner(text: string, color?: string): void;
  award(options: AwardOptions): void;
}
