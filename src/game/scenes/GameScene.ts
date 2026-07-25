import Phaser from 'phaser';
import { LEVELS, ACHIEVEMENTS } from '../levels';
import {
  GAME_HEIGHT,
  JUMP_VELOCITY,
  DOUBLE_JUMP_VELOCITY,
  GRAVITY,
  MOVE_SPEED,
  MAX_FALL_SPEED,
  MAX_JUMP_SPEED,
  COYOTE_TIME_MS,
  JUMP_BUFFER_MS,
  TRASH_SCORE,
  ENEMY_SCORE,
  SECRET_SCORE,
  LEVEL_BONUS,
  ALL_TRASH_BONUS,
  ALL_SECRETS_BONUS,
  INVINCIBILITY_MS,
  BOUNCE_VELOCITY,
  KNOCKBACK_VELOCITY,
  SCREEN_SHAKE_DURATION,
  SCREEN_SHAKE_INTENSITY,
  THEME_COLORS,
  TRASH_COLORS,
  BOOST_COLORS,
  BOOST_DURATIONS,
  COMBO_WINDOW_MS,
  COMBO_MAX,
  TIME_BONUS_PCT,
} from '../constants';
import { XP_REWARDS, COIN_REWARDS, LEVEL_CHALLENGES, getRankForXp, getSkinById } from '../progression';
import {
  ECO_POWER_MAX,
  ECO_POWER_GAIN,
  getSkill,
  type SkillDef,
} from '../skills';
import type {
  LevelDef,
  GameStats,
  LevelResult,
  GameCallbacks,
  BoostType,
} from '../types';
import { getDecorationKey } from '../textures';
import * as sound from '../sound';
import type { AwardOptions, EntityHost } from '../entities/EntityHost';
import { GiantFlyManager } from '../entities/GiantFlyManager';
import { ToxicWasteManager } from '../entities/ToxicWasteManager';
import { TrashKingBoss } from '../entities/TrashKingBoss';

interface EnemySprite extends Phaser.Physics.Arcade.Sprite {
  enemyData: {
    startX: number;
    range: number;
    alive: boolean;
    defeatedTimer: number;
  };
}

interface TrashSprite extends Phaser.Physics.Arcade.Sprite {
  trashData: { type: string; collected: boolean; baseY: number; phase: number };
}

interface SecretSprite extends Phaser.Physics.Arcade.Sprite {
  secretData: { type: string; collected: boolean };
}

export class GameScene extends Phaser.Scene implements EntityHost {
  private callbacks!: GameCallbacks;
  private level!: LevelDef;
  private levelIndex = 0;
  private carriedStats!: Partial<GameStats>;
  private stats!: GameStats;
  private xpInLevel = 0;
  private coinsInLevel = 0;
  private challengeWarningShown = false;
  private floodWave: Phaser.GameObjects.Rectangle | null = null;
  private floodActive = false;
  private floodTimer = 0;
  private smogOverlay: Phaser.GameObjects.Rectangle | null = null;
  private smogCycleTimer = 0;
  private smogActive = false;
  private windParticles: Phaser.GameObjects.Graphics | null = null;
  private windTimer = 0;
  private windActive = false;
  private windGustEnd = 0;
  private baseEnemySpeed = 80;

  public player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyJump!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private trashGroup!: Phaser.Physics.Arcade.Group;
  private secretGroup!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private healthGroup!: Phaser.Physics.Arcade.Group;
  private goal!: Phaser.Physics.Arcade.Sprite;
  private goalFlag: Phaser.GameObjects.Image | null = null;
  private goalLock: Phaser.GameObjects.Text | null = null;

  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bgClouds: Phaser.GameObjects.Image[] = [];
  private decorations: Phaser.GameObjects.Image[] = [];

  private movingPlatformGroup!: Phaser.Physics.Arcade.Group;
  private flyingEnemyGroup!: Phaser.Physics.Arcade.Group;
  private boostGroup!: Phaser.Physics.Arcade.Group;

  private giantFlies: GiantFlyManager | null = null;
  private toxicWaste: ToxicWasteManager | null = null;
  private boss: TrashKingBoss | null = null;
  private bossDefeated = false;
  private goalLockHintAt = 0;

  private state: 'playing' | 'won' | 'lost' = 'playing';
  private invincibleUntil = 0;
  private mobileInput = { left: false, right: false, jump: false };
  private jumpHeld = false;
  private jumpsLeft = 2;
  private lastGroundedTime = 0;
  private jumpBufferTime = 0;
  private goalReached = false;
  private levelStartTime = 0;
  private livesAtLevelStart = 3;
  private unlockedAchievements = new Set<string>();
  private trashCollectedInLevel = 0;
  private enemiesDefeatedInLevel = 0;
  private flyingEnemiesDefeatedInLevel = 0;
  private secretsFoundInLevel = 0;
  private combo = 0;
  private maxCombo = 0;
  private lastCollectTime = 0;
  private timeTarget = false;
  private timeTargetMs = 0;
  private activeEffects: Array<'magnet' | 'shield' | 'jump'> = [];
  private effectTimers: Record<string, number> = {};
  private bgGraphics!: Phaser.GameObjects.Graphics;

  // ── Eco Power / Skill system ──────────────────────────────
  private skinId = 'default';
  private skill!: SkillDef;
  private ecoPower = 0;
  private skillReady = false;
  private skillUsed = false;
  private keySkill?: Phaser.Input.Keyboard.Key;
  private skillHeld = false;
  /** While > time.now the Wind skill keeps the player aloft. */
  private flightUntil = 0;
  private flying = false;

  constructor() {
    super('GameScene');
  }

  init(data: {
    levelIndex: number;
    callbacks: GameCallbacks;
    carriedStats?: Partial<GameStats>;
    skinId?: string;
  }): void {
    this.levelIndex = data.levelIndex;
    this.callbacks = data.callbacks;
    this.carriedStats = data.carriedStats ?? {};
    this.skinId = data.skinId ?? 'default';
    const skin = getSkinById(this.skinId) ?? getSkinById('default')!;
    this.skill = getSkill(skin.skill);
    this.ecoPower = 0;
    this.skillReady = false;
    this.skillUsed = false;
    this.skillHeld = false;
    this.flightUntil = 0;
    this.flying = false;
    this.state = 'playing';
    this.goalReached = false;
    this.goalFlag = null;
    this.goalLock = null;
    this.trashCollectedInLevel = 0;
    this.enemiesDefeatedInLevel = 0;
    this.flyingEnemiesDefeatedInLevel = 0;
    this.secretsFoundInLevel = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lastCollectTime = 0;
    this.unlockedAchievements = new Set();
    this.xpInLevel = 0;
    this.coinsInLevel = 0;
    this.challengeWarningShown = false;
    this.floodActive = false;
    this.floodTimer = 3000;
    this.smogCycleTimer = 4000;
    this.smogActive = false;
    this.windTimer = 2000;
    this.windActive = false;
    this.windGustEnd = 0;
    this.activeEffects = [];
    this.effectTimers = {};
    this.giantFlies = null;
    this.toxicWaste = null;
    this.boss = null;
    this.bossDefeated = false;
    this.goalLockHintAt = 0;
  }

  create(): void {
    this.level = LEVELS[this.levelIndex];
    const theme = THEME_COLORS[this.level.theme];

    this.stats = {
      score: this.carriedStats.score ?? 0,
      lives: this.carriedStats.lives ?? 3,
      currentLevel: this.level.id,
      trashCollected: this.carriedStats.trashCollected ?? 0,
      factsLearned: this.carriedStats.factsLearned ?? 0,
      enemiesDefeated: this.carriedStats.enemiesDefeated ?? 0,
      flyingEnemiesDefeated: this.carriedStats.flyingEnemiesDefeated ?? 0,
      secretsFound: this.carriedStats.secretsFound ?? 0,
      xpGained: this.carriedStats.xpGained ?? 0,
      coinsGained: this.carriedStats.coinsGained ?? 0,
      combo: 0,
      timeSeconds: 0,
    };
    this.livesAtLevelStart = this.stats.lives;
    this.levelStartTime = this.time.now;
    this.timeTarget = typeof this.level.timeTarget === 'number';
    this.timeTargetMs = this.level.timeTarget ?? 0;

    this.physics.world.setBounds(0, 0, this.level.width, GAME_HEIGHT + 200);
    this.cameras.main.setBounds(0, 0, this.level.width, GAME_HEIGHT);
    this.cameras.main.fadeIn(300);

    this.drawBackground(theme);
    this.createPlatforms();
    this.createMovingPlatforms();
    this.createTrash();
    this.createSecrets();
    this.createEnemies();
    this.createFlyingEnemies();
    this.createHealthPickups();
    this.createBoosts();
    this.createGoal();
    this.createPlayer();
    this.createParticles();
    this.createHazards();
    this.setupInput();
    this.setupCamera();
    this.setupColliders();

    this.emitEcoPower();

    sound.startMusic();
    this.events.on('shutdown', () => {
      sound.stopMusic();
      this.bgClouds = [];
      this.decorations = [];
    });
  }

  // ── Background ─────────────────────────────────────────────

  private drawBackground(theme: typeof THEME_COLORS['park']): void {
    const g = this.add.graphics();
    g.fillGradientStyle(
      parseInt(theme.skyTop.slice(1), 16),
      parseInt(theme.skyTop.slice(1), 16),
      parseInt(theme.skyBottom.slice(1), 16),
      parseInt(theme.skyBottom.slice(1), 16),
      1
    );
    g.fillRect(0, 0, this.level.width, GAME_HEIGHT);
    g.setScrollFactor(0.1);
    this.bgGraphics = g;

    // Parallax hills
    const hillBack = this.add.graphics();
    hillBack.fillStyle(parseInt(theme.hillBack.slice(1), 16), 1);
    for (let i = 0; i < Math.ceil(this.level.width / 400) + 2; i++) {
      hillBack.fillCircle(i * 400, GAME_HEIGHT - 80, 130);
    }
    hillBack.setScrollFactor(0.3);

    const hillFront = this.add.graphics();
    hillFront.fillStyle(parseInt(theme.hillFront.slice(1), 16), 1);
    for (let i = 0; i < Math.ceil(this.level.width / 500) + 2; i++) {
      hillFront.fillCircle(i * 500 + 200, GAME_HEIGHT - 80, 90);
    }
    hillFront.setScrollFactor(0.5);

    // Clouds
    for (let i = 0; i < 8; i++) {
      const cloud = this.add.image(
        Math.random() * this.level.width,
        30 + Math.random() * 100,
        'cloud'
      );
      cloud.setScrollFactor(0.2);
      cloud.setAlpha(0.7 + Math.random() * 0.3);
      cloud.setScale(0.6 + Math.random() * 0.6);
      this.bgClouds.push(cloud);
    }

    // Decorations (trees, palms, reeds, mounds)
    const decorKey = getDecorationKey(this.level.theme);
    for (let i = 0; i < Math.ceil(this.level.width / 250); i++) {
      const x = i * 250 + 100 + Math.random() * 50;
      const decor = this.add.image(x, GAME_HEIGHT - 80, decorKey);
      decor.setScrollFactor(0.7);
      decor.setScale(0.8 + Math.random() * 0.4);
      this.decorations.push(decor);
    }
  }

  // ── Platforms ──────────────────────────────────────────────

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    const theme = THEME_COLORS[this.level.theme];

    // Ground
    const groundG = this.add.graphics();
    groundG.fillStyle(parseInt(theme.groundDark.slice(1), 16), 1);
    groundG.fillRect(0, GAME_HEIGHT - 80, this.level.width, 80);
    groundG.fillStyle(parseInt(theme.ground.slice(1), 16), 1);
    groundG.fillRect(0, GAME_HEIGHT - 80, this.level.width, 10);
    groundG.fillStyle(0xffffff, 0.1);
    groundG.fillRect(0, GAME_HEIGHT - 80, this.level.width, 2);

    const ground = this.platforms.create(this.level.width / 2, GAME_HEIGHT - 40, '__white') as Phaser.Physics.Arcade.Sprite;
    ground.setDisplaySize(this.level.width, 80);
    ground.setOrigin(0.5, 0.5);
    ground.refreshBody();
    ground.setVisible(false);

    // Brick platforms
    for (const p of this.level.platforms) {
      const bg = this.add.graphics();
      bg.fillStyle(parseInt(theme.platformDark.slice(1), 16), 1);
      bg.fillRect(p.x, p.y + 4, p.width, p.height);
      bg.fillStyle(parseInt(theme.platform.slice(1), 16), 1);
      bg.fillRect(p.x, p.y, p.width, p.height - 6);
      bg.fillStyle(0xffffff, 0.15);
      bg.fillRect(p.x, p.y, p.width, 4);

      const plat = this.platforms.create(p.x + p.width / 2, p.y + p.height / 2, '__white') as Phaser.Physics.Arcade.Sprite;
      plat.setDisplaySize(p.width, p.height);
      plat.setOrigin(0.5, 0.5);
      plat.refreshBody();
      plat.setVisible(false);
    }
  }

  // ── Trash ──────────────────────────────────────────────────

  private createTrash(): void {
    this.trashGroup = this.physics.add.group();

    for (const t of this.level.trash) {
      const sprite = this.physics.add.sprite(t.x, t.y, `trash_${t.type}`) as TrashSprite;
      sprite.trashData = {
        type: t.type,
        collected: false,
        baseY: t.y,
        phase: Math.random() * Math.PI * 2,
      };
      sprite.setCollideWorldBounds(false);
      (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      sprite.setImmovable(true);
      this.tweens.add({
        targets: sprite,
        y: t.y - 6,
        duration: 1200 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.trashGroup.add(sprite);
    }
  }

  // ── Secrets ────────────────────────────────────────────────

  private createSecrets(): void {
    this.secretGroup = this.physics.add.group();

    for (const s of this.level.secrets) {
      const sprite = this.physics.add.sprite(s.x, s.y, `secret_${s.type}`) as SecretSprite;
      sprite.secretData = { type: s.type, collected: false };
      (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      sprite.setImmovable(true);
      sprite.setAlpha(0.85);
      this.tweens.add({
        targets: sprite,
        scale: 1.2,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      // Glow effect
      this.tweens.add({
        targets: sprite,
        alpha: { from: 0.6, to: 1 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
      this.secretGroup.add(sprite);
    }
  }

  // ── Enemies ────────────────────────────────────────────────

  private createEnemies(): void {
    this.enemyGroup = this.physics.add.group();

    for (const e of this.level.enemies) {
      const sprite = this.physics.add.sprite(e.x, e.y, 'enemy0') as EnemySprite;
      sprite.enemyData = {
        startX: e.x,
        range: e.range,
        alive: true,
        defeatedTimer: 0,
      };
      sprite.setCollideWorldBounds(true);
      sprite.setBounce(0);
      sprite.setGravityY(GRAVITY);
      sprite.setVelocityX(this.baseEnemySpeed);
      this.enemyGroup.add(sprite);
    }
  }

  // ── Health Pickups ───────────────────────────────────────────

  private createHealthPickups(): void {
    this.healthGroup = this.physics.add.group();
    const pickups = this.level.healthPickups ?? [];
    for (const h of pickups) {
      const sprite = this.physics.add.sprite(h.x, h.y, 'heart') as Phaser.Physics.Arcade.Sprite;
      (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      sprite.setImmovable(true);
      this.tweens.add({
        targets: sprite,
        y: h.y - 8,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.tweens.add({
        targets: sprite,
        alpha: { from: 0.7, to: 1 },
        scale: { from: 0.9, to: 1.1 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
      this.healthGroup.add(sprite);
    }
  }

  private collectHealth(sprite: Phaser.Physics.Arcade.Sprite): void {
    if (this.stats.lives >= 5) {
      this.floatScore(sprite.x, sprite.y - 10, 'Darah Penuh!', '#fca5a5');
      return;
    }
    this.stats.lives = Math.min(5, this.stats.lives + 1);
    sound.playCollect();
    this.burst(sprite.x, sprite.y, 0xef4444, 14);
    this.floatScore(sprite.x, sprite.y - 10, '+1 Darah', '#fca5a5');
    sprite.destroy();
    this.emitStats();
  }

  // ── Goal ───────────────────────────────────────────────────

  private createGoal(): void {
    const goalX = this.level.goal.x;
    const goalY = this.level.goal.y;

    this.goal = this.physics.add.sprite(goalX, goalY - 40, 'goal_pole');
    (this.goal.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.goal.setImmovable(true);

    const flag = this.add.image(goalX + 3, goalY - 75, 'goal_flag');
    flag.setOrigin(0, 0.5);
    this.goalFlag = flag;
    this.tweens.add({
      targets: flag,
      x: goalX + 8,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Glow
    const glow = this.add.circle(goalX, goalY - 40, 35, 0xfacc15, 0.2);
    this.tweens.add({
      targets: glow,
      radius: 45,
      alpha: 0.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // A boss level keeps the flag sealed until the king falls.
    if (this.level.boss) {
      this.goal.setTint(0x64748b);
      flag.setTint(0x64748b);

      const lock = this.add.text(goalX, goalY - 110, '🔒 KALAHKAN BOSS', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#fca5a5',
        fontStyle: 'bold',
      });
      lock.setOrigin(0.5);
      lock.setShadow(2, 2, 'rgba(0,0,0,0.8)', 3);
      lock.setDepth(40);
      this.tweens.add({
        targets: lock,
        alpha: { from: 0.5, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
      this.goalLock = lock;
    }
  }

  // ── Player ─────────────────────────────────────────────────

  private createPlayer(): void {
    const start = this.level.playerStart;
    this.player = this.physics.add.sprite(start.x, start.y, 'player_idle');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0);
    this.player.setGravityY(GRAVITY);
    this.player.setSize(22, 38);
    this.player.setOffset(7, 14);
    this.player.setMaxVelocity(MAX_JUMP_SPEED, MAX_FALL_SPEED);

    this.anims.create({
      key: 'idle',
      frames: [{ key: 'player_idle' }],
      frameRate: 1,
      repeat: -1,
    });
    this.anims.create({
      key: 'run',
      frames: [
        { key: 'player_run1' },
        { key: 'player_idle' },
        { key: 'player_run2' },
        { key: 'player_idle' },
      ],
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'jump',
      frames: [{ key: 'player_jump' }],
      frameRate: 1,
      repeat: -1,
    });

    this.player.play('idle');
  }

  // ── Moving Platforms ──────────────────────────────────────

  private createMovingPlatforms(): void {
    this.movingPlatformGroup = this.physics.add.group();
    const theme = THEME_COLORS[this.level.theme];
    const defs = this.level.movingPlatforms ?? [];
    for (const p of defs) {
      const centerX = p.x + p.width / 2;
      const centerY = p.y + p.height / 2;

      // Drawn around a local origin so the visual can travel with the body.
      const bg = this.add.graphics();
      bg.fillStyle(parseInt(theme.platformDark.slice(1), 16), 1);
      bg.fillRect(-p.width / 2, -p.height / 2 + 4, p.width, p.height);
      bg.fillStyle(parseInt(theme.platform.slice(1), 16), 1);
      bg.fillRect(-p.width / 2, -p.height / 2, p.width, p.height - 6);
      bg.fillStyle(0xffffff, 0.15);
      bg.fillRect(-p.width / 2, -p.height / 2, p.width, 4);
      bg.setPosition(centerX, centerY);
      bg.setDepth(14);

      const plat = this.movingPlatformGroup.create(centerX, centerY, '__white') as Phaser.Physics.Arcade.Sprite;
      plat.setDisplaySize(p.width, p.height);
      plat.setOrigin(0.5, 0.5);
      plat.refreshBody();
      plat.setVisible(false);
      plat.setImmovable(true);
      const body = plat.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      // Driven by position in updateMovingPlatforms, so no residual velocity.
      body.setVelocity(0, 0);
      plat.setData('range', p.range);
      plat.setData('startX', centerX);
      plat.setData('speed', p.speed);
      plat.setData('phase', p.phase);
      plat.setData('width', p.width);
      plat.setData('height', p.height);
      plat.setData('prevX', centerX);
      plat.setData('gfx', bg);
    }
  }

  // ── Flying Enemies ────────────────────────────────────────

  private createFlyingEnemies(): void {
    this.flyingEnemyGroup = this.physics.add.group();
    const defs = this.level.flyingEnemies ?? [];
    for (const e of defs) {
      const sprite = this.physics.add.sprite(e.x, e.y, 'enemy_fly') as Phaser.Physics.Arcade.Sprite;
      sprite.setData('startX', e.x);
      sprite.setData('startY', e.y);
      sprite.setData('range', e.range);
      sprite.setData('amplitude', e.amplitude);
      sprite.setData('speed', e.speed);
      sprite.setData('alive', true);
      sprite.setData('halfWidth', 18);
      sprite.setData('halfHeight', 14);
      sprite.setImmovable(true);
      (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      this.flyingEnemyGroup.add(sprite);
    }
  }

  private updateFlyingEnemies(): void {
    this.flyingEnemyGroup.getChildren().forEach((obj) => {
      const sprite = obj as Phaser.Physics.Arcade.Sprite;
      if (!sprite.getData('alive')) return;
      if (!sprite.body) return;
      const startX = sprite.getData('startX') as number;
      const startY = sprite.getData('startY') as number;
      const range = sprite.getData('range') as number;
      const amplitude = sprite.getData('amplitude') as number;
      const speed = sprite.getData('speed') as number;
      const t = this.time.now / 1000;
      const nextX = startX + Math.sin(t * speed + startX) * range;
      const nextY = startY + Math.cos(t * speed + startX) * amplitude;
      if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return;
      sprite.x = nextX;
      sprite.y = nextY;
      sprite.body.updateFromGameObject();
    });
  }

  private collectFlyingEnemy(sprite: Phaser.Physics.Arcade.Sprite): void {
    if (!sprite.getData('alive')) return;
    if (this.state !== 'playing') return;
    sprite.setData('alive', false);
    sprite.body!.enable = false;
    this.stats.score += ENEMY_SCORE;
    this.stats.enemiesDefeated++;
    this.flyingEnemiesDefeatedInLevel++;
    this.xpInLevel += XP_REWARDS.flyingEnemy;
    this.coinsInLevel += COIN_REWARDS.flyingEnemy;
    sound.playStomp();
    this.burst(sprite.x, sprite.y, 0x7e22ce, 10);
    this.floatScore(sprite.x, sprite.y - 10, `+${ENEMY_SCORE}`, '#facc15');
    this.tweens.add({
      targets: sprite,
      alpha: 0,
      scale: 1.4,
      y: sprite.y - 20,
      duration: 400,
      onComplete: () => sprite.destroy(),
    });
    this.player.setVelocityY(BOUNCE_VELOCITY);
    this.addEcoPower(ECO_POWER_GAIN.flyingEnemy);
    this.checkAchievements();
    this.emitStats();
  }

  // ── Hazards & Mini Boss ───────────────────────────────────

  private createHazards(): void {
    const flies = this.level.giantFlies ?? [];
    if (flies.length > 0) {
      this.giantFlies = new GiantFlyManager(this, flies);
    }

    const toxic = this.level.toxicWaste ?? [];
    if (toxic.length > 0) {
      this.toxicWaste = new ToxicWasteManager(this, toxic);
    }

    if (this.level.boss) {
      this.boss = new TrashKingBoss(this, this.level.boss, () => this.onBossDefeated());
    }
  }

  private onBossDefeated(): void {
    this.bossDefeated = true;
    this.unlockGoal();
  }

  private unlockGoal(): void {
    this.goal.clearTint();
    this.goalFlag?.clearTint();
    if (this.goalLock) {
      this.tweens.add({
        targets: this.goalLock,
        alpha: 0,
        scale: 2,
        duration: 500,
        onComplete: () => {
          this.goalLock?.destroy();
          this.goalLock = null;
        },
      });
    }
    this.time.delayedCall(1800, () => {
      if (this.state === 'playing') {
        this.showChallengeWarning('Gerbang terbuka! Menuju bendera!');
      }
    });
  }

  private isGoalLocked(): boolean {
    return !!this.level.boss && !this.bossDefeated;
  }

  // ── EntityHost implementation ─────────────────────────────

  getScene(): Phaser.Scene {
    return this;
  }

  getPlatforms(): Phaser.Physics.Arcade.StaticGroup {
    return this.platforms;
  }

  isPlaying(): boolean {
    return this.state === 'playing';
  }

  isInvincible(): boolean {
    return this.time.now <= this.invincibleUntil;
  }

  /** Damage entry point shared by hazards, the boss and its projectiles. */
  damagePlayer(sourceX: number, knockUpVelocity = -200): void {
    if (this.state !== 'playing') return;
    this.applyDamage(sourceX, knockUpVelocity);
  }

  bouncePlayer(velocity: number = BOUNCE_VELOCITY): void {
    this.player.setVelocityY(velocity);
  }

  banner(text: string, color = '#fbbf24'): void {
    this.showChallengeWarning(text, color);
  }

  award(options: AwardOptions): void {
    if (options.score) this.stats.score += options.score;
    if (options.xp) this.xpInLevel += options.xp;
    if (options.coins) this.coinsInLevel += options.coins;
    if (options.flyingKill) {
      this.stats.flyingEnemiesDefeated++;
      this.stats.enemiesDefeated++;
      this.flyingEnemiesDefeatedInLevel++;
    }
    if (options.trashPickup) {
      this.stats.trashCollected++;
      this.addEcoPower(ECO_POWER_GAIN.trash);
    }
    if (options.flyingKill) {
      this.addEcoPower(ECO_POWER_GAIN.flyingEnemy);
    }
    this.checkAchievements();
    this.emitStats();
  }

  // ── Eco Power / Skill system ──────────────────────────────

  /** Charges the Eco Power meter from a positive action. */
  private addEcoPower(amount: number): void {
    if (this.skillUsed || this.state !== 'playing') return;
    if (this.ecoPower >= ECO_POWER_MAX) return;
    this.ecoPower = Math.min(ECO_POWER_MAX, this.ecoPower + amount);
    if (this.ecoPower >= ECO_POWER_MAX && !this.skillReady) {
      this.skillReady = true;
      this.onSkillReady();
    }
    this.emitEcoPower();
  }

  private emitEcoPower(): void {
    // A torn-down / re-created scene can reach here before init() has run; a
    // HUD update must never crash the game.
    if (!this.callbacks || !this.skill) return;
    this.callbacks.onEcoPowerChange?.({
      power: this.ecoPower,
      max: ECO_POWER_MAX,
      ready: this.skillReady,
      used: this.skillUsed,
      skillName: this.skill.name,
      guardian: this.skill.guardian,
      education: this.skill.education,
      cssColor: this.skill.cssColor,
      icon: this.skill.icon,
    });
  }

  private onSkillReady(): void {
    sound.playSkillReady();
    this.showChallengeWarning(`⚡ Eco Power Siap! ${this.skill.name}`, this.skill.cssColor);
    const glow = this.add.circle(this.player.x, this.player.y, 28, this.skill.color, 0.5);
    glow.setDepth(9);
    this.tweens.add({
      targets: glow,
      radius: 64,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.out',
      onComplete: () => glow.destroy(),
    });
  }

  /** Fires the equipped character's skill (X key / mobile skill button). */
  public activateSkill(): void {
    if (this.state !== 'playing') return;
    if (!this.skillReady || this.skillUsed) return;

    this.skillUsed = true;
    this.skillReady = false;
    this.ecoPower = 0;

    sound.playSkillActivate();
    this.playSkillCinematic();

    switch (this.skill.element) {
      case 'green': this.skillGreenBlast(); break;
      case 'aqua': this.skillRiverWave(); break;
      case 'wind': this.skillCleanWind(); break;
      case 'fire': this.skillRecycleHeat(); break;
      case 'lightning': this.skillEcoScanner(); break;
      case 'earth': this.skillRecycleShield(); break;
    }

    this.time.delayedCall(650, () => {
      if (this.state === 'playing') {
        this.showEducationBanner(this.skill.education, this.skill.cssColor);
      }
    });

    this.checkAchievements();
    this.emitEcoPower();
    this.emitStats();
  }

  private playSkillCinematic(): void {
    const color = this.skill.color;
    const { player } = this;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    this.cameras.main.flash(350, r, g, b);
    this.cameras.main.shake(420, 0.006);

    // Expanding shockwave rings from the hero
    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(player.x, player.y, 18, color, 0);
      ring.setStrokeStyle(6, color, 0.9);
      ring.setDepth(80);
      this.tweens.add({
        targets: ring,
        radius: 230,
        alpha: 0,
        delay: i * 120,
        duration: 720,
        ease: 'Cubic.out',
        onComplete: () => ring.destroy(),
      });
    }

    // Radial burst of light particles
    for (let i = 0; i < 28; i++) {
      const ang = (Math.PI * 2 * i) / 28;
      const dist = 120 + Math.random() * 90;
      const p = this.add.image(player.x, player.y, 'particle');
      p.setTint(i % 2 === 0 ? color : this.skill.colorLight);
      p.setDepth(81);
      p.setScale(0.6 + Math.random() * 0.6);
      this.tweens.add({
        targets: p,
        x: player.x + Math.cos(ang) * dist,
        y: player.y + Math.sin(ang) * dist,
        alpha: 0,
        scale: 0,
        duration: 600 + Math.random() * 300,
        ease: 'Cubic.out',
        onComplete: () => p.destroy(),
      });
    }

    // Hero aura + pulse
    const aura = this.add.circle(player.x, player.y, 32, color, 0.5);
    aura.setDepth(9);
    this.tweens.add({
      targets: aura,
      radius: 72,
      alpha: 0,
      duration: 600,
      onComplete: () => aura.destroy(),
    });
    this.tweens.add({
      targets: player,
      scale: { from: 1.45, to: 1 },
      duration: 500,
      ease: 'Back.out',
    });

    this.floatText(player.x, player.y - 58, `${this.skill.name}!`, this.skill.cssColor);
  }

  // ── Individual skill effects ──────────────────────────────

  private skillGreenBlast(): void {
    const radius = 280;
    this.absorbTrashInRadius(this.player.x, this.player.y, radius);
    this.defeatEnemiesInRadius(this.player.x, this.player.y, radius);
    this.grantShield(this.skill.durationMs);
    this.banner('Perlindungan hijau aktif!', this.skill.cssColor);
  }

  private skillRiverWave(): void {
    let pulled = 0;
    this.trashGroup.getChildren().forEach((obj) => {
      const t = obj as TrashSprite;
      if (t.trashData.collected) return;
      t.trashData.collected = true;
      if (t.body) t.body.enable = false;
      pulled++;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
      this.tweens.add({
        targets: t,
        x: this.player.x,
        y: this.player.y,
        duration: 320 + dist * 0.35,
        ease: 'Cubic.in',
        onComplete: () => this.creditTrash(t),
      });
    });
    this.giantFlies?.purge(this.player.x, this.player.y, 500);
    if (pulled === 0) {
      this.floatText(this.player.x, this.player.y - 40, 'Area sudah bersih!', this.skill.cssColor);
    }
  }

  private skillCleanWind(): void {
    this.flying = true;
    this.flightUntil = this.time.now + this.skill.durationMs;
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    }
    this.player.setVelocityY(-120);

    // Pull nearby light trash (plastic & paper) into the updraft.
    this.trashGroup.getChildren().forEach((obj) => {
      const t = obj as TrashSprite;
      if (t.trashData.collected) return;
      if (t.trashData.type !== 'plastic' && t.trashData.type !== 'paper') return;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y) > 360) return;
      t.trashData.collected = true;
      if (t.body) t.body.enable = false;
      this.tweens.add({
        targets: t,
        x: this.player.x,
        y: this.player.y,
        duration: 400,
        ease: 'Cubic.in',
        onComplete: () => this.creditTrash(t),
      });
    });
    this.banner('Terbang! Tahan Lompat untuk naik', this.skill.cssColor);
  }

  private skillRecycleHeat(): void {
    // Radius 0 => the whole level.
    this.defeatEnemiesInRadius(this.player.x, this.player.y, 0);
    this.banner('Seluruh polusi dikalahkan!', this.skill.cssColor);
  }

  private skillEcoScanner(): void {
    let found = 0;
    this.secretGroup.getChildren().forEach((obj) => {
      const s = obj as SecretSprite;
      if (s.secretData.collected) return;
      found++;
      this.pingLocation(s.x, s.y, this.skill.color);
    });
    this.trashGroup.getChildren().forEach((obj) => {
      const t = obj as TrashSprite;
      if (t.trashData.collected) return;
      this.pingLocation(t.x, t.y, this.skill.colorLight);
    });

    const bonus = 500 + found * 300;
    this.stats.score += bonus;
    this.xpInLevel += XP_REWARDS.secret;
    this.coinsInLevel += COIN_REWARDS.secret;
    this.floatText(this.player.x, this.player.y - 58, `Scan! +${bonus}`, this.skill.cssColor);
    this.emitStats();
  }

  private skillRecycleShield(): void {
    this.grantShield(this.skill.durationMs);
    this.invincibleUntil = Math.max(this.invincibleUntil, this.time.now + this.skill.durationMs);
    this.toxicWaste?.clear(this.player.x, this.player.y, 0);
    this.giantFlies?.purge(this.player.x, this.player.y, 0);
    this.defeatEnemiesInRadius(this.player.x, this.player.y, 260);
    this.banner('Perisai daur ulang aktif — kebal!', this.skill.cssColor);
  }

  // ── Skill helpers ─────────────────────────────────────────

  private grantShield(durationMs: number): void {
    if (!this.activeEffects.includes('shield')) this.activeEffects.push('shield');
    this.effectTimers['shield'] = Math.max(
      this.effectTimers['shield'] ?? 0,
      this.time.now + durationMs
    );
  }

  private absorbTrashInRadius(x: number, y: number, radius: number): void {
    this.trashGroup.getChildren().forEach((obj) => {
      const t = obj as TrashSprite;
      if (t.trashData.collected) return;
      if (radius > 0 && Phaser.Math.Distance.Between(x, y, t.x, t.y) > radius) return;
      t.trashData.collected = true;
      if (t.body) t.body.enable = false;
      this.creditTrash(t);
    });
  }

  /** Awards a piece of trash without touching combo or Eco Power (skill pickup). */
  private creditTrash(sprite: TrashSprite): void {
    const colorHex = TRASH_COLORS[sprite.trashData.type as keyof typeof TRASH_COLORS];
    const color = parseInt(colorHex.main.slice(1), 16);
    this.stats.score += TRASH_SCORE;
    this.stats.trashCollected++;
    this.trashCollectedInLevel++;
    this.xpInLevel += XP_REWARDS.trash;
    this.coinsInLevel += COIN_REWARDS.trash;
    this.burst(sprite.x, sprite.y, color, 8);
    sprite.destroy();
    this.emitStats();
  }

  private defeatEnemiesInRadius(x: number, y: number, radius: number): void {
    this.enemyGroup.getChildren().forEach((obj) => {
      const e = obj as EnemySprite;
      if (!e.enemyData.alive) return;
      if (radius > 0 && Phaser.Math.Distance.Between(x, y, e.x, e.y) > radius) return;
      this.defeatEnemyViaSkill(e);
    });
    this.flyingEnemyGroup.getChildren().forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite;
      if (!s.getData('alive')) return;
      if (radius > 0 && Phaser.Math.Distance.Between(x, y, s.x, s.y) > radius) return;
      this.defeatFlyingViaSkill(s);
    });
    this.giantFlies?.purge(x, y, radius);
  }

  private defeatEnemyViaSkill(enemy: EnemySprite): void {
    enemy.enemyData.alive = false;
    enemy.setVelocity(0, 0);
    if (enemy.body) enemy.body.enable = false;
    enemy.setTexture('enemy_defeated');
    this.stats.score += ENEMY_SCORE;
    this.stats.enemiesDefeated++;
    this.enemiesDefeatedInLevel++;
    this.xpInLevel += XP_REWARDS.enemy;
    this.coinsInLevel += COIN_REWARDS.enemy;
    this.burst(enemy.x, enemy.y, this.skill.color, 12);
    this.tweens.add({
      targets: enemy,
      alpha: 0,
      y: enemy.y + 5,
      scale: 0.8,
      duration: 500,
      delay: 200,
      onComplete: () => enemy.destroy(),
    });
    this.emitStats();
  }

  private defeatFlyingViaSkill(sprite: Phaser.Physics.Arcade.Sprite): void {
    sprite.setData('alive', false);
    if (sprite.body) sprite.body.enable = false;
    this.stats.score += ENEMY_SCORE;
    this.stats.enemiesDefeated++;
    this.flyingEnemiesDefeatedInLevel++;
    this.xpInLevel += XP_REWARDS.flyingEnemy;
    this.coinsInLevel += COIN_REWARDS.flyingEnemy;
    this.burst(sprite.x, sprite.y, this.skill.color, 10);
    this.tweens.add({
      targets: sprite,
      alpha: 0,
      scale: 1.4,
      y: sprite.y - 20,
      duration: 400,
      onComplete: () => sprite.destroy(),
    });
    this.emitStats();
  }

  private pingLocation(x: number, y: number, color: number): void {
    const beacon = this.add.circle(x, y, 6, color, 0.9);
    beacon.setDepth(70);
    const ring = this.add.circle(x, y, 8, color, 0);
    ring.setStrokeStyle(3, color, 1);
    ring.setDepth(70);
    const beam = this.add.rectangle(x, y - 38, 4, 76, color, 0.4);
    beam.setDepth(69);
    this.tweens.add({
      targets: ring,
      radius: 30,
      alpha: 0,
      duration: 900,
      repeat: 2,
      onComplete: () => ring.destroy(),
    });
    this.tweens.add({
      targets: beacon,
      alpha: 0.3,
      yoyo: true,
      repeat: 5,
      duration: 300,
      onComplete: () => beacon.destroy(),
    });
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 1400,
      onComplete: () => beam.destroy(),
    });
  }

  private updateFlight(now: number, jumpDown: boolean): void {
    if (now > this.flightUntil) {
      this.endFlight();
      return;
    }
    if (!this.player.body) return;
    this.player.setVelocityY(jumpDown ? -240 : 70);
    if (Math.random() < 0.4) {
      const p = this.add.image(this.player.x, this.player.y + 12, 'particle');
      p.setTint(this.skill.colorLight);
      p.setDepth(8);
      p.setScale(0.5);
      this.tweens.add({
        targets: p,
        y: p.y + 22,
        alpha: 0,
        duration: 420,
        onComplete: () => p.destroy(),
      });
    }
  }

  private endFlight(): void {
    if (!this.flying) return;
    this.flying = false;
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
    }
    this.banner('Pendaratan!', this.skill.cssColor);
  }

  private showEducationBanner(text: string, cssColor: string): void {
    const cx = this.scale.width / 2;
    const bg = this.add.rectangle(cx, 150, 560, 66, 0x0f172a, 0.85);
    bg.setScrollFactor(0);
    bg.setDepth(215);
    bg.setStrokeStyle(2, this.skill.color, 1);
    const txt = this.add.text(cx, 150, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: cssColor,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 520 },
      stroke: '#000',
      strokeThickness: 3,
    });
    txt.setOrigin(0.5);
    txt.setScrollFactor(0);
    txt.setDepth(216);
    bg.setAlpha(0);
    txt.setAlpha(0);
    this.tweens.add({
      targets: [bg, txt],
      alpha: 1,
      duration: 300,
      hold: 2800,
      yoyo: true,
      onComplete: () => {
        bg.destroy();
        txt.destroy();
      },
    });
  }

  // ── Boosts ────────────────────────────────────────────────

  private createBoosts(): void {
    this.boostGroup = this.physics.add.group();
    const defs = this.level.boosts ?? [];
    for (const b of defs) {
      const key = `boost_${b.type}`;
      const sprite = this.physics.add.sprite(b.x, b.y, key) as Phaser.Physics.Arcade.Sprite;
      sprite.setData('type', b.type);
      sprite.setImmovable(true);
      (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      sprite.setDepth(30);
      this.tweens.add({
        targets: sprite,
        y: b.y - 8,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.tweens.add({
        targets: sprite,
        scale: 1.15,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
      this.boostGroup.add(sprite);
    }
  }

  private collectBoost(sprite: Phaser.Physics.Arcade.Sprite): void {
    const type = sprite.getData('type') as BoostType;
    if (!type || this.activeEffects.includes(type)) return;
    this.activeEffects.push(type);
    const color = parseInt(BOOST_COLORS[type].main.slice(1), 16);
    sound.playCollect();
    this.burst(sprite.x, sprite.y, color, 14);
    this.floatScore(sprite.x, sprite.y - 10, BOOST_COLORS[type].label, BOOST_COLORS[type].light);
    sprite.destroy();
    this.effectTimers[type] = this.time.now + BOOST_DURATIONS[type];
    this.xpInLevel += XP_REWARDS.boost;
    this.coinsInLevel += COIN_REWARDS.boost;
    this.checkAchievements();
    this.emitStats();
  }

  private updateActiveEffects(): void {
    if (this.activeEffects.includes('magnet')) {
      this.updateMagnet();
    }
    if (this.activeEffects.includes('jump')) {
      this.updateJumpBoost();
    }
    const now = this.time.now;
    this.activeEffects = this.activeEffects.filter((e) => now < (this.effectTimers[e] ?? 0));
  }

  private updateMagnet(): void {
    const magnetRange = 120;
    this.trashGroup.getChildren().forEach((obj) => {
      const trash = obj as TrashSprite;
      if (trash.trashData.collected) return;
      const dx = this.player.x - trash.x;
      const dy = this.player.y - trash.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < magnetRange) {
        const angle = Math.atan2(dy, dx);
        const pull = 400;
        trash.x += Math.cos(angle) * pull * 0.016;
        trash.y += Math.sin(angle) * pull * 0.016;
        trash.body!.updateFromGameObject();
      }
    });
  }

  private updateJumpBoost(): void {
    // no-op
  }

  // ── Combo System ──────────────────────────────────────────

  private resetCombo(): void {
    this.combo = 0;
  }

  private bumpCombo(): void {
    this.combo = Math.min(COMBO_MAX, this.combo + 1);
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.lastCollectTime = this.time.now;
    if (this.combo >= 2) {
      this.floatText(this.player.x, this.player.y - 40, `x${this.combo} COMBO!`, '#facc15');
    }
    if (this.combo >= 3) {
      this.addEcoPower(ECO_POWER_GAIN.combo);
    }
  }

  private updateCombo(): void {
    const now = this.time.now;
    if (this.combo > 0 && now - this.lastCollectTime > COMBO_WINDOW_MS) {
      this.resetCombo();
    }
  }

  private floatText(x: number, y: number, text: string, color: string): void {
    const txt = this.add.text(x, y, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color,
      fontStyle: 'bold',
    });
    txt.setOrigin(0.5);
    txt.setShadow(2, 2, 'rgba(0,0,0,0.5)', 2);
    this.tweens.add({
      targets: txt,
      y: y - 55,
      alpha: 0,
      scale: 1.4,
      duration: 900,
      ease: 'Cubic.out',
      onComplete: () => txt.destroy(),
    });
  }

  private createParticles(): void {
    this.particles = this.add.particles(0, 0, 'particle', {
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      lifespan: 600,
      quantity: 0,
      emitting: false,
    });
  }

  burst(x: number, y: number, color: number, count = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 80 + Math.random() * 120;
      const p = this.add.image(x, y, 'particle');
      p.setTint(color);
      p.setScale(0.4 + Math.random() * 0.4);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed - 30,
        alpha: 0,
        scale: 0,
        duration: 500 + Math.random() * 200,
        ease: 'Cubic.out',
        onComplete: () => p.destroy(),
      });
    }
  }

  floatScore(x: number, y: number, text: string, color: string): void {
    const txt = this.add.text(x, y, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color,
      fontStyle: 'bold',
    });
    txt.setOrigin(0.5);
    txt.setShadow(2, 2, 'rgba(0,0,0,0.5)', 2);
    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      scale: 1.3,
      duration: 800,
      ease: 'Cubic.out',
      onComplete: () => txt.destroy(),
    });
  }

  // ── Input ──────────────────────────────────────────────────

  private setupInput(): void {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyJump = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keySkill = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    }
  }

  public setMobileInput(key: 'left' | 'right' | 'jump', pressed: boolean): void {
    if (key === 'jump') {
      if (pressed) {
        this.jumpBufferTime = this.time.now;
      }
      this.mobileInput.jump = pressed;
    } else {
      this.mobileInput[key] = pressed;
    }
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setLerp(0.08, 0.08);
  }

  // ── Colliders ──────────────────────────────────────────────

  private setupColliders(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemyGroup, this.platforms);
    this.physics.add.collider(this.player, this.movingPlatformGroup);

    this.physics.add.overlap(this.player, this.trashGroup, (_p, t) => {
      this.collectTrash(t as TrashSprite);
    });
    this.physics.add.overlap(this.player, this.secretGroup, (_p, s) => {
      this.collectSecret(s as SecretSprite);
    });
    this.physics.add.overlap(this.player, this.enemyGroup, (_p, e) => {
      this.handleEnemyContact(e as EnemySprite);
    });
    this.physics.add.overlap(this.player, this.flyingEnemyGroup, (_p, e) => {
      this.handleFlyingEnemyContact(e as Phaser.Physics.Arcade.Sprite);
    });
    this.physics.add.overlap(this.player, this.healthGroup, (_p, h) => {
      this.collectHealth(h as Phaser.Physics.Arcade.Sprite);
    });
    this.physics.add.overlap(this.player, this.boostGroup, (_p, b) => {
      this.collectBoost(b as Phaser.Physics.Arcade.Sprite);
    });
    this.physics.add.overlap(this.player, this.goal, () => {
      this.reachGoal();
    });

    if (this.giantFlies) {
      this.physics.add.overlap(this.player, this.giantFlies.group, (_p, f) => {
        this.giantFlies?.handleContact(f as Phaser.Physics.Arcade.Sprite);
      });
    }

    if (this.toxicWaste) {
      this.physics.add.overlap(this.player, this.toxicWaste.group, () => {
        this.toxicWaste?.handleContact();
      });
    }

    if (this.boss) {
      const boss = this.boss;
      this.physics.add.overlap(this.player, boss.sprite, () => boss.handleBossContact());
      this.physics.add.overlap(this.player, boss.machine, () => boss.handleMachineContact());
      this.physics.add.overlap(this.player, boss.trashGroup, (_p, t) => {
        boss.handleTrashPickup(t as Phaser.Physics.Arcade.Sprite);
      });
      this.physics.add.overlap(this.player, boss.orbGroup, (_p, o) => {
        boss.handleOrbPickup(o as Phaser.Physics.Arcade.Sprite);
      });
      this.physics.add.overlap(this.player, boss.projectileGroup, (_p, proj) => {
        boss.handleProjectileContact(proj as Phaser.Physics.Arcade.Sprite);
      });
    }
  }

  // ── Game Logic ─────────────────────────────────────────────

  private tryJump(): void {
    if (this.state !== 'playing') return;
    if (!this.player.body) return;

    const now = this.time.now;
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const inCoyote = now - this.lastGroundedTime <= COYOTE_TIME_MS;

    if (onGround || inCoyote) {
      const jumpV = this.activeEffects.includes('jump') ? JUMP_VELOCITY * 1.35 : JUMP_VELOCITY;
      this.player.setVelocityY(jumpV);
      this.jumpsLeft = 1; // one double jump remaining
      this.lastGroundedTime = 0;
      sound.playJump();
      this.burst(this.player.x, this.player.y + 18, 0xffffff, 5);
    } else if (this.jumpsLeft > 0) {
      const jumpV = this.activeEffects.includes('jump') ? DOUBLE_JUMP_VELOCITY * 1.25 : DOUBLE_JUMP_VELOCITY;
      this.player.setVelocityY(jumpV);
      this.jumpsLeft = 0;
      sound.playJump();
      this.burst(this.player.x, this.player.y, 0x93c5fd, 8);
    }
  }

  private collectTrash(sprite: TrashSprite): void {
    if (sprite.trashData.collected) return;
    sprite.trashData.collected = true;
    const colorHex = TRASH_COLORS[sprite.trashData.type as keyof typeof TRASH_COLORS];
    const color = parseInt(colorHex.main.slice(1), 16);
    this.bumpCombo();
    const multiplier = this.combo >= COMBO_MAX ? COMBO_MAX : this.combo;
    const totalScore = TRASH_SCORE * multiplier;
    this.stats.score += totalScore;
    this.stats.trashCollected++;
    this.trashCollectedInLevel++;
    this.xpInLevel += XP_REWARDS.trash;
    this.coinsInLevel += COIN_REWARDS.trash;
    sound.playCollect();
    this.burst(sprite.x, sprite.y, color, 10);
    if (multiplier > 1) {
      this.floatScore(sprite.x, sprite.y - 20, `+${totalScore} x${multiplier}`, colorHex.light);
    } else {
      this.floatScore(sprite.x, sprite.y - 10, `+${totalScore}`, colorHex.light);
    }
    sprite.destroy();
    this.addEcoPower(ECO_POWER_GAIN.trash);
    this.checkAchievements();
    this.emitStats();
  }

  private collectSecret(sprite: SecretSprite): void {
    if (sprite.secretData.collected) return;
    sprite.secretData.collected = true;
    this.bumpCombo();
    const isMaggot = sprite.secretData.type === 'maggot';
    const color = isMaggot ? 0xfbbf24 : 0x65a30d;
    const multiplier = this.combo >= COMBO_MAX ? COMBO_MAX : this.combo;
    const totalScore = SECRET_SCORE * multiplier;
    this.stats.score += totalScore;
    this.stats.secretsFound++;
    this.secretsFoundInLevel++;
    this.xpInLevel += XP_REWARDS.secret;
    this.coinsInLevel += COIN_REWARDS.secret;
    sound.playSecret();
    this.burst(sprite.x, sprite.y, color, 16);
    this.floatScore(
      sprite.x,
      sprite.y - 10,
      (isMaggot ? 'Maggot!' : 'Kompos!') + ' +' + totalScore + (multiplier > 1 ? ' x' + multiplier : ''),
      isMaggot ? '#fef3c7' : '#d9f99d'
    );
    // Sparkle burst
    for (let i = 0; i < 8; i++) {
      const sparkle = this.add.image(sprite.x, sprite.y, 'spark');
      this.tweens.add({
        targets: sparkle,
        y: sprite.y - 30 - Math.random() * 30,
        x: sprite.x + (Math.random() - 0.5) * 40,
        alpha: 0,
        scale: 0,
        duration: 600,
        delay: i * 40,
        onComplete: () => sparkle.destroy(),
      });
    }
    sprite.destroy();
    this.addEcoPower(ECO_POWER_GAIN.secret);
    this.checkAchievements();
    this.emitStats();
  }

  private handleEnemyContact(enemy: EnemySprite): void {
    if (!enemy.enemyData.alive) return;
    if (this.state !== 'playing') return;

    const playerBottom = this.player.y + this.player.body!.halfHeight;
    const enemyTop = enemy.y - enemy.body!.halfHeight;
    const stomping = this.player.body!.velocity.y > 0 && playerBottom - this.player.body!.velocity.y * 0.02 <= enemyTop + 10;

    if (stomping) {
      this.stompEnemy(enemy);
    } else if (this.time.now > this.invincibleUntil) {
      this.hurtPlayer(enemy);
    }
  }

  private handleFlyingEnemyContact(sprite: Phaser.Physics.Arcade.Sprite): void {
    if (!sprite.getData('alive')) return;
    if (this.state !== 'playing') return;

    const playerBottom = this.player.y + this.player.body!.halfHeight;
    const enemyTop = sprite.y - (sprite.getData('halfHeight') as number);
    const stomping = this.player.body!.velocity.y > 0 && playerBottom - this.player.body!.velocity.y * 0.02 <= enemyTop + 10;

    if (stomping) {
      this.collectFlyingEnemy(sprite);
    } else if (this.time.now > this.invincibleUntil) {
      this.hurtPlayer(sprite as unknown as EnemySprite);
    }
  }

  private stompEnemy(enemy: EnemySprite): void {
    enemy.enemyData.alive = false;
    enemy.enemyData.defeatedTimer = 600;
    enemy.setVelocityX(0);
    enemy.setVelocityY(0);
    enemy.body!.enable = false;
    enemy.setTexture('enemy_defeated');
    this.stats.score += ENEMY_SCORE;
    this.stats.enemiesDefeated++;
    this.enemiesDefeatedInLevel++;
    this.xpInLevel += XP_REWARDS.enemy;
    this.coinsInLevel += COIN_REWARDS.enemy;
    sound.playStomp();
    this.burst(enemy.x, enemy.y, 0x7e22ce, 10);
    this.floatScore(enemy.x, enemy.y - 10, `+${ENEMY_SCORE}`, '#facc15');

    this.tweens.add({
      targets: enemy,
      alpha: 0,
      y: enemy.y + 5,
      duration: 500,
      delay: 400,
      onComplete: () => enemy.destroy(),
    });

    // Bounce player
    this.player.setVelocityY(BOUNCE_VELOCITY);
    this.addEcoPower(ECO_POWER_GAIN.enemy);
    this.checkAchievements();
    this.emitStats();
  }

  private hurtPlayer(enemy: EnemySprite): void {
    this.applyDamage(enemy.x);
  }

  /**
   * Single damage pipeline: shield check, life loss, knockback away from
   * `sourceX` and the invincibility window. Hazards pass a stronger
   * `knockUpVelocity` so the player is launched clear of the danger.
   */
  private applyDamage(sourceX: number, knockUpVelocity = -200): void {
    if (this.activeEffects.includes('shield')) {
      this.burst(sourceX, this.player.y, 0x06b6d4, 14);
      this.floatScore(this.player.x, this.player.y - 20, 'Diblokir!', '#67e8f9');
      sound.playStomp();
      return;
    }
    this.invincibleUntil = this.time.now + INVINCIBILITY_MS;
    this.stats.lives--;
    this.resetCombo();
    sound.playHurt();

    // Screen shake
    this.cameras.main.shake(SCREEN_SHAKE_DURATION / 1000, SCREEN_SHAKE_INTENSITY / 1000);

    // Knockback
    const dir = this.player.x < sourceX ? -1 : 1;
    this.player.setVelocityX(dir * KNOCKBACK_VELOCITY);
    this.player.setVelocityY(knockUpVelocity);

    // Damage particles
    this.burst(this.player.x, this.player.y, 0xef4444, 12);

    // Blink effect — a red tint flash, NOT opacity, so the hero never fades out.
    this.player.setAlpha(1);
    const blink = this.time.addEvent({
      delay: 120,
      repeat: Math.floor(INVINCIBILITY_MS / 120),
      callback: () => {
        if (!this.player.active) return;
        if (this.player.isTinted) {
          this.player.clearTint();
        } else {
          this.player.setTint(0xff7b7b);
        }
      },
    });
    this.time.delayedCall(INVINCIBILITY_MS, () => {
      blink.remove();
      if (this.player.active) this.player.clearTint();
    });

    if (this.stats.lives <= 0) {
      this.time.delayedCall(600, () => this.gameOver());
    }
    this.emitStats();
  }

  private reachGoal(): void {
    if (this.goalReached || this.state !== 'playing') return;

    if (this.isGoalLocked()) {
      const now = this.time.now;
      if (now - this.goalLockHintAt > 2000) {
        this.goalLockHintAt = now;
        sound.playReject();
        this.floatScore(this.goal.x, this.goal.y - 130, 'Kalahkan Raja Sampah dulu!', '#fca5a5');
      }
      return;
    }

    this.goalReached = true;
    this.state = 'won';
    this.stats.score += LEVEL_BONUS;
    this.stats.factsLearned++;
    this.xpInLevel += XP_REWARDS.levelComplete;
    this.coinsInLevel += COIN_REWARDS.levelComplete;

    // All trash bonus
    if (this.trashCollectedInLevel === this.level.trash.length) {
      this.stats.score += ALL_TRASH_BONUS;
      this.xpInLevel += XP_REWARDS.allTrashBonus;
      this.coinsInLevel += COIN_REWARDS.allTrashBonus;
      this.floatScore(this.player.x, this.player.y - 30, `Sempurna! +${ALL_TRASH_BONUS}`, '#facc15');
    }
    // All secrets bonus
    if (this.secretsFoundInLevel === this.level.secrets.length) {
      this.stats.score += ALL_SECRETS_BONUS;
      this.xpInLevel += XP_REWARDS.allSecretsBonus;
      this.coinsInLevel += COIN_REWARDS.allSecretsBonus;
      this.floatScore(this.player.x, this.player.y - 50, `Bonus Rahasia! +${ALL_SECRETS_BONUS}`, '#86efac');
    }
    // All enemies bonus
    if (this.enemiesDefeatedInLevel === this.level.enemies.length) {
      this.xpInLevel += XP_REWARDS.allEnemiesBonus;
      this.coinsInLevel += COIN_REWARDS.allEnemiesBonus;
    }
    // No damage bonus
    if (this.stats.lives >= 3) {
      this.xpInLevel += XP_REWARDS.noDamageBonus;
      this.coinsInLevel += COIN_REWARDS.noDamageBonus;
    }

    sound.playLevelComplete();
    sound.stopMusic();

    // Victory burst
    for (let i = 0; i < 30; i++) {
      const leaf = this.add.image(this.goal.x, this.goal.y - 40, 'leaf');
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 80;
      this.tweens.add({
        targets: leaf,
        x: this.goal.x + Math.cos(angle) * dist,
        y: this.goal.y - 40 + Math.sin(angle) * dist - 40,
        alpha: 0,
        scale: 0,
        rotation: Math.random() * Math.PI,
        duration: 1000 + Math.random() * 500,
        delay: i * 30,
        ease: 'Cubic.out',
        onComplete: () => leaf.destroy(),
      });
    }

    // Environment transformation effect — brighten the scene
    this.cameras.main.flash(300, 100, 255, 100);

    this.time.delayedCall(1500, () => {
      const prevXp = this.stats.xpGained;
      const newXp = prevXp + this.xpInLevel;
      const prevRank = getRankForXp(prevXp);
      const newRank = getRankForXp(newXp);
      const rankUp = newRank.id !== prevRank.id;
      this.stats.xpGained = newXp;
      this.stats.coinsGained += this.coinsInLevel;
      const elapsed = this.time.now - this.levelStartTime;
    const timeSeconds = Math.floor(elapsed / 1000);
    this.stats.timeSeconds = timeSeconds;
    let timeBonus = 0;
    if (this.timeTarget && elapsed < this.timeTargetMs) {
      const remaining = this.timeTargetMs - elapsed;
      const pct = remaining / this.timeTargetMs;
      timeBonus = Math.floor(TIME_BONUS_PCT * pct * (XP_REWARDS.trash * 5));
      this.stats.score += timeBonus;
      this.xpInLevel += timeBonus;
      this.coinsInLevel += Math.floor(timeBonus * 0.5);
      this.floatScore(this.player.x, this.player.y - 30, 'Time Bonus! +' + timeBonus, '#22d3ee');
    }

    const result: LevelResult = {
        stats: { ...this.stats },
        trashInLevel: this.level.trash.length,
        trashCollectedInLevel: this.trashCollectedInLevel,
        enemiesInLevel: this.level.enemies.length,
        enemiesDefeatedInLevel: this.enemiesDefeatedInLevel,
        flyingEnemiesInLevel: this.level.flyingEnemies?.length ?? 0,
        flyingEnemiesDefeatedInLevel: this.flyingEnemiesDefeatedInLevel,
        secretsInLevel: this.level.secrets.length,
        secretsFoundInLevel: this.secretsFoundInLevel,
        fact: this.level.fact,
        outro: this.level.story.outro,
        xpGained: this.xpInLevel,
        coinsGained: this.coinsInLevel,
        timeSeconds,
        timeBonus,
        maxCombo: this.maxCombo,
        rankUp,
        newRankName: rankUp ? newRank.name : null,
        badgeName: null,
        hasBoss: !!this.level.boss,
        bossDefeated: this.bossDefeated,
        bossName: this.level.boss?.name ?? null,
        startLives: this.livesAtLevelStart,
        livesLost: Math.max(0, this.livesAtLevelStart - this.stats.lives),
      };
      this.checkAchievements();
      this.callbacks.onLevelComplete(result);
    });
  }

  private gameOver(): void {
    if (this.state !== 'playing') return;
    this.state = 'lost';
    sound.playGameOver();
    sound.stopMusic();
    this.cameras.main.shake(400 / 1000, 0.02);
    this.cameras.main.fade(500, 0, 0, 0);
    this.time.delayedCall(800, () => {
      this.callbacks.onGameOver({ ...this.stats });
    });
  }

  // ── Achievements ───────────────────────────────────────────

  private checkAchievements(): void {
    for (const ach of ACHIEVEMENTS) {
      if (this.unlockedAchievements.has(ach.id)) continue;
      if (ach.condition(this.stats)) {
        this.unlockedAchievements.add(ach.id);
        this.callbacks.onAchievement(ach);
      }
    }
  }

  private emitStats(): void {
    this.callbacks.onStatsChange({ ...this.stats });
  }

  public getCurrentStats(): GameStats {
    return { ...this.stats };
  }

  // ── Update ─────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    if (this.state !== 'playing') return;
    if (!this.player.body) return;

    const now = this.time.now;
    const dt = delta / 1000;
    const left = this.cursors?.left.isDown || this.keyLeft?.isDown || this.mobileInput.left;
    const right = this.cursors?.right.isDown || this.keyRight?.isDown || this.mobileInput.right;
    const jumpDown = this.cursors?.up.isDown || this.keyJump?.isDown || this.cursors?.space?.isDown || this.mobileInput.jump;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;

    if (onGround) {
      this.lastGroundedTime = now;
      this.jumpsLeft = 1;
    }

    // Eco Power skill — edge-triggered X key.
    const skillDown = this.keySkill?.isDown ?? false;
    if (skillDown && !this.skillHeld) {
      this.activateSkill();
    }
    this.skillHeld = skillDown;

    if (this.flying) {
      // Wind skill: hovering flight overrides the normal jump/gravity model.
      this.updateFlight(now, jumpDown);
      this.jumpHeld = jumpDown;
    } else {
      // Jump edge detection + buffering
      if (jumpDown && !this.jumpHeld) {
        this.jumpBufferTime = now;
      }
      this.jumpHeld = jumpDown;

      if (this.jumpBufferTime > 0 && now - this.jumpBufferTime <= JUMP_BUFFER_MS) {
        this.tryJump();
        this.jumpBufferTime = 0;
      }

      // Variable jump height — cut upward velocity when jump released
      if (!jumpDown && this.player.body.velocity.y < -180) {
        this.player.setVelocityY(this.player.body.velocity.y * 0.5);
      }
    }

    // Snappy horizontal movement (Mario-style)
    let targetVx = 0;
    if (left && !right) {
      targetVx = -MOVE_SPEED;
      this.player.setFlipX(true);
    } else if (right && !left) {
      targetVx = MOVE_SPEED;
      this.player.setFlipX(false);
    }

    const currentVx = this.player.body.velocity.x;
    const accel = onGround ? 2000 : 1400;
    if (targetVx !== 0) {
      const diff = targetVx - currentVx;
      const step = accel * dt;
      if (Math.abs(diff) <= step) {
        this.player.setVelocityX(targetVx);
      } else {
        this.player.setVelocityX(currentVx + Math.sign(diff) * step);
      }
    } else {
      const decel = onGround ? 2600 : 800;
      if (Math.abs(currentVx) > decel * dt) {
        this.player.setVelocityX(currentVx - Math.sign(currentVx) * decel * dt);
      } else {
        this.player.setVelocityX(0);
      }
    }

    // Clamp fall speed
    if (this.player.body.velocity.y > MAX_FALL_SPEED) {
      this.player.setVelocityY(MAX_FALL_SPEED);
    }

    // Animation
    if (!onGround) {
      this.player.play('jump', true);
    } else if (Math.abs(this.player.body.velocity.x) > 20) {
      this.player.play('run', true);
    } else {
      this.player.play('idle', true);
    }

    // Update enemies
    this.updateEnemies();

    // Update flying enemies
    this.updateFlyingEnemies();

    // Update giant flies and the mini boss
    this.giantFlies?.update(delta);
    this.boss?.update(delta);

    // Update moving platforms
    this.updateMovingPlatforms();

    // Update combo
    this.updateCombo();

    // Update active effects
    this.updateActiveEffects();

    // Environmental challenges
    this.updateEnvironmentalChallenge(dt, now);

    // Fall off world
    if (this.player.y > GAME_HEIGHT + 100) {
      this.stats.lives--;
      this.emitStats();
      if (this.stats.lives <= 0) {
        this.gameOver();
      } else {
        this.endFlight();
        const start = this.level.playerStart;
        this.player.setPosition(start.x, start.y);
        this.player.setVelocity(0, 0);
        this.jumpsLeft = 1;
        this.invincibleUntil = this.time.now + INVINCIBILITY_MS;
      }
    }

    // Animate clouds slowly
    for (const cloud of this.bgClouds) {
      cloud.x -= 0.1 * dt * 60;
      if (cloud.x < -100) cloud.x = this.level.width + 100;
    }
  }

  private updateEnemies(): void {
    const challenge = LEVEL_CHALLENGES[this.level.theme];
    const speedMultiplier = challenge?.type === 'wind' ? 1.6 : 1;
    const enemySpeed = this.baseEnemySpeed * speedMultiplier;

    this.enemyGroup.getChildren().forEach((obj) => {
      const enemy = obj as EnemySprite;
      if (!enemy.enemyData.alive) return;
      if (!enemy.body) return;

      const startX = enemy.enemyData.startX;
      const range = enemy.enemyData.range;
      const vx = enemy.body.velocity.x;
      const currentX = enemy.x;

      // Check if enemy should turn around
      if (currentX <= startX - range) {
        // Hit left boundary, move right
        enemy.setVelocityX(enemySpeed);
        enemy.setFlipX(false);
      } else if (currentX >= startX + range) {
        // Hit right boundary, move left
        enemy.setVelocityX(-enemySpeed);
        enemy.setFlipX(true);
      } else {
        // Keep moving in current direction if speed is sufficient
        if (Math.abs(vx) < enemySpeed * 0.5) {
          const dir = enemy.flipX ? -enemySpeed : enemySpeed;
          enemy.setVelocityX(dir);
        }
      }
    });
  }

  private updateMovingPlatforms(): void {
    if (!this.movingPlatformGroup) return;
    this.movingPlatformGroup.getChildren().forEach((obj) => {
      const plat = obj as Phaser.Physics.Arcade.Sprite;
      if (!plat.body) return;

      const startX = plat.getData('startX') as number;
      const range = plat.getData('range') as number;
      const speed = plat.getData('speed') as number;
      const phase = (plat.getData('phase') as number) ?? 0;

      // A single non-finite value here would put a NaN body into the Arcade
      // R-tree, which silently kills every overlap check in the level.
      const newX = startX + Math.sin((this.time.now / 1000) * (speed / 60) + phase) * range;
      if (!Number.isFinite(newX)) return;

      const prevX = plat.getData('prevX') as number;
      const dx = newX - prevX;
      plat.setData('prevX', newX);
      plat.x = newX;
      plat.body.updateFromGameObject();

      const gfx = plat.getData('gfx') as Phaser.GameObjects.Graphics | undefined;
      gfx?.setPosition(newX, plat.y);

      // Carry the player standing on top of it.
      const platWidth = plat.getData('width') as number;
      const platHeight = plat.getData('height') as number;
      if (
        this.player.body &&
        (this.player.body.blocked.down || this.player.body.touching.down) &&
        Math.abs(this.player.x - plat.x) < platWidth / 2 + this.player.body.halfWidth &&
        Math.abs(this.player.y - plat.y) < platHeight / 2 + this.player.body.halfHeight + 8
      ) {
        this.player.x += dx;
      }
    });
  }

  private updateEnvironmentalChallenge(dt: number, now: number): void {
    const challenge = LEVEL_CHALLENGES[this.level.theme];
    if (!challenge || challenge.type === 'none') return;

    // Show warning once
    if (!this.challengeWarningShown) {
      this.challengeWarningShown = true;
      this.showChallengeWarning(challenge.warning);
    }

    // Beach: wind gusts — visible particle streaks + push player
    if (challenge.type === 'wind') {
      this.updateWind(dt, now);
    }

    // River: periodic flood waves
    if (challenge.type === 'flood') {
      this.updateFlood(dt, now);
    }

    // Landfill: smog cycles
    if (challenge.type === 'smog') {
      this.updateSmog(dt);
    }
  }

  // ── Wind Challenge ────────────────────────────────────────────

  private updateWind(dt: number, now: number): void {
    this.windTimer -= dt * 1000;

    // Start a new gust
    if (!this.windActive && this.windTimer <= 0) {
      this.windActive = true;
      this.windGustEnd = now + 2500;
      this.windTimer = 4000 + Math.random() * 3000;
      this.showChallengeWarning('Angin!');
      this.cameras.main.shake(200, 0.003);
    }

    // During a gust: create visible wind streak particles + push player
    if (this.windActive) {
      // Spawn wind streaks across the visible screen
      const camScroll = this.cameras.main.scrollX;
      for (let i = 0; i < 3; i++) {
        const streak = this.add.graphics();
        const x = camScroll + Math.random() * this.scale.width;
        const y = 60 + Math.random() * (GAME_HEIGHT - 140);
        const len = 30 + Math.random() * 50;
        streak.lineStyle(2, 0xffffff, 0.5);
        streak.beginPath();
        streak.moveTo(x, y);
        streak.lineTo(x + len, y);
        streak.strokePath();
        streak.setDepth(60);
        this.tweens.add({
          targets: streak,
          x: streak.x + 200,
          alpha: 0,
          duration: 400,
          onComplete: () => streak.destroy(),
        });
      }

      // Push player backward
      if (this.player.body) {
        this.player.setVelocityX(this.player.body.velocity.x - 30 * dt * 60);
      }

      // End gust
      if (now >= this.windGustEnd) {
        this.windActive = false;
      }
    }
  }

  // ── Flood Challenge ───────────────────────────────────────────

  private updateFlood(dt: number, now: number): void {
    this.floodTimer -= dt * 1000;

    if (!this.floodActive && this.floodTimer <= 0) {
      this.spawnFloodWave();
      this.floodTimer = 7000 + Math.random() * 4000;
    }

    if (this.floodActive && this.floodWave) {
      this.floodWave.x += 280 * dt;
      // Sync foam position with wave
      const foam = (this.floodWave as unknown as { foam?: Phaser.GameObjects.Rectangle }).foam;
      if (foam) foam.x = this.floodWave.x;

      // Damage and block player if flood wave hits
      if (this.floodWave.visible) {
        const waveLeft = this.floodWave.x;
        const waveRight = this.floodWave.x + this.floodWave.width;
        const waveTop = GAME_HEIGHT - 80;

        const playerLeft = this.player.x - this.player.body!.halfWidth;
        const playerRight = this.player.x + this.player.body!.halfWidth;
        const playerBottom = this.player.y + this.player.body!.halfHeight;

        // Check if player collides with flood wave
        const playerInWave = playerRight > waveLeft && playerLeft < waveRight && playerBottom > waveTop;
        
        if (playerInWave) {
          // Block player movement (push backward)
          if (this.player.body) {
            this.player.setVelocityX(-150);
          }
          
          // Damage player once
          if (now > this.invincibleUntil) {
            this.hurtPlayer({ x: this.floodWave.x } as EnemySprite);
          }
        }
      }

      if (this.floodWave.x > this.level.width + 100) {
        const foam = (this.floodWave as unknown as { foam?: Phaser.GameObjects.Rectangle }).foam;
        if (foam) foam.destroy();
        this.floodWave.destroy();
        this.floodWave = null;
        this.floodActive = false;
      }
    }
  }

  // ── Smog Challenge ───────────────────────────────────────────

  private updateSmog(dt: number): void {
    this.smogCycleTimer -= dt * 1000;

    // Create overlay if not yet created
    if (!this.smogOverlay) {
      this.smogOverlay = this.add.rectangle(0, 0, this.level.width, GAME_HEIGHT, 0x1c1917, 0);
      this.smogOverlay.setOrigin(0, 0);
      this.smogOverlay.setScrollFactor(0);
      this.smogOverlay.setDepth(90);
    }

    // Start a smog surge
    if (!this.smogActive && this.smogCycleTimer <= 0) {
      this.smogActive = true;
      this.smogCycleTimer = 9000 + Math.random() * 4000;
      this.showChallengeWarning('Asap! Pandangan mengecil!');

      // Fade in to near-opaque over 1s, hold 3s, fade out over 1.5s
      this.tweens.add({
        targets: this.smogOverlay,
        alpha: 0.85,
        duration: 1000,
        yoyo: true,
        hold: 3000,
        ease: 'Sine.inOut',
        onComplete: () => {
          this.smogActive = false;
        },
      });

      // Also spawn floating smog particles
      const camScroll = this.cameras.main.scrollX;
      for (let i = 0; i < 20; i++) {
        const p = this.add.circle(
          camScroll + Math.random() * this.scale.width,
          Math.random() * GAME_HEIGHT,
          20 + Math.random() * 30,
          0x57534e,
          0.3
        );
        p.setDepth(91);
        p.setScrollFactor(0);
        this.tweens.add({
          targets: p,
          x: p.x + (Math.random() - 0.5) * 100,
          y: p.y - 30 - Math.random() * 50,
          alpha: 0,
          duration: 3000 + Math.random() * 2000,
          onComplete: () => p.destroy(),
        });
      }
    }
  }

  private showChallengeWarning(text: string, color = '#fbbf24'): void {
    const warning = this.add.text(this.scale.width / 2, 110, text, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color,
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    });
    warning.setOrigin(0.5);
    warning.setDepth(210);
    warning.setScrollFactor(0);
    warning.setAlpha(0);
    this.tweens.add({
      targets: warning,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 1500,
      onComplete: () => warning.destroy(),
    });
  }

  private spawnFloodWave(): void {
    this.floodActive = true;
    this.showChallengeWarning('Banjir! Lompat!');

    // Main wave body — taller, more visible
    this.floodWave = this.add.rectangle(-120, GAME_HEIGHT - 80, 100, 80, 0x0e7490, 0.85);
    this.floodWave.setOrigin(0, 0);
    this.floodWave.setDepth(40);

    // Wave foam top
    const foam = this.add.rectangle(-120, GAME_HEIGHT - 85, 100, 10, 0x67e8f9, 0.9);
    foam.setOrigin(0, 0);
    foam.setDepth(41);

    // Animate wave height surging
    this.tweens.add({
      targets: this.floodWave,
      height: 100,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: foam,
      x: { from: -120, to: -120 },
      duration: 100,
      repeat: -1,
    });

    // Move foam with the wave via update tween
    this.tweens.add({
      targets: foam,
      alpha: { from: 0.9, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    // Camera shake for impact
    this.cameras.main.shake(300, 0.008);

    // Store foam reference on wave for cleanup
    (this.floodWave as unknown as { foam: Phaser.GameObjects.Rectangle }).foam = foam;
  }
}
