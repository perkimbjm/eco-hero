import Phaser from 'phaser';
import {
  BOULDER_KNOCKBACK_Y,
  BOULDER_RADIUS,
  GAME_HEIGHT,
  LIGHTNING_KNOCKBACK_Y,
  LIGHTNING_STRIKE_MS,
  LIGHTNING_WARN_MS,
} from '../constants';
import type { LightningZoneDef, RollingBoulderDef, WaterfallDef } from '../types';
import type { EntityHost } from './EntityHost';
import * as sound from '../sound';

type ZonePhase = 'idle' | 'warning' | 'striking';

interface LightningZone {
  def: LightningZoneDef;
  gfx: Phaser.GameObjects.Graphics;
  phase: ZonePhase;
  until: number;
  nextAt: number;
}

interface Boulder {
  def: RollingBoulderDef;
  sprite: Phaser.Physics.Arcade.Sprite;
  travelled: number;
  rolling: boolean;
  nextAt: number;
}

/**
 * The summit's timed hazards: lightning columns and rockslides.
 *
 * Both are on fixed cycles and both announce themselves — a bolt glows and
 * crackles for LIGHTNING_WARN_MS before it lands, and a boulder is visible for
 * its whole approach. The level asks the player to read a rhythm and pick a
 * moment, never to react to something they could not have seen.
 */
export class MountainHazardManager {
  /** Live boulders; damaging on contact. */
  readonly boulderGroup: Phaser.Physics.Arcade.Group;

  private readonly host: EntityHost;
  private readonly scene: Phaser.Scene;
  private readonly zones: LightningZone[] = [];
  private readonly boulders: Boulder[] = [];

  constructor(
    host: EntityHost,
    zoneDefs: readonly LightningZoneDef[],
    boulderDefs: readonly RollingBoulderDef[],
    waterfallDefs: readonly WaterfallDef[]
  ) {
    this.host = host;
    this.scene = host.getScene();
    this.boulderGroup = this.scene.physics.add.group();

    for (const def of waterfallDefs) this.createWaterfall(def);
    for (const def of zoneDefs) this.createZone(def);
    for (const def of boulderDefs) this.createBoulder(def);

    this.scene.events.once('shutdown', () => {
      this.zones.length = 0;
      this.boulders.length = 0;
    });
  }

  // ── Waterfalls (decor the player can hide collectibles behind) ──

  private createWaterfall(def: WaterfallDef): void {
    const back = this.scene.add.graphics();
    back.setDepth(8);
    back.fillStyle(0x0c4a6e, 0.55);
    back.fillRect(def.x, def.y, def.width, def.height);

    // Falling sheets, drawn in front of pickups so they read as "behind" it.
    const front = this.scene.add.graphics();
    front.setDepth(35);
    front.fillStyle(0x7dd3fc, 0.34);
    front.fillRect(def.x, def.y, def.width, def.height);
    front.fillStyle(0xe0f2fe, 0.28);
    for (let x = def.x + 4; x < def.x + def.width - 4; x += 14) {
      front.fillRect(x, def.y, 5, def.height);
    }

    // Sliding highlight so the curtain looks like it is moving.
    const shimmer = this.scene.add.graphics();
    shimmer.setDepth(36);
    shimmer.fillStyle(0xffffff, 0.22);
    shimmer.fillRect(def.x, 0, def.width, 26);
    shimmer.y = def.y;
    this.scene.tweens.add({
      targets: shimmer,
      y: def.y + def.height - 26,
      duration: 900,
      repeat: -1,
      ease: 'Linear',
    });

    // Spray pool at the base.
    const pool = this.scene.add.graphics();
    pool.setDepth(9);
    pool.fillStyle(0xbae6fd, 0.35);
    pool.fillEllipse(def.x + def.width / 2, def.y + def.height, def.width + 26, 16);
  }

  // ── Lightning ───────────────────────────────────────────────

  private createZone(def: LightningZoneDef): void {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(38);
    this.zones.push({
      def,
      gfx,
      phase: 'idle',
      until: 0,
      nextAt: this.scene.time.now + def.phase + 900,
    });
  }

  private drawZone(zone: LightningZone, now: number): void {
    const { gfx, def } = zone;
    gfx.clear();
    if (zone.phase === 'idle') return;

    if (zone.phase === 'warning') {
      // A pulsing column plus a chevron at the top: unmissable, but harmless.
      const pulse = 0.18 + 0.16 * Math.abs(Math.sin(now / 90));
      gfx.fillStyle(0xfde047, pulse);
      gfx.fillRect(def.x, 0, def.width, GAME_HEIGHT);
      gfx.lineStyle(3, 0xfacc15, 0.9);
      gfx.strokeRect(def.x + 1, 1, def.width - 2, GAME_HEIGHT - 2);
      gfx.fillStyle(0xfef08a, 0.95);
      const cx = def.x + def.width / 2;
      gfx.fillTriangle(cx, 34, cx - 13, 8, cx + 13, 8);
      return;
    }

    // The bolt itself: a jagged white channel inside a bright column.
    gfx.fillStyle(0xfef9c3, 0.45);
    gfx.fillRect(def.x, 0, def.width, GAME_HEIGHT);
    gfx.lineStyle(6, 0xffffff, 1);
    gfx.beginPath();
    const cx = def.x + def.width / 2;
    gfx.moveTo(cx, 0);
    for (let y = 26; y < GAME_HEIGHT; y += 34) {
      gfx.lineTo(cx + (Math.random() - 0.5) * def.width * 0.7, y);
    }
    gfx.strokePath();
  }

  // ── Boulders ────────────────────────────────────────────────

  private createBoulder(def: RollingBoulderDef): void {
    const sprite = this.boulderGroup.create(def.x, def.y, 'rolling_boulder') as Phaser.Physics.Arcade.Sprite;
    sprite.setDepth(24);
    sprite.setCircle(BOULDER_RADIUS);
    sprite.setVisible(false);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.enable = false;

    this.boulders.push({
      def,
      sprite,
      travelled: 0,
      rolling: false,
      nextAt: this.scene.time.now + def.phase + 1200,
    });
  }

  private launch(boulder: Boulder): void {
    const { def, sprite } = boulder;
    boulder.rolling = true;
    boulder.travelled = 0;
    sprite.setPosition(def.x, def.y);
    sprite.setVisible(true);
    sprite.setAlpha(1);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(def.x, def.y);
    body.setAllowGravity(false);
    body.setVelocity(def.dir * def.speed, 0);
    sound.playRockFall();
  }

  private retire(boulder: Boulder, now: number): void {
    boulder.rolling = false;
    boulder.sprite.setVisible(false);
    boulder.sprite.body!.enable = false;
    boulder.nextAt = now + boulder.def.intervalMs;
  }

  // ── Per-frame ───────────────────────────────────────────────

  update(delta: number): void {
    const now = this.scene.time.now;
    const playing = this.host.isPlaying();

    for (const zone of this.zones) {
      if (zone.phase === 'idle' && now >= zone.nextAt && playing) {
        zone.phase = 'warning';
        zone.until = now + LIGHTNING_WARN_MS;
        sound.playThunderWarn();
      } else if (zone.phase === 'warning' && now >= zone.until) {
        zone.phase = 'striking';
        zone.until = now + LIGHTNING_STRIKE_MS;
        sound.playThunder();
        this.scene.cameras.main.flash(140, 255, 255, 210);
        this.strike(zone);
      } else if (zone.phase === 'striking' && now >= zone.until) {
        zone.phase = 'idle';
        zone.nextAt = now + zone.def.intervalMs;
      }
      this.drawZone(zone, now);
    }

    for (const boulder of this.boulders) {
      if (!boulder.rolling) {
        if (now >= boulder.nextAt && playing) this.launch(boulder);
        continue;
      }

      boulder.travelled += (boulder.def.speed * delta) / 1000;
      // Spin matches the direction of travel, so it reads as rolling, not sliding.
      boulder.sprite.setRotation(
        boulder.sprite.rotation + boulder.def.dir * (delta / 1000) * (boulder.def.speed / BOULDER_RADIUS)
      );
      if (boulder.travelled >= boulder.def.distance) this.retire(boulder, now);
    }
  }

  /** A bolt lands: anything of the player inside the column takes the hit. */
  private strike(zone: LightningZone): void {
    const player = this.host.player;
    const body = player.body;
    if (!body || !this.host.isPlaying() || this.host.isInvincible()) return;

    const inside = body.right > zone.def.x && body.left < zone.def.x + zone.def.width;
    if (!inside) return;
    this.host.damagePlayer(player.x, LIGHTNING_KNOCKBACK_Y);
  }

  handleBoulderContact(hit: Phaser.Physics.Arcade.Sprite): void {
    if (!this.host.isPlaying() || this.host.isInvincible()) return;
    const boulder = this.boulders.find((b) => b.sprite === hit);
    if (!boulder?.rolling) return;
    this.host.damagePlayer(hit.x, BOULDER_KNOCKBACK_Y);
  }
}
