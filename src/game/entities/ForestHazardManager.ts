import Phaser from 'phaser';
import { SNAKE_HEAD_SIZE, SNAKE_KNOCKBACK_Y, SWAY_LOG_HEIGHT } from '../constants';
import type { HangingSnakeDef, SwayingLogDef } from '../types';
import type { EntityHost } from './EntityHost';
import * as sound from '../sound';

const DEG = Math.PI / 180;
/** Snakes only hiss when the player is close enough to hear it matter. */
const HISS_RANGE = 260;
const HISS_COOLDOWN_MS = 1400;

interface Pendulum {
  anchorX: number;
  anchorY: number;
  length: number;
  maxAngle: number;
  speed: number;
  phase: number;
  /** Radians from vertical this frame; drives both the art and the body. */
  angle: number;
}

interface SwayingLog {
  swing: Pendulum;
  width: number;
  sprite: Phaser.Physics.Arcade.Sprite;
  gfx: Phaser.GameObjects.Graphics;
  rope: Phaser.GameObjects.Graphics;
  prevX: number;
  prevY: number;
}

interface HangingSnake {
  swing: Pendulum;
  head: Phaser.Physics.Arcade.Sprite;
  body: Phaser.GameObjects.Graphics;
  nextHissAt: number;
}

/**
 * The forest's moving scenery: logs slung from branches that the player rides
 * across gaps, and snakes hanging over the path they have to time a run past.
 *
 * Both are pendulums driven by the scene clock rather than by physics, so their
 * motion is perfectly repeatable — a player who watches the swing for a second
 * can always plan the jump. Nothing here chases the player.
 */
export class ForestHazardManager {
  /** Solid, rideable logs. */
  readonly logGroup: Phaser.Physics.Arcade.Group;
  /** Damaging snake heads. */
  readonly snakeGroup: Phaser.Physics.Arcade.Group;

  private readonly host: EntityHost;
  private readonly scene: Phaser.Scene;
  private readonly logs: SwayingLog[] = [];
  private readonly snakes: HangingSnake[] = [];

  constructor(
    host: EntityHost,
    logDefs: readonly SwayingLogDef[],
    snakeDefs: readonly HangingSnakeDef[]
  ) {
    this.host = host;
    this.scene = host.getScene();
    this.logGroup = this.scene.physics.add.group();
    this.snakeGroup = this.scene.physics.add.group();

    for (const def of logDefs) this.createLog(def);
    for (const def of snakeDefs) this.createSnake(def);

    this.scene.events.once('shutdown', () => this.destroy());
  }

  // ── Construction ────────────────────────────────────────────

  private createLog(def: SwayingLogDef): void {
    const swing: Pendulum = {
      anchorX: def.x,
      anchorY: def.y,
      length: def.length,
      maxAngle: def.swayDeg * DEG,
      speed: def.speed,
      phase: def.phase,
      angle: 0,
    };
    const { x, y } = pendulumTip(swing, 0);

    const rope = this.scene.add.graphics();
    rope.setDepth(12);

    const gfx = this.scene.add.graphics();
    gfx.setDepth(14);
    drawSwayLog(gfx, def.width);

    const sprite = this.logGroup.create(x, y, '__white') as Phaser.Physics.Arcade.Sprite;
    sprite.setDisplaySize(def.width, SWAY_LOG_HEIGHT);
    sprite.setOrigin(0.5, 0.5);
    sprite.setVisible(false);
    sprite.setImmovable(true);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocity(0, 0);
    // Position-driven, like the moving platforms: letting Arcade also apply the
    // frame delta would push the log past the arc its rope allows.
    body.moves = false;

    this.logs.push({ swing, width: def.width, sprite, gfx, rope, prevX: x, prevY: y });
  }

  private createSnake(def: HangingSnakeDef): void {
    const swing: Pendulum = {
      anchorX: def.x,
      anchorY: def.y,
      length: def.length,
      maxAngle: def.swayDeg * DEG,
      speed: def.speed,
      phase: def.phase,
      angle: 0,
    };
    const { x, y } = pendulumTip(swing, 0);

    const body = this.scene.add.graphics();
    body.setDepth(13);

    const head = this.snakeGroup.create(x, y, 'snake_head') as Phaser.Physics.Arcade.Sprite;
    head.setDepth(15);
    head.setSize(SNAKE_HEAD_SIZE, SNAKE_HEAD_SIZE);
    head.setImmovable(true);
    const headBody = head.body as Phaser.Physics.Arcade.Body;
    headBody.setAllowGravity(false);
    headBody.moves = false;

    this.snakes.push({ swing, head, body, nextHissAt: 0 });
  }

  // ── Per-frame motion ────────────────────────────────────────

  update(): void {
    const t = this.scene.time.now / 1000;

    for (const log of this.logs) {
      const { x, y } = pendulumTip(log.swing, t);
      const dx = x - log.prevX;
      const dy = y - log.prevY;
      log.prevX = x;
      log.prevY = y;

      log.sprite.setPosition(x, y);
      log.sprite.body?.updateFromGameObject();

      // The log tilts with the swing, but its collision slab stays level so
      // landing on it is never a guess.
      log.gfx.setPosition(x, y);
      log.gfx.setRotation(log.swing.angle * 0.55);

      log.rope.clear();
      log.rope.lineStyle(3, 0x5b3a1a, 1);
      log.rope.lineBetween(log.swing.anchorX, log.swing.anchorY, x, y - SWAY_LOG_HEIGHT / 2);
      log.rope.fillStyle(0x422006, 1);
      log.rope.fillCircle(log.swing.anchorX, log.swing.anchorY, 5);

      this.carryRider(log, dx, dy);
    }

    const now = this.scene.time.now;
    for (const snake of this.snakes) {
      const { x, y } = pendulumTip(snake.swing, t);
      snake.head.setPosition(x, y);
      snake.head.body?.updateFromGameObject();
      // Head hangs downward and leans into the swing.
      snake.head.setRotation(snake.swing.angle);

      drawSnakeBody(snake.body, snake.swing, x, y);

      if (
        now >= snake.nextHissAt &&
        Math.abs(this.host.player.x - x) < HISS_RANGE &&
        this.host.isPlaying()
      ) {
        snake.nextHissAt = now + HISS_COOLDOWN_MS + Math.random() * 900;
        // Only a warning rattle, and only when the player is near enough to act
        // on it — the snake is a timing puzzle, not an ambush.
        sound.playSnake();
      }
    }
  }

  /** Moves the player along with a log they are standing on. */
  private carryRider(log: SwayingLog, dx: number, dy: number): void {
    const player = this.host.player;
    const body = player.body;
    if (!body) return;
    if (!body.blocked.down && !body.touching.down) return;

    const onTop =
      Math.abs(player.x - log.sprite.x) < log.width / 2 + body.halfWidth &&
      Math.abs(player.y - log.sprite.y) < SWAY_LOG_HEIGHT / 2 + body.halfHeight + 8;
    if (!onTop) return;

    player.x += dx;
    if (dy > 0) player.y += dy;
  }

  // ── Contact ─────────────────────────────────────────────────

  handleSnakeContact(head: Phaser.Physics.Arcade.Sprite): void {
    if (!this.host.isPlaying() || this.host.isInvincible()) return;
    this.host.damagePlayer(head.x, SNAKE_KNOCKBACK_Y);
  }

  private destroy(): void {
    this.logs.length = 0;
    this.snakes.length = 0;
  }
}

/** Where a pendulum's tip sits at time `t`, also recording the angle. */
function pendulumTip(p: Pendulum, t: number): { x: number; y: number } {
  p.angle = Math.sin(t * p.speed + p.phase) * p.maxAngle;
  return {
    x: p.anchorX + Math.sin(p.angle) * p.length,
    y: p.anchorY + Math.cos(p.angle) * p.length,
  };
}

/** A short mossy log, drawn around its own centre so it can be rotated. */
function drawSwayLog(g: Phaser.GameObjects.Graphics, width: number): void {
  const h = SWAY_LOG_HEIGHT;
  const left = -width / 2;
  const top = -h / 2;

  g.clear();
  g.fillStyle(0x3f2109, 1);
  g.fillRoundedRect(left, top + 3, width, h, h / 2.5);
  g.fillStyle(0x713f12, 1);
  g.fillRoundedRect(left, top, width, h - 3, h / 2.5);
  g.fillStyle(0x8a5522, 1);
  g.fillRoundedRect(left + 2, top + 1, width - 4, (h - 3) * 0.42, h / 4);
  g.fillStyle(0x4a2a0c, 0.7);
  for (let x = left + 14; x < width / 2 - 8; x += 20) {
    g.fillRect(x, top + h * 0.5, 10, 2);
  }
  g.fillStyle(0x4d7c0f, 1);
  g.fillEllipse(left + width * 0.32, top + 1, 18, 6);
  g.fillEllipse(left + width * 0.72, top + 2, 14, 5);
}

/** The rope-like body between a snake's branch and its head. */
function drawSnakeBody(
  g: Phaser.GameObjects.Graphics,
  p: Pendulum,
  headX: number,
  headY: number
): void {
  g.clear();
  // Branch it hangs from.
  g.fillStyle(0x422006, 1);
  g.fillRect(p.anchorX - 22, p.anchorY - 4, 44, 7);
  g.fillStyle(0x15803d, 1);
  g.fillEllipse(p.anchorX - 20, p.anchorY - 5, 16, 8);
  g.fillEllipse(p.anchorX + 20, p.anchorY - 5, 16, 8);

  // Body drawn as a chain of tapering segments along the swing arc.
  const segments = 7;
  for (let i = 1; i <= segments; i++) {
    const f = i / segments;
    const x = p.anchorX + (headX - p.anchorX) * f;
    const y = p.anchorY + (headY - p.anchorY) * f;
    const r = 4 + f * 3;
    g.fillStyle(i % 2 === 0 ? 0x166534 : 0x22c55e, 1);
    g.fillCircle(x, y, r);
  }
}
