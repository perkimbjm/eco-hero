import Phaser from 'phaser';
import { GAME_HEIGHT, TOXIC_KNOCKBACK_Y, TOXIC_WASTE_HEIGHT } from '../constants';
import type { ToxicWasteDef } from '../types';
import type { EntityHost } from './EntityHost';
import * as sound from '../sound';

const GROUND_Y = GAME_HEIGHT - 80;
const BUBBLE_INTERVAL_MS = 240;
/** Only bubble the pools the player can actually see. */
const BUBBLE_VIEW_MARGIN = 120;

interface Pool {
  left: number;
  right: number;
  width: number;
  centerX: number;
  surfaceY: number;
}

/**
 * Gundukan Limbah Beracun — pools of toxic sludge on the landfill floor.
 * Touching one costs a life and launches the player clear so they are not
 * trapped inside the hazard while invincibility ticks down.
 */
export class ToxicWasteManager {
  readonly group: Phaser.Physics.Arcade.StaticGroup;

  private readonly host: EntityHost;
  private readonly scene: Phaser.Scene;
  private readonly pools: Pool[] = [];
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;

  constructor(host: EntityHost, defs: readonly ToxicWasteDef[]) {
    this.host = host;
    this.scene = host.getScene();
    this.group = this.scene.physics.add.staticGroup();

    for (const def of defs) {
      this.createPool(def);
    }

    if (this.pools.length > 0) {
      this.bubbleTimer = this.scene.time.addEvent({
        delay: BUBBLE_INTERVAL_MS,
        loop: true,
        callback: () => this.spawnBubble(),
      });
      this.scene.events.once('shutdown', () => this.destroy());
    }
  }

  private createPool(def: ToxicWasteDef): void {
    const surfaceY = GROUND_Y - TOXIC_WASTE_HEIGHT;
    const pool: Pool = {
      left: def.x,
      right: def.x + def.width,
      width: def.width,
      centerX: def.x + def.width / 2,
      surfaceY,
    };
    this.pools.push(pool);

    this.drawPool(pool);
    this.addSurfaceRipples(pool);

    // Warning sign so the hazard reads before the player walks into it.
    const sign = this.scene.add.image(pool.left - 16, GROUND_Y - 20, 'toxic_sign');
    sign.setOrigin(0.5, 1);
    sign.setDepth(20);
    this.scene.tweens.add({
      targets: sign,
      angle: { from: -4, to: 4 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    const hitbox = this.group.create(
      pool.centerX,
      GROUND_Y - TOXIC_WASTE_HEIGHT / 2,
      '__white'
    ) as Phaser.Physics.Arcade.Sprite;
    hitbox.setDisplaySize(def.width, TOXIC_WASTE_HEIGHT);
    hitbox.setOrigin(0.5, 0.5);
    hitbox.refreshBody();
    hitbox.setVisible(false);
  }

  private drawPool(pool: Pool): void {
    const g = this.scene.add.graphics();
    g.setDepth(18);

    // Sunken pit the sludge sits in
    g.fillStyle(0x1c1917, 1);
    g.fillRect(pool.left, pool.surfaceY + 6, pool.width, TOXIC_WASTE_HEIGHT);

    // Sludge body
    g.fillStyle(0x3f6212, 1);
    g.fillRect(pool.left, pool.surfaceY + 4, pool.width, TOXIC_WASTE_HEIGHT);
    g.fillStyle(0x65a30d, 1);
    g.fillRect(pool.left, pool.surfaceY + 4, pool.width, 10);

    // Glowing surface skin
    g.fillStyle(0xa3e635, 0.9);
    g.fillRect(pool.left, pool.surfaceY, pool.width, 6);
    g.fillStyle(0xecfccb, 0.35);
    g.fillRect(pool.left, pool.surfaceY, pool.width, 2);

    // Rusted drums half-buried at the edges
    for (const dx of [pool.left + 10, pool.right - 10]) {
      g.fillStyle(0x7c2d12, 1);
      g.fillRect(dx - 9, pool.surfaceY - 16, 18, 20);
      g.fillStyle(0x9a3412, 1);
      g.fillRect(dx - 9, pool.surfaceY - 16, 18, 4);
      g.fillStyle(0xfacc15, 1);
      g.fillRect(dx - 7, pool.surfaceY - 10, 14, 3);
    }

    // Lumps of solid waste breaking the surface
    g.fillStyle(0x4d7c0f, 1);
    const lumps = Math.max(2, Math.floor(pool.width / 45));
    for (let i = 0; i < lumps; i++) {
      const lx = pool.left + ((i + 0.5) * pool.width) / lumps;
      g.fillEllipse(lx, pool.surfaceY + 2, 20, 9);
    }
  }

  private addSurfaceRipples(pool: Pool): void {
    const count = Math.max(2, Math.floor(pool.width / 55));
    for (let i = 0; i < count; i++) {
      const x = pool.left + ((i + 0.5) * pool.width) / count;
      const blob = this.scene.add.ellipse(x, pool.surfaceY + 1, 26, 8, 0xbef264, 0.55);
      blob.setDepth(19);
      this.scene.tweens.add({
        targets: blob,
        scaleX: { from: 0.7, to: 1.15 },
        scaleY: { from: 0.6, to: 1.3 },
        alpha: { from: 0.25, to: 0.7 },
        duration: 900 + i * 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  private spawnBubble(): void {
    if (this.pools.length === 0) return;

    const camLeft = this.scene.cameras.main.scrollX - BUBBLE_VIEW_MARGIN;
    const camRight = camLeft + this.scene.cameras.main.width + BUBBLE_VIEW_MARGIN * 2;
    const visible = this.pools.filter((p) => p.right > camLeft && p.left < camRight);
    if (visible.length === 0) return;

    const pool = visible[Math.floor(Math.random() * visible.length)];
    const x = pool.left + 8 + Math.random() * Math.max(1, pool.width - 16);
    const bubble = this.scene.add.image(x, pool.surfaceY + 2, 'toxic_bubble');
    bubble.setDepth(21);
    bubble.setScale(0.4 + Math.random() * 0.6);

    this.scene.tweens.add({
      targets: bubble,
      y: pool.surfaceY - 26 - Math.random() * 22,
      alpha: { from: 0.9, to: 0 },
      scale: bubble.scale * 1.6,
      duration: 900 + Math.random() * 500,
      ease: 'Sine.out',
      onComplete: () => bubble.destroy(),
    });
  }

  handleContact(): void {
    if (!this.host.isPlaying() || this.host.isInvincible()) return;

    const player = this.host.player;
    const pool = this.pools.find((p) => player.x >= p.left - 20 && player.x <= p.right + 20);
    // Push the player back the way they came so they land on solid ground.
    const sourceX = pool ? pool.centerX : player.x;

    sound.playToxic();
    this.host.burst(player.x, player.y + 16, 0x84cc16, 16);
    this.host.floatScore(player.x, player.y - 26, 'Limbah Beracun!', '#bef264');
    this.host.damagePlayer(sourceX, TOXIC_KNOCKBACK_Y);
  }

  private destroy(): void {
    this.bubbleTimer?.remove();
    this.bubbleTimer = null;
  }
}
