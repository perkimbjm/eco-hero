import Phaser from 'phaser';
import {
  ECO_BLASTER_SPEED,
  ECO_ORB_HOLD_MS,
  ECO_ORB_MAX,
  ECO_ORB_SPAWN_MS,
  GAME_HEIGHT,
  GRAVITY,
  LIGHTNING_STRIKE_MS,
  LIGHTNING_WARN_MS,
  POLLUTION_BALL_INTERVAL_MS,
  POLLUTION_BALL_SPEED,
  POLLUTION_BOSS_BOLT_INTERVAL_MS,
  POLLUTION_BOSS_DEFEAT_SCORE,
  POLLUTION_BOSS_PHASE_SCORE,
  POLLUTION_BOSS_SPEEDS,
  POLLUTION_BOSS_STAGGER_MS,
  POLLUTION_BOSS_WIND_FORCE,
  POLLUTION_BOSS_WIND_SWITCH_MS,
} from '../constants';
import { COIN_REWARDS, XP_REWARDS } from '../progression';
import type { PollutionBossDef } from '../types';
import type { EntityHost } from './EntityHost';
import { BossHud } from './BossHud';
import * as sound from '../sound';

const CLOUD_W = 190;
const CLOUD_H = 110;
const CORE_RADIUS = 34;
const PROJECTILE_LIFE_MS = 5000;
const SHOT_LIFE_MS = 2400;

interface Bolt {
  x: number;
  phase: 'warning' | 'striking';
  until: number;
}

/**
 * Raja Polusi — a storm cloud squatting on the summit.
 *
 * It is never beaten by touching it. Eco Energy Orbs keep welling up in the
 * arena; the player gathers one, which charges the Eco Blaster, then fires it
 * into the cloud's core. Three hits clear it, and each hit moves it to a nastier
 * phase:
 *
 *   1. drifts slowly, lobbing pollution balls,
 *   2. adds lightning and a crosswind that has to be jumped into,
 *   3. drifts fast and throws far more often.
 *
 * Running the charge down only costs time — a fresh orb always follows — so the
 * fight can stall but never dead-end.
 */
export class PollutionKingBoss {
  readonly cloud: Phaser.Physics.Arcade.Sprite;
  readonly ballGroup: Phaser.Physics.Arcade.Group;
  readonly orbGroup: Phaser.Physics.Arcade.Group;
  readonly shotGroup: Phaser.Physics.Arcade.Group;

  private readonly host: EntityHost;
  private readonly scene: Phaser.Scene;
  private readonly def: PollutionBossDef;
  private readonly hud: BossHud;
  private readonly onDefeated: () => void;
  private readonly onChargeChange: (charged: boolean) => void;

  private readonly body: Phaser.GameObjects.Graphics;
  private readonly boltGfx: Phaser.GameObjects.Graphics;

  private hp: number;
  private phase = 0;
  private dir: 1 | -1 = 1;
  private defeated = false;
  private staggeredUntil = 0;

  private nextBallAt = 0;
  private nextBoltAt = 0;
  private nextOrbAt = 0;
  private windUntil = 0;
  private windDir: 1 | -1 = 1;
  private bolts: Bolt[] = [];

  /** The orb the player is carrying, if any. */
  private charged = false;
  private chargeUntil = 0;
  private chargeIcon: Phaser.GameObjects.Image | null = null;

  constructor(
    host: EntityHost,
    def: PollutionBossDef,
    onDefeated: () => void,
    onChargeChange: (charged: boolean) => void
  ) {
    this.host = host;
    this.scene = host.getScene();
    this.def = def;
    this.onDefeated = onDefeated;
    this.onChargeChange = onChargeChange;
    this.hp = def.hp;

    this.ballGroup = this.scene.physics.add.group();
    this.orbGroup = this.scene.physics.add.group();
    this.shotGroup = this.scene.physics.add.group();

    this.body = this.scene.add.graphics();
    this.body.setDepth(22);
    this.boltGfx = this.scene.add.graphics();
    this.boltGfx.setDepth(38);

    // Invisible collision slab; the cloud itself is drawn every frame.
    this.cloud = this.scene.physics.add.sprite(def.x, def.y, '__white');
    this.cloud.setDisplaySize(CLOUD_W, CLOUD_H);
    this.cloud.setVisible(false);
    this.cloud.setImmovable(true);
    const cloudBody = this.cloud.body as Phaser.Physics.Arcade.Body;
    cloudBody.setAllowGravity(false);
    cloudBody.moves = false;

    this.hud = new BossHud(this.scene, def.name, def.hp);
    this.hud.setHp(def.hp);

    const now = this.scene.time.now;
    this.nextBallAt = now + 1600;
    this.nextOrbAt = now + 900;
    this.nextBoltAt = now + POLLUTION_BOSS_BOLT_INTERVAL_MS;
    this.updateTask();

    this.scene.events.once('shutdown', () => this.hud.destroy());
  }

  get isDefeated(): boolean {
    return this.defeated;
  }

  // ── Per-frame ───────────────────────────────────────────────

  update(delta: number): void {
    if (this.defeated) {
      this.drawCloud();
      return;
    }
    const now = this.scene.time.now;
    const playing = this.host.isPlaying();

    this.drift(delta, now);
    this.drawCloud();
    this.updateBolts(now);
    this.expireCharge(now);
    this.trackChargeIcon();

    if (!playing) return;

    if (now >= this.nextBallAt && now >= this.staggeredUntil) {
      this.nextBallAt = now + POLLUTION_BALL_INTERVAL_MS[this.phase];
      this.throwPollutionBall();
    }
    if (now >= this.nextOrbAt && this.orbGroup.getLength() < ECO_ORB_MAX && !this.charged) {
      this.nextOrbAt = now + ECO_ORB_SPAWN_MS;
      this.spawnOrb();
    }
    // Phase 2 onwards the storm itself joins in.
    if (this.phase >= 1 && now >= this.nextBoltAt && now >= this.staggeredUntil) {
      this.nextBoltAt = now + POLLUTION_BOSS_BOLT_INTERVAL_MS;
      this.callBolt();
    }
    if (this.phase >= 1) this.applyWind(delta, now);
  }

  private drift(delta: number, now: number): void {
    if (now < this.staggeredUntil) return;
    const speed = POLLUTION_BOSS_SPEEDS[this.phase];
    let x = this.cloud.x + this.dir * speed * (delta / 1000);
    const left = this.def.arenaStart + CLOUD_W / 2;
    const right = this.def.arenaEnd - CLOUD_W / 2;
    if (x <= left) {
      x = left;
      this.dir = 1;
    } else if (x >= right) {
      x = right;
      this.dir = -1;
    }
    this.cloud.x = x;
    // A slow bob, faster once it is angry.
    this.cloud.y = this.def.y + Math.sin(now / (620 - this.phase * 130)) * 14;
    this.cloud.body?.updateFromGameObject();
  }

  /** The storm cloud, its lightning-lit underside, and the glowing core. */
  private drawCloud(): void {
    const g = this.body;
    const x = this.cloud.x;
    const y = this.cloud.y;
    const now = this.scene.time.now;
    const angry = this.phase >= 1;

    g.clear();
    // Billows, darker as it gets angrier.
    const dark = this.defeated ? 0xf8fafc : angry ? 0x1c1917 : 0x292524;
    const mid = this.defeated ? 0xffffff : angry ? 0x3f3f46 : 0x44403c;
    g.fillStyle(dark, 0.95);
    g.fillEllipse(x, y + 12, CLOUD_W, CLOUD_H * 0.7);
    g.fillEllipse(x - 58, y + 6, 96, 74);
    g.fillEllipse(x + 58, y + 8, 96, 70);
    g.fillStyle(mid, 1);
    g.fillEllipse(x - 20, y - 12, 110, 66);
    g.fillEllipse(x + 34, y - 8, 96, 58);
    g.fillStyle(this.defeated ? 0xffffff : 0x57534e, 1);
    g.fillEllipse(x - 4, y - 24, 86, 44);

    if (this.defeated) return;

    // Smog trailing off the underside.
    g.fillStyle(0x6b21a8, 0.28);
    for (let i = 0; i < 4; i++) {
      const wob = Math.sin(now / 300 + i) * 8;
      g.fillEllipse(x - 60 + i * 40 + wob, y + 44, 40, 18);
    }

    // The core: what the Eco Blaster has to hit.
    const pulse = 1 + Math.sin(now / 160) * 0.12;
    g.fillStyle(0x7e22ce, 0.55);
    g.fillCircle(x, y + 6, CORE_RADIUS * pulse);
    g.fillStyle(0xa855f7, 0.9);
    g.fillCircle(x, y + 6, CORE_RADIUS * 0.66 * pulse);
    g.fillStyle(0xf0abfc, 1);
    g.fillCircle(x, y + 6, CORE_RADIUS * 0.3 * pulse);

    // Angry eyes appear from phase 2.
    if (angry) {
      g.fillStyle(0xfde047, 1);
      g.fillEllipse(x - 30, y - 18, 20, 11);
      g.fillEllipse(x + 30, y - 18, 20, 11);
      g.fillStyle(0x1c1917, 1);
      g.fillCircle(x - 30, y - 18, 4);
      g.fillCircle(x + 30, y - 18, 4);
    }
  }

  // ── Attacks ─────────────────────────────────────────────────

  private throwPollutionBall(): void {
    const ball = this.ballGroup.create(this.cloud.x, this.cloud.y + 40, 'pollution_ball') as Phaser.Physics.Arcade.Sprite;
    ball.setDepth(23);
    ball.setCircle(11);
    const body = ball.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setGravityY(GRAVITY * 0.4);

    const player = this.host.player;
    const angle = Phaser.Math.Angle.Between(ball.x, ball.y, player.x, player.y - 30);
    body.setVelocity(Math.cos(angle) * POLLUTION_BALL_SPEED, Math.sin(angle) * POLLUTION_BALL_SPEED);

    sound.playSmog();
    this.scene.tweens.add({ targets: ball, angle: 360, duration: 900, repeat: -1 });
    this.scene.time.delayedCall(PROJECTILE_LIFE_MS, () => ball.destroy());
  }

  private callBolt(): void {
    // Lands where the player is now, with the standard warning window.
    this.bolts.push({
      x: this.host.player.x,
      phase: 'warning',
      until: this.scene.time.now + LIGHTNING_WARN_MS,
    });
    sound.playThunderWarn();
  }

  private updateBolts(now: number): void {
    const g = this.boltGfx;
    g.clear();

    this.bolts = this.bolts.filter((bolt) => {
      if (bolt.phase === 'warning') {
        if (now >= bolt.until) {
          bolt.phase = 'striking';
          bolt.until = now + LIGHTNING_STRIKE_MS;
          sound.playThunder();
          this.scene.cameras.main.flash(120, 255, 255, 210);
          this.resolveBolt(bolt);
        } else {
          const pulse = 0.2 + 0.18 * Math.abs(Math.sin(now / 80));
          g.fillStyle(0xfde047, pulse);
          g.fillRect(bolt.x - 34, 0, 68, GAME_HEIGHT);
          g.fillStyle(0xfef08a, 0.95);
          g.fillTriangle(bolt.x, 32, bolt.x - 12, 8, bolt.x + 12, 8);
        }
        return true;
      }

      if (now >= bolt.until) return false;
      g.fillStyle(0xfef9c3, 0.45);
      g.fillRect(bolt.x - 34, 0, 68, GAME_HEIGHT);
      g.lineStyle(6, 0xffffff, 1);
      g.beginPath();
      g.moveTo(bolt.x, 0);
      for (let y = 30; y < GAME_HEIGHT; y += 36) {
        g.lineTo(bolt.x + (Math.random() - 0.5) * 44, y);
      }
      g.strokePath();
      return true;
    });
  }

  private resolveBolt(bolt: Bolt): void {
    if (this.host.isInvincible() || !this.host.isPlaying()) return;
    if (Math.abs(this.host.player.x - bolt.x) > 40) return;
    this.host.damagePlayer(bolt.x, -320);
  }

  /** A crosswind that has to be jumped into rather than fought. */
  private applyWind(delta: number, now: number): void {
    if (now >= this.windUntil) {
      this.windUntil = now + POLLUTION_BOSS_WIND_SWITCH_MS;
      this.windDir = this.windDir === 1 ? -1 : 1;
      this.host.banner(
        this.windDir === 1 ? 'Angin kencang ke kanan!' : 'Angin kencang ke kiri!',
        '#bae6fd'
      );
    }
    const player = this.host.player;
    const body = player.body;
    if (!body) return;
    // Only shoves in the air, so it never fights the player's footing.
    if (body.blocked.down || body.touching.down) return;
    player.x += this.windDir * POLLUTION_BOSS_WIND_FORCE * (delta / 1000);
  }

  // ── Eco Energy Orbs and the Eco Blaster ─────────────────────

  private spawnOrb(): void {
    const x = Phaser.Math.Between(this.def.arenaStart + 90, this.def.arenaEnd - 90);
    const orb = this.orbGroup.create(x, GAME_HEIGHT - 150, 'eco_orb') as Phaser.Physics.Arcade.Sprite;
    orb.setDepth(26);
    const body = orb.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    this.scene.tweens.add({
      targets: orb,
      y: orb.y - 16,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.scene.tweens.add({
      targets: orb,
      scale: { from: 0.85, to: 1.12 },
      duration: 520,
      yoyo: true,
      repeat: -1,
    });
    this.host.burst(x, orb.y, 0x4ade80, 10);
    sound.playEnergy();
  }

  handleOrbPickup(orb: Phaser.Physics.Arcade.Sprite): void {
    if (this.defeated || this.charged || !this.host.isPlaying()) return;
    this.scene.tweens.killTweensOf(orb);
    orb.destroy();

    this.charged = true;
    this.chargeUntil = this.scene.time.now + ECO_ORB_HOLD_MS;
    this.onChargeChange(true);
    sound.playEnergy();
    this.host.burst(this.host.player.x, this.host.player.y, 0x4ade80, 16);
    this.host.banner('Eco Blaster terisi! Tembak inti awan (Z)', '#86efac');

    this.chargeIcon = this.scene.add.image(this.host.player.x, this.host.player.y - 46, 'eco_orb');
    this.chargeIcon.setDepth(33);
    this.scene.tweens.add({
      targets: this.chargeIcon,
      scale: { from: 0.8, to: 1.05 },
      duration: 420,
      yoyo: true,
      repeat: -1,
    });
    this.updateTask();
  }

  private trackChargeIcon(): void {
    if (!this.chargeIcon) return;
    this.chargeIcon.setPosition(this.host.player.x, this.host.player.y - 46);
  }

  private expireCharge(now: number): void {
    if (!this.charged || now < this.chargeUntil) return;
    this.clearCharge();
    this.host.banner('Energi memudar — ambil orb berikutnya', '#fca5a5');
    // A fresh orb follows immediately, so a lapsed charge never stalls the fight.
    this.nextOrbAt = now + 600;
    this.updateTask();
  }

  private clearCharge(): void {
    this.charged = false;
    this.onChargeChange(false);
    if (this.chargeIcon) {
      this.scene.tweens.killTweensOf(this.chargeIcon);
      this.chargeIcon.destroy();
      this.chargeIcon = null;
    }
  }

  /** Fires the Eco Blaster (Z key / mobile throw button). */
  fire(): void {
    if (this.defeated || !this.charged || !this.host.isPlaying()) return;

    const player = this.host.player;
    const shot = this.shotGroup.create(player.x, player.y - 8, 'eco_shot') as Phaser.Physics.Arcade.Sprite;
    shot.setDepth(30);
    const body = shot.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    // Aimed at the core rather than straight ahead, so firing is about picking
    // the moment, not about pixel-perfect alignment.
    const angle = Phaser.Math.Angle.Between(shot.x, shot.y, this.cloud.x, this.cloud.y + 6);
    body.setVelocity(Math.cos(angle) * ECO_BLASTER_SPEED, Math.sin(angle) * ECO_BLASTER_SPEED);
    shot.setRotation(angle);

    this.clearCharge();
    sound.playBlaster();
    this.host.burst(shot.x, shot.y, 0x86efac, 10);
    this.scene.time.delayedCall(SHOT_LIFE_MS, () => shot.destroy());
    this.updateTask();
  }

  handleShotHit(shot: Phaser.Physics.Arcade.Sprite): void {
    if (this.defeated || !shot.active) return;
    shot.destroy();
    this.takeHit();
  }

  handleBallContact(ball: Phaser.Physics.Arcade.Sprite): void {
    if (!ball.active || !this.host.isPlaying()) return;
    ball.destroy();
    if (this.host.isInvincible()) return;
    this.host.damagePlayer(ball.x, -300);
  }

  /** Touching the cloud is a hit, but never a shortcut to damaging it. */
  handleCloudContact(): void {
    if (this.defeated || !this.host.isPlaying() || this.host.isInvincible()) return;
    this.host.damagePlayer(this.cloud.x, -320);
  }

  // ── Damage and defeat ───────────────────────────────────────

  private takeHit(): void {
    this.hp--;
    this.hud.setHp(this.hp);
    sound.playBossHit();
    this.scene.cameras.main.shake(0.25, 0.012);
    this.host.burst(this.cloud.x, this.cloud.y + 6, 0x4ade80, 26);

    // A stagger window after every hit: the storm stops attacking long enough
    // for the player to reposition and grab the next orb.
    this.staggeredUntil = this.scene.time.now + POLLUTION_BOSS_STAGGER_MS;
    this.nextBallAt = this.staggeredUntil + 400;
    this.nextBoltAt = this.staggeredUntil + 900;
    this.nextOrbAt = this.scene.time.now + 700;

    if (this.hp <= 0) {
      this.defeat();
      return;
    }

    this.phase = Math.min(POLLUTION_BOSS_SPEEDS.length - 1, this.phase + 1);
    this.host.award({ score: POLLUTION_BOSS_PHASE_SCORE, xp: XP_REWARDS.enemy, coins: COIN_REWARDS.enemy });
    this.host.banner(
      this.phase === 1 ? 'Fase 2: petir dan angin kencang!' : 'Fase 3: awan bergerak makin cepat!',
      '#fde047'
    );
    this.updateTask();
  }

  private defeat(): void {
    this.defeated = true;
    this.clearCharge();
    this.boltGfx.clear();
    this.bolts = [];
    this.cloud.body!.enable = false;
    this.ballGroup.clear(true, true);
    this.orbGroup.clear(true, true);

    this.hud.setTask('Puncak kembali bersih!');
    this.host.award({ score: POLLUTION_BOSS_DEFEAT_SCORE, xp: XP_REWARDS.levelComplete, coins: COIN_REWARDS.levelComplete });
    sound.playBossDefeat();

    this.scene.time.delayedCall(2600, () => this.hud.destroy());
    this.onDefeated();
  }

  private updateTask(): void {
    if (this.defeated) return;
    this.hud.setTask(
      this.charged
        ? 'Eco Blaster terisi — tembak inti awan! (Z / tombol lempar)'
        : 'Ambil Eco Energy Orb di arena untuk mengisi Eco Blaster'
    );
  }
}
