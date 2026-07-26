import Phaser from 'phaser';
import {
  BOSS_DEFEAT_SCORE,
  BOSS_ENERGY_DURATION_MS,
  BOSS_MACHINE_CYCLE_MS,
  BOSS_ORB_MAGNET_SPEED,
  BOSS_ORB_SPEED,
  BOSS_PATROL_MARGIN,
  BOSS_PATROL_SPEED,
  BOSS_PHASE_SCORE,
  BOSS_SLAM_INTERVAL_MS,
  BOSS_SLAM_RADIUS,
  BOSS_SLAM_TELEGRAPH_MS,
  BOSS_STUN_MS,
  BOSS_THROW_INTERVAL_MS,
  BOSS_TRASH_MAX,
  BOSS_TRASH_SPAWN_MS,
  GAME_HEIGHT,
  GRAVITY,
  TRASH_COLORS,
  TRASH_TYPES,
} from '../constants';
import { COIN_REWARDS, XP_REWARDS } from '../progression';
import type { BossDef, TrashType } from '../types';
import type { EntityHost } from './EntityHost';
import { BossHud } from './BossHud';
import * as sound from '../sound';

const GROUND_Y = GAME_HEIGHT - 80;
const BOSS_BODY_WIDTH = 110;
const BOSS_BODY_HEIGHT = 150;
const PROJECTILE_LIFETIME_MS = 4000;
/** How long a thrown energy orb flies before it is written off as a miss. */
const ENERGY_SHOT_LIFETIME_MS = 2200;

interface BossTrashSprite extends Phaser.Physics.Arcade.Sprite {
  trashType: TrashType;
  taken: boolean;
}

type SlamPhase = 'idle' | 'telegraph' | 'airborne';

/**
 * Mini boss "Raja Sampah TPA" — a monster fused from plastic bottles, worn
 * tires, cans and dead electronics.
 *
 * Defeat loop, one pass per phase:
 *   1. pick up trash matching the requested category,
 *   2. feed it into the recycling machine,
 *   3. the machine outputs an energy orb, which flies to the player,
 *   4. hurl the energy at the king from a safe distance (or ram him with it).
 *
 * The loop is deliberately forgiving: a wrong category is handed back rather
 * than destroyed, the charge makes the player untouchable and staggers the
 * king, and running the charge down only costs time — the machine reissues the
 * orb. Nothing here should ever send the player back to the start of a phase.
 */
export class TrashKingBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly machine: Phaser.Physics.Arcade.Sprite;
  readonly trashGroup: Phaser.Physics.Arcade.Group;
  readonly orbGroup: Phaser.Physics.Arcade.Group;
  readonly projectileGroup: Phaser.Physics.Arcade.Group;
  /** Energy orbs the player has thrown at the king. */
  readonly energyShotGroup: Phaser.Physics.Arcade.Group;

  private readonly host: EntityHost;
  private readonly scene: Phaser.Scene;
  private readonly def: BossDef;
  private readonly hud: BossHud;
  private readonly onDefeated: () => void;
  private readonly onChargeChange: (charged: boolean) => void;

  private hp: number;
  private phaseIndex = 0;
  private engaged = false;
  private defeated = false;

  private carriedType: TrashType | null = null;
  private carriedIcon: Phaser.GameObjects.Image | null = null;
  private charged = false;
  private chargeUntil = 0;
  private aura: Phaser.GameObjects.Arc | null = null;

  private stunUntil = 0;
  private patrolDir = -1;
  private nextThrowAt = 0;
  private nextSlamAt = 0;
  private nextTrashAt = 0;
  private machineBusyUntil = 0;
  private lastHintAt = 0;
  private slamPhase: SlamPhase = 'idle';

  constructor(
    host: EntityHost,
    def: BossDef,
    onDefeated: () => void,
    onChargeChange: (charged: boolean) => void = () => {}
  ) {
    this.host = host;
    this.scene = host.getScene();
    this.def = def;
    this.onDefeated = onDefeated;
    this.onChargeChange = onChargeChange;
    this.hp = def.phases.length;

    this.trashGroup = this.scene.physics.add.group();
    this.orbGroup = this.scene.physics.add.group();
    this.projectileGroup = this.scene.physics.add.group();
    this.energyShotGroup = this.scene.physics.add.group();

    this.machine = this.createMachine();
    this.sprite = this.createBoss();
    this.hud = new BossHud(this.scene, def.name, def.phases.length);

    this.scene.physics.add.collider(this.trashGroup, host.getPlatforms());
    this.scene.physics.add.collider(this.projectileGroup, host.getPlatforms(), (proj) => {
      this.splatProjectile(proj as Phaser.Physics.Arcade.Sprite);
    });

    this.drawArenaDressing();
    this.scene.events.once('shutdown', () => this.hud.destroy());
  }

  // ── Setup ──────────────────────────────────────────────────

  private createBoss(): Phaser.Physics.Arcade.Sprite {
    const boss = this.scene.physics.add.sprite(this.def.x, this.def.y, 'boss_king');
    boss.setDepth(28);
    boss.setSize(BOSS_BODY_WIDTH, BOSS_BODY_HEIGHT);
    boss.setOffset((boss.width - BOSS_BODY_WIDTH) / 2, boss.height - BOSS_BODY_HEIGHT);
    boss.setImmovable(true);
    (boss.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Idle breathing so the pile of junk feels alive before the fight starts.
    this.scene.tweens.add({
      targets: boss,
      scaleY: { from: 1, to: 0.97 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    return boss;
  }

  private createMachine(): Phaser.Physics.Arcade.Sprite {
    const machine = this.scene.physics.add.sprite(this.def.machineX, this.def.machineY, 'recycle_machine');
    machine.setDepth(24);
    machine.setImmovable(true);
    (machine.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    const label = this.scene.add.text(this.def.machineX, this.def.machineY - 74, 'MESIN DAUR ULANG', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#bbf7d0',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);
    label.setShadow(2, 2, 'rgba(0,0,0,0.8)', 3);
    label.setDepth(24);

    const glow = this.scene.add.circle(this.def.machineX, this.def.machineY - 10, 46, 0x22c55e, 0.16);
    glow.setDepth(23);
    this.scene.tweens.add({
      targets: glow,
      scale: { from: 0.85, to: 1.15 },
      alpha: { from: 0.16, to: 0.05 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
    });
    return machine;
  }

  /** Junk piles and a chain barrier that frame the arena entrance. */
  private drawArenaDressing(): void {
    const g = this.scene.add.graphics();
    g.setDepth(15);
    g.fillStyle(0x292524, 1);
    g.fillRect(this.def.arenaStart, GROUND_Y - 6, this.def.arenaEnd - this.def.arenaStart, 6);
    g.fillStyle(0x84cc16, 0.25);
    g.fillRect(this.def.arenaStart, GROUND_Y - 8, this.def.arenaEnd - this.def.arenaStart, 2);

    for (let i = 0; i < 6; i++) {
      const x = this.def.arenaStart + 60 + i * ((this.def.arenaEnd - this.def.arenaStart - 120) / 5);
      g.fillStyle(0x44403c, 1);
      g.fillEllipse(x, GROUND_Y - 4, 60 + (i % 3) * 18, 18);
      g.fillStyle(0x57534e, 1);
      g.fillEllipse(x - 6, GROUND_Y - 9, 32, 11);
    }
  }

  // ── Per-frame ──────────────────────────────────────────────

  update(delta: number): void {
    if (this.defeated) {
      this.updateCarriedIcon();
      return;
    }

    const now = this.scene.time.now;
    const player = this.host.player;

    if (!this.engaged && player.x >= this.def.arenaStart) {
      this.engage();
    }

    this.updateCarriedIcon();
    this.updateOrbMagnet(delta);
    this.updateCharge(now);
    this.updateHudTask(now);

    if (!this.engaged || !this.host.isPlaying()) return;

    this.updateMovement(now, delta);
    this.updateAttacks(now);
    this.updateArenaTrash(now);
  }

  /**
   * Sets the charged state in one place so the aura, the HUD throw button and
   * the boss's stagger can never drift out of sync with each other.
   */
  private setCharged(charged: boolean): void {
    if (this.charged === charged) return;
    this.charged = charged;
    if (charged) {
      this.attachAura();
    } else {
      this.aura?.destroy();
      this.aura = null;
    }
    this.onChargeChange(charged);
  }

  private engage(): void {
    this.engaged = true;
    const now = this.scene.time.now;
    this.nextThrowAt = now + 2200;
    this.nextSlamAt = now + BOSS_SLAM_INTERVAL_MS;
    this.nextTrashAt = now;

    this.hud.show();
    this.hud.setHp(this.hp);
    this.host.banner(`${this.def.name.toUpperCase()} MUNCUL!`, '#fca5a5');
    sound.playBossRoar();
    this.scene.cameras.main.shake(500, 0.01);

    // Seed the arena so the player has something to sort immediately.
    for (let i = 0; i < 4; i++) {
      this.spawnArenaTrash(i < 2);
    }
  }

  private updateMovement(now: number, delta: number): void {
    if (this.slamPhase !== 'idle') return;

    if (now < this.stunUntil) {
      this.sprite.setVelocityX(0);
      return;
    }

    // The king guards the right half; the sorting area near the machine stays
    // his-free so collecting trash is not a constant stream of contact damage.
    const minX = this.def.arenaStart + BOSS_PATROL_MARGIN;
    const maxX = this.def.arenaEnd - 70;
    if (this.sprite.x <= minX) this.patrolDir = 1;
    if (this.sprite.x >= maxX) this.patrolDir = -1;

    // Recycled energy makes him cower: an easy target while the player lines up.
    const speed = this.charged ? BOSS_PATROL_SPEED * 0.4 : BOSS_PATROL_SPEED;
    this.sprite.setVelocityX(this.patrolDir * speed);
    // Lumbering waddle, tied to travel rather than wall-clock time.
    this.sprite.setRotation(Math.sin(now / 260) * 0.035);
    void delta;
  }

  private updateAttacks(now: number): void {
    if (now < this.stunUntil) return;

    // Staggered by the recycled energy — he cannot fight back while it is out.
    if (this.charged) {
      this.nextSlamAt = Math.max(this.nextSlamAt, now + 1200);
      this.nextThrowAt = Math.max(this.nextThrowAt, now + 1200);
      return;
    }

    if (this.slamPhase === 'idle' && now >= this.nextSlamAt) {
      this.startSlam();
      return;
    }
    if (this.slamPhase === 'idle' && now >= this.nextThrowAt) {
      this.throwJunk();
      // Gets a little more frantic as the king loses phases, but never enough
      // to turn the last phase into a bullet hell.
      const urgency = 1 - (this.def.phases.length - this.hp) * 0.06;
      this.nextThrowAt = now + BOSS_THROW_INTERVAL_MS * Math.max(0.8, urgency);
    }
  }

  private updateArenaTrash(now: number): void {
    if (now < this.nextTrashAt) return;
    this.nextTrashAt = now + BOSS_TRASH_SPAWN_MS;

    const live = this.trashGroup.getChildren().filter((t) => !(t as BossTrashSprite).taken);
    if (live.length >= BOSS_TRASH_MAX) return;

    // Never let the arena run dry of the category the player actually needs.
    const requiredAvailable = live.some((t) => (t as BossTrashSprite).trashType === this.requiredType);
    this.spawnArenaTrash(!requiredAvailable || Math.random() < 0.5);
  }

  // ── Boss attacks ───────────────────────────────────────────

  private throwJunk(): void {
    const player = this.host.player;
    const startX = this.sprite.x + (player.x < this.sprite.x ? -60 : 60);
    const startY = this.sprite.y - 90;

    const proj = this.scene.physics.add.sprite(startX, startY, 'boss_junk') as Phaser.Physics.Arcade.Sprite;
    proj.setDepth(29);
    proj.setCircle(13, 2, 2);
    const projectileGravity = GRAVITY * 0.55;
    const body = proj.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setGravityY(projectileGravity);

    // Join the group first: Arcade group.add() resets body velocity, so aiming
    // beforehand would drop the junk straight down at the king's feet.
    this.projectileGroup.add(proj);

    // Solve a fixed-duration arc so the throw always reaches the player.
    // World gravity is zero here — every body carries its own — so the only
    // acceleration acting on the projectile is the value set just above.
    const flight = 1.05;
    const gravity = projectileGravity;
    const vx = (player.x - startX) / flight;
    const vy = (player.y - startY - 0.5 * gravity * flight * flight) / flight;
    proj.setVelocity(Phaser.Math.Clamp(vx, -520, 520), vy);
    proj.setAngularVelocity(300);
    sound.playBossRoar();
    this.host.burst(startX, startY, 0x78716c, 6);

    this.scene.time.delayedCall(PROJECTILE_LIFETIME_MS, () => {
      if (proj.active) this.splatProjectile(proj);
    });
  }

  private splatProjectile(proj: Phaser.Physics.Arcade.Sprite): void {
    if (!proj.active) return;
    this.host.burst(proj.x, proj.y, 0x57534e, 8);
    proj.destroy();
  }

  private startSlam(): void {
    this.slamPhase = 'telegraph';
    this.sprite.setVelocityX(0);
    this.sprite.setTint(0xfca5a5);
    this.host.floatScore(this.sprite.x, this.sprite.y - 170, 'AWAS — HANTAMAN!', '#fecaca');
    sound.playBossRoar();

    const baseY = this.sprite.y;
    this.scene.tweens.add({
      targets: this.sprite,
      y: baseY - 90,
      duration: BOSS_SLAM_TELEGRAPH_MS,
      ease: 'Sine.out',
      onComplete: () => {
        this.slamPhase = 'airborne';
        this.scene.tweens.add({
          targets: this.sprite,
          y: baseY,
          duration: 220,
          ease: 'Cubic.in',
          onComplete: () => this.resolveSlam(baseY),
        });
      },
    });
  }

  private resolveSlam(baseY: number): void {
    this.sprite.clearTint();
    this.sprite.setY(baseY);
    this.slamPhase = 'idle';
    this.nextSlamAt = this.scene.time.now + BOSS_SLAM_INTERVAL_MS;

    this.scene.cameras.main.shake(320, 0.014);
    sound.playStomp();
    this.host.burst(this.sprite.x, GROUND_Y - 10, 0x78716c, 22);

    for (const dir of [-1, 1]) {
      const ring = this.scene.add.ellipse(this.sprite.x, GROUND_Y - 8, 20, 12, 0xa8a29e, 0.7);
      ring.setDepth(26);
      this.scene.tweens.add({
        targets: ring,
        x: this.sprite.x + dir * BOSS_SLAM_RADIUS,
        scaleX: 4,
        scaleY: 2,
        alpha: 0,
        duration: 450,
        onComplete: () => ring.destroy(),
      });
    }

    const player = this.host.player;
    const grounded = !!player.body && (player.body.blocked.down || player.body.touching.down);
    const inRange = Math.abs(player.x - this.sprite.x) <= BOSS_SLAM_RADIUS;
    if (!grounded || !inRange || this.host.isInvincible() || !this.host.isPlaying()) return;

    // Earth Guardian keeps their footing; recycled energy shrugs the blow off.
    if (this.host.hasTrait('steadfast')) {
      this.host.floatScore(player.x, player.y - 30, 'Pijakan kokoh!', '#fde68a');
      return;
    }
    if (this.charged) {
      this.host.floatScore(player.x, player.y - 30, 'Energi menahan!', '#bbf7d0');
      return;
    }

    this.host.floatScore(player.x, player.y - 30, 'Terhantam!', '#fecaca');
    this.host.damagePlayer(this.sprite.x);
  }

  // ── Recycle loop ───────────────────────────────────────────

  private get requiredType(): TrashType {
    return this.def.phases[Math.min(this.phaseIndex, this.def.phases.length - 1)];
  }

  private spawnArenaTrash(forceRequired: boolean): void {
    const type = forceRequired
      ? this.requiredType
      : TRASH_TYPES[Math.floor(Math.random() * TRASH_TYPES.length)];

    // Drop it into the sorting half of the arena, in front of the machine.
    const lo = this.def.arenaStart + 100;
    const hi = this.def.arenaStart + (this.def.arenaEnd - this.def.arenaStart) * 0.5;
    const x = lo + Math.random() * Math.max(1, hi - lo);

    this.dropTrash(type, x, GROUND_Y - 260);
  }

  /** Drops a collectable piece of trash into the arena at `x`/`y`. */
  private dropTrash(type: TrashType, x: number, y: number): void {
    const sprite = this.scene.physics.add.sprite(x, y, `trash_${type}`) as BossTrashSprite;
    sprite.trashType = type;
    sprite.taken = false;
    sprite.setDepth(26);

    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setGravityY(GRAVITY * 0.4);
    sprite.setBounce(0.35);
    sprite.setDragX(120);
    sprite.setVelocityX((Math.random() - 0.5) * 60);

    // A falling marker so the player can see where the piece will land.
    const marker = this.scene.add.circle(x, GROUND_Y - 6, 14, 0xfacc15, 0.35);
    marker.setDepth(16);
    this.scene.tweens.add({
      targets: marker,
      alpha: 0,
      scale: 0.4,
      duration: 900,
      onComplete: () => marker.destroy(),
    });

    this.scene.tweens.add({
      targets: sprite,
      angle: 360,
      duration: 1400,
      repeat: -1,
    });

    this.trashGroup.add(sprite);
  }

  handleTrashPickup(obj: Phaser.Physics.Arcade.Sprite): void {
    const sprite = obj as BossTrashSprite;
    if (sprite.taken || !this.engaged || this.defeated || !this.host.isPlaying()) return;
    if (this.carriedType !== null || this.charged) return;

    sprite.taken = true;
    sprite.body!.enable = false;
    this.carriedType = sprite.trashType;

    const colors = TRASH_COLORS[sprite.trashType];
    sound.playCollect();
    this.host.burst(sprite.x, sprite.y, parseInt(colors.main.slice(1), 16), 8);
    this.host.floatScore(sprite.x, sprite.y - 14, `Ambil ${colors.label}`, colors.light);
    this.host.award({ score: 50, xp: XP_REWARDS.trash, coins: COIN_REWARDS.trash, trashPickup: true });

    sprite.destroy();
    this.showCarriedIcon(this.carriedType);
  }

  private showCarriedIcon(type: TrashType): void {
    this.carriedIcon?.destroy();
    const icon = this.scene.add.image(this.host.player.x, this.host.player.y - 44, `trash_${type}`);
    icon.setDepth(60);
    icon.setScale(0.9);
    this.scene.tweens.add({
      targets: icon,
      scale: { from: 1.4, to: 0.9 },
      duration: 260,
      ease: 'Back.out',
    });
    this.carriedIcon = icon;
  }

  private updateCarriedIcon(): void {
    if (!this.carriedIcon) return;
    const player = this.host.player;
    this.carriedIcon.setPosition(player.x, player.y - 44 + Math.sin(this.scene.time.now / 220) * 3);
  }

  private clearCarried(): void {
    this.carriedIcon?.destroy();
    this.carriedIcon = null;
    this.carriedType = null;
  }

  handleMachineContact(): void {
    if (!this.engaged || this.defeated || !this.host.isPlaying()) return;

    const now = this.scene.time.now;
    if (now < this.machineBusyUntil) return;

    if (this.carriedType === null) {
      if (now - this.lastHintAt > 1600) {
        this.lastHintAt = now;
        const label = TRASH_COLORS[this.requiredType].label;
        this.host.floatScore(this.machine.x, this.machine.y - 90, `Butuh ${label}!`, '#fde047');
      }
      return;
    }

    if (this.carriedType !== this.requiredType) {
      this.rejectWrongCategory();
      return;
    }

    this.recycleCarried();
  }

  private rejectWrongCategory(): void {
    const wrongType = this.carriedType!;
    const wrong = TRASH_COLORS[wrongType].label;
    const needed = TRASH_COLORS[this.requiredType].label;
    this.machineBusyUntil = this.scene.time.now + 350;

    sound.playReject();
    this.machine.setTint(0xef4444);
    this.scene.time.delayedCall(400, () => this.machine.clearTint());
    this.host.burst(this.machine.x, this.machine.y - 40, 0xef4444, 10);
    this.host.floatScore(this.machine.x, this.machine.y - 100, `${wrong} salah! Cari ${needed}`, '#fca5a5');

    // Hand the item back instead of destroying it — sorting wrong should teach,
    // not punish with a walk back across the arena.
    this.clearCarried();
    this.dropTrash(wrongType, this.machine.x + 70, GROUND_Y - 120);
  }

  private recycleCarried(): void {
    const type = this.carriedType!;
    const colors = TRASH_COLORS[type];
    this.machineBusyUntil = this.scene.time.now + BOSS_MACHINE_CYCLE_MS + 200;
    this.clearCarried();

    sound.playMachine();
    this.host.burst(this.machine.x, this.machine.y - 50, parseInt(colors.main.slice(1), 16), 12);
    this.host.floatScore(this.machine.x, this.machine.y - 100, `${colors.label} didaur ulang!`, colors.light);

    this.scene.tweens.add({
      targets: this.machine,
      scaleY: { from: 1, to: 0.9 },
      duration: 110,
      yoyo: true,
      repeat: 2,
    });

    this.scene.time.delayedCall(BOSS_MACHINE_CYCLE_MS, () => {
      if (this.defeated || !this.host.isPlaying()) return;
      this.spawnEnergyOrb();
    });
  }

  private spawnEnergyOrb(): void {
    const orb = this.scene.physics.add.sprite(this.machine.x, this.machine.y - 70, 'energy_orb');
    orb.setDepth(35);
    (orb.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    orb.setImmovable(true);

    sound.playEnergy();
    this.host.burst(orb.x, orb.y, 0x4ade80, 14);
    this.host.floatScore(orb.x, orb.y - 24, 'Energi Daur Ulang!', '#bbf7d0');

    // Only a scale pulse — a positional bob would fight the magnet in
    // updateOrbMagnet() and leave the orb hovering out of reach.
    this.scene.tweens.add({
      targets: orb,
      scale: { from: 0.8, to: 1.2 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.orbGroup.add(orb);
  }

  /**
   * Fresh orbs home in on the player rather than sitting where they spawned —
   * fetching them across the arena was pure travel time, not a decision.
   */
  private updateOrbMagnet(delta: number): void {
    if (this.defeated || this.orbGroup.getLength() === 0) return;
    const player = this.host.player;
    const step = (BOSS_ORB_MAGNET_SPEED * delta) / 1000;

    this.orbGroup.getChildren().slice().forEach((obj) => {
      const orb = obj as Phaser.Physics.Arcade.Sprite;
      if (!orb.active) return;
      const dist = Phaser.Math.Distance.Between(orb.x, orb.y, player.x, player.y);
      if (dist <= 26) {
        this.handleOrbPickup(orb);
        return;
      }
      const angle = Phaser.Math.Angle.Between(orb.x, orb.y, player.x, player.y);
      orb.setPosition(orb.x + Math.cos(angle) * step, orb.y + Math.sin(angle) * step);
    });
  }

  handleOrbPickup(orb: Phaser.Physics.Arcade.Sprite): void {
    if (this.defeated || !this.host.isPlaying() || !orb.active) return;

    this.chargeUntil = this.scene.time.now + BOSS_ENERGY_DURATION_MS;
    this.clearCarried();

    sound.playEnergy();
    this.host.burst(orb.x, orb.y, 0x22c55e, 20);
    this.scene.tweens.killTweensOf(orb);
    orb.destroy();
    this.setCharged(true);
  }

  /**
   * Hurls the recycled energy at the king from wherever the player stands.
   * Ramming him still works, but nobody should have to close the distance.
   */
  throwOrb(): void {
    if (!this.charged || this.defeated || !this.host.isPlaying()) return;

    const player = this.host.player;
    const shot = this.scene.physics.add.sprite(player.x, player.y - 10, 'energy_orb');
    shot.setDepth(35);
    (shot.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    this.scene.tweens.add({
      targets: shot,
      scale: { from: 0.7, to: 1.15 },
      duration: 260,
      yoyo: true,
      repeat: -1,
    });

    // Join the group *before* aiming: Arcade group.add() resets body velocity,
    // so setting it first would leave the orb hanging in mid-air.
    this.energyShotGroup.add(shot);
    const angle = Phaser.Math.Angle.Between(shot.x, shot.y, this.sprite.x, this.sprite.y - 60);
    shot.setVelocity(Math.cos(angle) * BOSS_ORB_SPEED, Math.sin(angle) * BOSS_ORB_SPEED);

    this.setCharged(false);
    sound.playEnergy();
    this.host.burst(shot.x, shot.y, 0x4ade80, 12);
    this.host.floatScore(player.x, player.y - 48, 'Energi dilempar!', '#bbf7d0');

    // A miss must not cost the phase — the machine hands out a replacement.
    this.scene.time.delayedCall(ENERGY_SHOT_LIFETIME_MS, () => {
      if (!shot.active) return;
      this.host.burst(shot.x, shot.y, 0x4ade80, 8);
      shot.destroy();
      if (this.defeated || !this.host.isPlaying()) return;
      this.host.floatScore(this.machine.x, this.machine.y - 100, 'Meleset — energi diisi ulang', '#fde047');
      this.spawnEnergyOrb();
    });
  }

  private attachAura(): void {
    this.aura?.destroy();
    const aura = this.scene.add.circle(this.host.player.x, this.host.player.y, 34, 0x4ade80, 0.35);
    aura.setDepth(12);
    this.scene.tweens.add({
      targets: aura,
      scale: { from: 0.85, to: 1.2 },
      alpha: { from: 0.4, to: 0.15 },
      duration: 480,
      yoyo: true,
      repeat: -1,
    });
    this.aura = aura;
  }

  private updateCharge(now: number): void {
    if (!this.charged) return;
    const player = this.host.player;
    this.aura?.setPosition(player.x, player.y);

    if (now >= this.chargeUntil) {
      this.setCharged(false);
      sound.playReject();
      this.host.floatScore(player.x, player.y - 40, 'Energi memudar…', '#fca5a5');
      // Losing the charge costs time, never progress: the machine reissues it.
      if (!this.defeated && this.host.isPlaying()) {
        this.host.floatScore(this.machine.x, this.machine.y - 100, 'Mesin mengisi ulang energi', '#fde047');
        this.spawnEnergyOrb();
      }
    }
  }

  // ── Damage exchange ────────────────────────────────────────

  handleBossContact(): void {
    if (this.defeated || !this.host.isPlaying()) return;

    // Carrying recycled energy: touching him spends it instead of costing a life.
    if (this.charged) {
      this.damageBoss();
      return;
    }
    if (!this.host.isInvincible()) {
      this.host.damagePlayer(this.sprite.x);
    }
  }

  handleProjectileContact(proj: Phaser.Physics.Arcade.Sprite): void {
    if (!proj.active || !this.host.isPlaying()) return;
    this.splatProjectile(proj);
    if (this.charged) {
      this.host.floatScore(this.host.player.x, this.host.player.y - 30, 'Energi menahan!', '#bbf7d0');
      return;
    }
    if (!this.host.isInvincible()) {
      this.host.damagePlayer(proj.x);
    }
  }

  /** An orb the player threw connects with the king. */
  handleEnergyShotHit(shot: Phaser.Physics.Arcade.Sprite): void {
    // Guard the identity as well as the state: destroying the wrong sprite here
    // would delete the boss itself.
    if (!shot?.active || !this.energyShotGroup.contains(shot)) return;
    if (this.defeated || !this.host.isPlaying()) return;
    shot.destroy();
    this.damageBoss();
  }

  private damageBoss(): void {
    this.setCharged(false);

    this.hp = Math.max(0, this.hp - 1);
    this.phaseIndex = Math.min(this.phaseIndex + 1, this.def.phases.length - 1);
    this.stunUntil = this.scene.time.now + BOSS_STUN_MS;
    this.nextThrowAt = this.stunUntil + 400;
    this.nextSlamAt = this.stunUntil + BOSS_SLAM_INTERVAL_MS;

    sound.playBossHit();
    this.scene.cameras.main.shake(360, 0.016);
    this.scene.cameras.main.flash(180, 120, 255, 140);
    this.host.burst(this.sprite.x, this.sprite.y - 70, 0x4ade80, 26);
    this.host.floatScore(this.sprite.x, this.sprite.y - 170, `SERANGAN DAUR ULANG! +${BOSS_PHASE_SCORE}`, '#bbf7d0');
    this.host.award({ score: BOSS_PHASE_SCORE, xp: XP_REWARDS.enemy * 2, coins: COIN_REWARDS.enemy * 2 });

    // Shove the player clear so they do not immediately eat contact damage.
    const knock = this.host.player.x < this.sprite.x ? -1 : 1;
    this.host.player.setVelocityX(knock * 260);
    this.host.bouncePlayer(-320);

    this.sprite.setTint(0x86efac);
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + knock * -26,
      duration: 90,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.sprite.clearTint(),
    });

    this.hud.setHp(this.hp);

    if (this.hp <= 0) {
      this.defeat();
    } else {
      const nextLabel = TRASH_COLORS[this.requiredType].label;
      this.host.banner(`FASE ${this.def.phases.length - this.hp + 1} — Butuh ${nextLabel}!`, '#fde047');
      this.clearArenaTrash();
      for (let i = 0; i < 3; i++) this.spawnArenaTrash(i < 2);
      // A breather between phases so mistakes early on do not doom the fight.
      this.host.spawnHealthPickup(this.def.machineX + 140, GROUND_Y - 120);
    }
  }

  private clearArenaTrash(): void {
    this.trashGroup.getChildren().slice().forEach((t) => t.destroy());
  }

  private defeat(): void {
    this.defeated = true;
    this.engaged = false;
    this.slamPhase = 'idle';
    this.sprite.setVelocity(0, 0);
    (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;

    this.clearCarried();
    this.clearArenaTrash();
    this.projectileGroup.getChildren().slice().forEach((p) => p.destroy());
    this.orbGroup.getChildren().slice().forEach((o) => o.destroy());
    this.energyShotGroup.getChildren().slice().forEach((s) => s.destroy());
    this.setCharged(false);

    sound.playBossDefeat();
    this.scene.cameras.main.shake(700, 0.02);
    this.hud.setHp(0);
    this.host.banner(`${this.def.name.toUpperCase()} DIKALAHKAN!`, '#bbf7d0');
    this.host.floatScore(this.sprite.x, this.sprite.y - 180, `+${BOSS_DEFEAT_SCORE}`, '#fde047');
    this.host.award({
      score: BOSS_DEFEAT_SCORE,
      xp: XP_REWARDS.levelComplete,
      coins: COIN_REWARDS.levelComplete,
    });

    // The king collapses back into the recyclables he was made of.
    for (let i = 0; i < 24; i++) {
      const type = TRASH_TYPES[i % TRASH_TYPES.length];
      const piece = this.scene.add.image(
        this.sprite.x + (Math.random() - 0.5) * 100,
        this.sprite.y - 40 - Math.random() * 110,
        `trash_${type}`
      );
      piece.setDepth(30);
      this.scene.tweens.add({
        targets: piece,
        x: piece.x + (Math.random() - 0.5) * 260,
        y: GROUND_Y - 10,
        angle: (Math.random() - 0.5) * 720,
        alpha: 0,
        duration: 900 + Math.random() * 600,
        delay: i * 25,
        ease: 'Cubic.in',
        onComplete: () => piece.destroy(),
      });
    }

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleY: 0.15,
      y: this.sprite.y + 40,
      duration: 1200,
      delay: 400,
      ease: 'Cubic.in',
      onComplete: () => this.sprite.destroy(),
    });

    this.scene.time.delayedCall(1400, () => this.hud.hide());
    this.onDefeated();
  }

  // ── HUD text ───────────────────────────────────────────────

  private updateHudTask(now: number): void {
    if (!this.engaged || this.defeated) return;

    if (this.charged) {
      const left = Math.max(0, Math.ceil((this.chargeUntil - now) / 1000));
      this.hud.setTask(`ENERGI SIAP — LEMPAR KE BOSS! (${left}s)`, '#bbf7d0');
      return;
    }
    if (this.orbGroup.getLength() > 0) {
      this.hud.setTask('Bola Energi Daur Ulang menuju kamu!', '#86efac');
      return;
    }

    const needed = TRASH_COLORS[this.requiredType];
    if (this.carriedType === this.requiredType) {
      this.hud.setTask(`Bawa ${needed.label} ke Mesin Daur Ulang!`, needed.light);
      return;
    }
    if (this.carriedType !== null) {
      this.hud.setTask(`Salah kategori! Yang dibutuhkan: ${needed.label}`, '#fca5a5');
      return;
    }
    this.hud.setTask(`Kumpulkan sampah ${needed.label.toUpperCase()}`, needed.light);
  }

  isDefeated(): boolean {
    return this.defeated;
  }

  /** True while the player is holding recycled energy ready to throw. */
  isCharged(): boolean {
    return this.charged;
  }
}
