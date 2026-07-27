import Phaser from 'phaser';
import { FOG_FADE_MS } from '../constants';
import type { FogDef } from '../types';
import * as sound from '../sound';

/**
 * Summit fog: a bank that rolls across part of the screen for a few seconds,
 * then clears.
 *
 * It covers a horizontal band rather than the whole viewport, and always leaves
 * a readable strip, so the player can still see where they are standing — what
 * they lose is the view of what is coming, which is exactly the "remember the
 * platforms" pressure the level is built around. It is screen-fixed, so it
 * hides the level without ever hiding the hero's own footing entirely.
 */
export class FogBank {
  private readonly scene: Phaser.Scene;
  private readonly def: FogDef;
  private readonly gfx: Phaser.GameObjects.Graphics;

  private nextAt: number;
  private clearAt = 0;
  private rolling = false;
  private drift = 0;

  constructor(scene: Phaser.Scene, def: FogDef) {
    this.scene = scene;
    this.def = def;
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(0);
    this.gfx.setDepth(120);
    this.nextAt = scene.time.now + def.intervalMs;

    scene.events.once('shutdown', () => this.gfx.destroy());
  }

  get active(): boolean {
    return this.rolling;
  }

  update(delta: number): void {
    const now = this.scene.time.now;

    if (!this.rolling && now >= this.nextAt) {
      this.rolling = true;
      this.clearAt = now + this.def.durationMs;
      sound.playFogRoll();
    } else if (this.rolling && now >= this.clearAt + FOG_FADE_MS) {
      this.rolling = false;
      this.nextAt = now + this.def.intervalMs;
      this.gfx.clear();
      return;
    }

    if (!this.rolling) return;

    this.drift += delta * 0.03;
    // Ease in at the start and out at the end so the bank never pops.
    const fadeIn = Phaser.Math.Clamp((now - (this.clearAt - this.def.durationMs)) / FOG_FADE_MS, 0, 1);
    const fadeOut = Phaser.Math.Clamp((this.clearAt + FOG_FADE_MS - now) / FOG_FADE_MS, 0, 1);
    this.draw(Math.min(fadeIn, fadeOut));
  }

  private draw(strength: number): void {
    const { width, height } = this.scene.scale;
    const bandH = height * this.def.coverage;
    const top = height * 0.16;

    const g = this.gfx;
    g.clear();
    g.fillStyle(0xe2e8f0, 0.62 * strength);
    g.fillRect(0, top, width, bandH);
    // Soft edges above and below the solid band.
    g.fillStyle(0xe2e8f0, 0.3 * strength);
    g.fillRect(0, top - 26, width, 26);
    g.fillRect(0, top + bandH, width, 26);

    // Slow rolling billows, so the bank looks like weather rather than a panel.
    g.fillStyle(0xf8fafc, 0.34 * strength);
    for (let i = 0; i < 7; i++) {
      const x = ((this.drift + i * 190) % (width + 260)) - 130;
      g.fillEllipse(x, top + bandH * 0.32, 230, bandH * 0.72);
      g.fillEllipse(x + 95, top + bandH * 0.68, 190, bandH * 0.6);
    }
  }
}
