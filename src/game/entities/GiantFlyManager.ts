import Phaser from 'phaser';
import {
  GIANT_FLY_COOLDOWN_MS,
  GIANT_FLY_DETECT_RANGE,
  GIANT_FLY_DIVE_MS,
  GIANT_FLY_DIVE_SPEED,
  GIANT_FLY_PATROL_SPEED,
  GIANT_FLY_RECOVER_MS,
  GIANT_FLY_SCORE,
  GIANT_FLY_TELEGRAPH_MS,
} from '../constants';
import { XP_REWARDS, COIN_REWARDS } from '../progression';
import type { GiantFlyDef } from '../types';
import type { EntityHost } from './EntityHost';
import * as sound from '../sound';

type FlyState = 'patrol' | 'telegraph' | 'dive' | 'recover';

interface FlyData {
  startX: number;
  startY: number;
  range: number;
  amplitude: number;
  speed: number;
  /** Advances the patrol sine wave; each fly keeps its own phase. */
  wave: number;
  state: FlyState;
  stateUntil: number;
  nextDiveAt: number;
  diveX: number;
  diveY: number;
  alive: boolean;
}

interface GiantFlySprite extends Phaser.Physics.Arcade.Sprite {
  flyData: FlyData;
}

const FLAP_ANIM = 'giantfly_flap';
const BODY_WIDTH = 40;
const BODY_HEIGHT = 26;

/**
 * Lalat raksasa — a giant fly that lazily patrols the air until the player
 * strays inside its detection radius, then telegraphs and dives at them.
 * It can be stomped from above like any other airborne enemy.
 */
export class GiantFlyManager {
  readonly group: Phaser.Physics.Arcade.Group;

  private readonly host: EntityHost;
  private readonly scene: Phaser.Scene;

  constructor(host: EntityHost, defs: readonly GiantFlyDef[]) {
    this.host = host;
    this.scene = host.getScene();
    this.group = this.scene.physics.add.group();

    this.ensureAnimation();

    for (const def of defs) {
      this.spawn(def);
    }
  }

  private ensureAnimation(): void {
    if (this.scene.anims.exists(FLAP_ANIM)) return;
    this.scene.anims.create({
      key: FLAP_ANIM,
      frames: [{ key: 'giant_fly1' }, { key: 'giant_fly2' }],
      frameRate: 14,
      repeat: -1,
    });
  }

  private spawn(def: GiantFlyDef): void {
    const sprite = this.scene.physics.add.sprite(def.x, def.y, 'giant_fly1') as GiantFlySprite;
    sprite.flyData = {
      startX: def.x,
      startY: def.y,
      range: def.range,
      amplitude: def.amplitude,
      speed: def.speed,
      wave: Math.random() * Math.PI * 2,
      state: 'patrol',
      stateUntil: 0,
      nextDiveAt: this.scene.time.now + 1200 + Math.random() * 1500,
      diveX: def.x,
      diveY: def.y,
      alive: true,
    };
    sprite.setDepth(25);
    sprite.setSize(BODY_WIDTH, BODY_HEIGHT);
    sprite.setOffset((sprite.width - BODY_WIDTH) / 2, (sprite.height - BODY_HEIGHT) / 2);

    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setCollideWorldBounds(false);

    sprite.play(FLAP_ANIM);
    this.group.add(sprite);
  }

  update(delta: number): void {
    const now = this.scene.time.now;
    const dt = delta / 1000;
    const player = this.host.player;

    this.group.getChildren().forEach((obj) => {
      const fly = obj as GiantFlySprite;
      if (!fly.flyData?.alive || !fly.body) return;

      const d = fly.flyData;

      switch (d.state) {
        case 'patrol':
          this.steerToPatrolAnchor(fly, dt);
          if (now >= d.nextDiveAt && this.isPlayerInRange(fly)) {
            d.state = 'telegraph';
            d.stateUntil = now + GIANT_FLY_TELEGRAPH_MS;
            this.telegraph(fly);
          }
          break;

        case 'telegraph':
          fly.setVelocity(0, Math.sin(now / 40) * 40);
          if (now >= d.stateUntil) {
            // Lock the dive target at commit time so the player can dodge it.
            d.diveX = player.x;
            d.diveY = player.y;
            d.state = 'dive';
            d.stateUntil = now + GIANT_FLY_DIVE_MS;
            this.launchDive(fly);
          }
          break;

        case 'dive':
          if (now >= d.stateUntil) {
            d.state = 'recover';
            d.stateUntil = now + GIANT_FLY_RECOVER_MS;
            d.nextDiveAt = now + GIANT_FLY_COOLDOWN_MS;
            fly.setTexture('giant_fly1');
            fly.play(FLAP_ANIM);
            fly.clearTint();
          }
          break;

        case 'recover':
          this.steerToPatrolAnchor(fly, dt, 0.6);
          if (now >= d.stateUntil) {
            d.state = 'patrol';
          }
          break;
      }

      const vx = fly.body.velocity.x;
      if (Math.abs(vx) > 12) fly.setFlipX(vx > 0);
    });
  }

  private isPlayerInRange(fly: GiantFlySprite): boolean {
    const player = this.host.player;
    const dist = Phaser.Math.Distance.Between(fly.x, fly.y, player.x, player.y);
    return dist <= GIANT_FLY_DETECT_RANGE;
  }

  private telegraph(fly: GiantFlySprite): void {
    fly.stop();
    fly.setTexture('giant_fly_angry');
    fly.setTint(0xfca5a5);
    sound.playBuzz();
    this.scene.tweens.add({
      targets: fly,
      scale: { from: 1, to: 1.18 },
      duration: GIANT_FLY_TELEGRAPH_MS,
      yoyo: true,
      ease: 'Sine.inOut',
    });
  }

  private launchDive(fly: GiantFlySprite): void {
    const d = fly.flyData;
    const angle = Phaser.Math.Angle.Between(fly.x, fly.y, d.diveX, d.diveY);
    fly.setVelocity(Math.cos(angle) * GIANT_FLY_DIVE_SPEED, Math.sin(angle) * GIANT_FLY_DIVE_SPEED);
    this.host.burst(fly.x, fly.y, 0x84cc16, 5);
  }

  /** Eases the fly back onto its sine-wave patrol path without teleporting it. */
  private steerToPatrolAnchor(fly: GiantFlySprite, dt: number, speedScale = 1): void {
    const d = fly.flyData;
    d.wave += dt * (d.speed / 60);

    const targetX = d.startX + Math.sin(d.wave) * d.range;
    const targetY = d.startY + Math.cos(d.wave * 1.4) * d.amplitude;
    const maxSpeed = GIANT_FLY_PATROL_SPEED * speedScale;

    const vx = Phaser.Math.Clamp((targetX - fly.x) * 4, -maxSpeed, maxSpeed);
    const vy = Phaser.Math.Clamp((targetY - fly.y) * 4, -maxSpeed, maxSpeed);
    fly.setVelocity(vx, vy);
  }

  /** Returns true when the contact defeated the fly rather than hurting the player. */
  handleContact(fly: Phaser.Physics.Arcade.Sprite): void {
    const target = fly as GiantFlySprite;
    if (!target.flyData?.alive || !this.host.isPlaying()) return;

    const player = this.host.player;
    if (!player.body || !target.body) return;

    const playerBottom = player.y + player.body.halfHeight;
    const flyTop = target.y - target.body.halfHeight;
    const falling = player.body.velocity.y > 0;
    const stomping = falling && playerBottom - player.body.velocity.y * 0.02 <= flyTop + 12;

    if (stomping) {
      this.defeat(target);
    } else if (!this.host.isInvincible()) {
      this.host.damagePlayer(target.x);
    }
  }

  private defeat(fly: GiantFlySprite, bounce = true): void {
    fly.flyData.alive = false;
    fly.body!.enable = false;
    fly.stop();
    fly.clearTint();

    sound.playStomp();
    this.host.burst(fly.x, fly.y, 0x65a30d, 16);
    this.host.floatScore(fly.x, fly.y - 12, `Lalat! +${GIANT_FLY_SCORE}`, '#bef264');
    this.host.award({
      score: GIANT_FLY_SCORE,
      xp: XP_REWARDS.flyingEnemy,
      coins: COIN_REWARDS.flyingEnemy,
      flyingKill: true,
    });
    if (bounce) this.host.bouncePlayer();

    this.scene.tweens.add({
      targets: fly,
      alpha: 0,
      angle: 180,
      y: fly.y + 40,
      scale: 0.6,
      duration: 450,
      onComplete: () => fly.destroy(),
    });
  }

  /**
   * Wipes out every living fly within `radius` of a point (an Eco Power skill).
   * Passing a non-positive radius clears the whole level. Returns the count.
   */
  purge(x: number, y: number, radius = 0): number {
    let defeated = 0;
    this.group.getChildren().forEach((obj) => {
      const fly = obj as GiantFlySprite;
      if (!fly.flyData?.alive) return;
      if (radius > 0 && Phaser.Math.Distance.Between(x, y, fly.x, fly.y) > radius) return;
      this.defeat(fly, false);
      defeated++;
    });
    return defeated;
  }
}
