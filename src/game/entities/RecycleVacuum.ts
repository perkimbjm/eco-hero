import Phaser from 'phaser';
import {
  VACUUM_DURATION_MS,
  VACUUM_PARTICLE_INTERVAL_MS,
  VACUUM_PULL_SPEED,
  VACUUM_RADIUS,
  VACUUM_SFX_INTERVAL_MS,
  VACUUM_STUN_MS,
  VACUUM_SWALLOW_DISTANCE,
} from '../constants';
import * as sound from '../sound';

/** Anything the vacuum can daze: small flyers and giant flies alike. */
export interface StunnableFlyer {
  sprite: Phaser.Physics.Arcade.Sprite;
  /** Called once when the flyer is caught in the suction. */
  stun: (untilMs: number) => void;
  isStunned: () => boolean;
  isAlive: () => boolean;
}

export interface VacuumContext {
  /** Pickups still in play; the vacuum drags whatever is in range. */
  collectibles: () => Phaser.Physics.Arcade.Sprite[];
  /** Collects a pickup that reached the nozzle, through the normal scoring path. */
  swallow: (sprite: Phaser.Physics.Arcade.Sprite) => void;
  /** Every flyer that could be dazed this frame. */
  flyers: () => StunnableFlyer[];
  onExpired: () => void;
}

/**
 * Recycle Vacuum — the Level 5 Eco Tool.
 *
 * For twelve seconds it drags every loose piece of trash inside VACUUM_RADIUS
 * towards the hero and files it away, and puffs air at small flyers so they
 * drift dazed for a few seconds. Nothing is destroyed and nothing is hit: the
 * flyers wake up unharmed, which keeps the fantasy about cleaning up rather
 * than fighting.
 */
export class RecycleVacuum {
  private readonly scene: Phaser.Scene;
  private readonly player: Phaser.Physics.Arcade.Sprite;
  private readonly ctx: VacuumContext;

  private readonly cone: Phaser.GameObjects.Graphics;
  private readonly nozzle: Phaser.GameObjects.Image;

  private endsAt = 0;
  private nextSfxAt = 0;
  private nextParticleAt = 0;
  private spin = 0;
  private done = false;

  constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite, ctx: VacuumContext) {
    this.scene = scene;
    this.player = player;
    this.ctx = ctx;

    this.endsAt = scene.time.now + VACUUM_DURATION_MS;

    this.cone = scene.add.graphics();
    this.cone.setDepth(11);

    this.nozzle = scene.add.image(player.x, player.y, 'powerup_recycleVacuum');
    this.nozzle.setDepth(31);
    this.nozzle.setScale(0.85);

    sound.playVacuumStart();
    scene.tweens.add({
      targets: this.nozzle,
      scale: { from: 0.85, to: 1 },
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  get remainingMs(): number {
    return Math.max(0, this.endsAt - this.scene.time.now);
  }

  update(delta: number): void {
    if (this.done) return;

    const now = this.scene.time.now;
    if (now >= this.endsAt) {
      this.stop();
      return;
    }

    this.spin += delta * 0.012;
    // The nozzle rides on whichever side the hero faces, so the suction always
    // reads as coming out of the tool.
    const facing = this.player.flipX ? -1 : 1;
    this.nozzle.setPosition(this.player.x + facing * 20, this.player.y - 6);
    this.nozzle.setFlipX(this.player.flipX);

    this.drawCone(now);
    this.pullCollectibles(delta);
    this.dazeFlyers(now);

    if (now >= this.nextSfxAt) {
      this.nextSfxAt = now + VACUUM_SFX_INTERVAL_MS;
      sound.playVacuumLoop();
    }
    if (now >= this.nextParticleAt) {
      this.nextParticleAt = now + VACUUM_PARTICLE_INTERVAL_MS;
      this.spawnIntakeParticle();
    }
  }

  /** Swirling intake ring, fading as the tool runs down. */
  private drawCone(now: number): void {
    const g = this.cone;
    const fade = this.remainingMs < 2500 ? 0.5 + 0.5 * Math.sin(now / 90) : 1;
    g.clear();
    g.fillStyle(0x22c55e, 0.07 * fade);
    g.fillCircle(this.player.x, this.player.y, VACUUM_RADIUS);
    g.lineStyle(2, 0x86efac, 0.4 * fade);
    g.strokeCircle(this.player.x, this.player.y, VACUUM_RADIUS);

    // Three sweeping arcs that spin, so the field reads as actively sucking.
    g.lineStyle(3, 0x4ade80, 0.55 * fade);
    for (let i = 0; i < 3; i++) {
      const from = this.spin + (i * Math.PI * 2) / 3;
      g.beginPath();
      g.arc(this.player.x, this.player.y, VACUUM_RADIUS * 0.62, from, from + 0.9);
      g.strokePath();
    }
  }

  private pullCollectibles(delta: number): void {
    const step = (VACUUM_PULL_SPEED * delta) / 1000;

    for (const item of this.ctx.collectibles()) {
      if (!item.active) continue;
      const dx = this.player.x - item.x;
      const dy = this.player.y - item.y;
      const dist = Math.hypot(dx, dy);
      if (dist > VACUUM_RADIUS) continue;

      if (dist <= VACUUM_SWALLOW_DISTANCE) {
        sound.playVacuumSuck();
        this.ctx.swallow(item);
        continue;
      }

      // Tweens on the pickups keep re-writing y, so drive the body directly and
      // resync it — the same approach the magnet boost uses.
      this.scene.tweens.killTweensOf(item);
      item.x += (dx / dist) * step;
      item.y += (dy / dist) * step;
      item.setRotation(item.rotation + 0.25);
      item.body?.updateFromGameObject();
    }
  }

  private dazeFlyers(now: number): void {
    for (const flyer of this.ctx.flyers()) {
      if (!flyer.isAlive() || flyer.isStunned()) continue;
      const sprite = flyer.sprite;
      if (!sprite.active) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y) > VACUUM_RADIUS) {
        continue;
      }

      flyer.stun(now + VACUUM_STUN_MS);
      sound.playFlyDazed();
      this.puffAt(sprite.x, sprite.y);
    }
  }

  /** A harmless green puff, so dazing a flyer never looks like a hit. */
  private puffAt(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const p = this.scene.add.image(x, y, 'particle');
      p.setTint(0x86efac);
      p.setDepth(32);
      p.setScale(0.5);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * 26,
        y: y + Math.sin(angle) * 26,
        alpha: 0,
        scale: 0,
        duration: 420,
        onComplete: () => p.destroy(),
      });
    }
  }

  /** A mote of green air streaming from the rim of the field into the nozzle. */
  private spawnIntakeParticle(): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = VACUUM_RADIUS * (0.55 + Math.random() * 0.45);
    const fromX = this.player.x + Math.cos(angle) * radius;
    const fromY = this.player.y + Math.sin(angle) * radius;

    const p = this.scene.add.image(fromX, fromY, Math.random() < 0.35 ? 'leaf' : 'particle');
    p.setTint(Math.random() < 0.5 ? 0x4ade80 : 0xbbf7d0);
    p.setDepth(12);
    p.setScale(0.3 + Math.random() * 0.35);
    p.setAlpha(0.9);

    this.scene.tweens.add({
      targets: p,
      x: () => this.nozzle.x,
      y: () => this.nozzle.y,
      scale: 0,
      alpha: 0.2,
      angle: 220,
      duration: 340 + Math.random() * 160,
      ease: 'Cubic.in',
      onComplete: () => p.destroy(),
    });
  }

  /** Winds the tool down. Safe to call twice. */
  stop(): void {
    if (this.done) return;
    this.done = true;

    sound.playVacuumStop();
    this.cone.destroy();
    this.scene.tweens.killTweensOf(this.nozzle);
    this.scene.tweens.add({
      targets: this.nozzle,
      alpha: 0,
      scale: 0.4,
      duration: 260,
      onComplete: () => this.nozzle.destroy(),
    });

    this.ctx.onExpired();
  }
}
