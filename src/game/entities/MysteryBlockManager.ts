import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GRAVITY,
  MAX_FALL_SPEED,
  MYSTERY_BLOCK_BUMP_MS,
  MYSTERY_BLOCK_BUMP_PX,
  MYSTERY_BLOCK_SIZE,
  POWERUP_EMERGE_MS,
  POWERUP_FOOTING_PROBE_PX,
  POWERUP_EXPIRY_WARNING_MS,
  POWERUP_INFO,
  POWERUP_LEDGE_PROBE_PX,
  POWERUP_LIFETIME_MS,
  POWERUP_WALK_SPEED,
} from '../constants';
import type { MysteryBlockDef, PowerUpKind } from '../types';
import type { EntityHost } from './EntityHost';
import * as sound from '../sound';

/** Half-size of the power-up sprites, used to seat them on top of the block. */
const ITEM_HALF = 14;
/** Hitbox of an item — a touch smaller than the art so pickups feel fair. */
const ITEM_BODY = 22;
/** Keeps a walking item clear of the level's left/right edges. */
const WORLD_MARGIN = 24;
/** Depths: the item slides out from *behind* the block. */
const BLOCK_DEPTH = 18;
const ITEM_DEPTH = 16;
/**
 * A surface must be this many item-widths across before the ledge guard treats
 * it as patrollable. Anything narrower (a block lid) cannot be walked on
 * without the guard flipping the item every frame, so it drops off instead.
 */
const MIN_PATROL_WIDTH_RATIO = 3;

type WalkDir = 1 | -1;
type SolidBody = Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;

interface PowerUpSprite extends Phaser.Physics.Arcade.Sprite {
  powerData: {
    kind: PowerUpKind;
    dir: WalkDir;
    /** False while the item is still rising out of the block. */
    walking: boolean;
    collected: boolean;
    /** Last position where the item was confirmed standing on solid ground. */
    safeX: number;
    safeY: number;
    /** When the item fades out of play; set once it starts walking. */
    expiresAt: number;
    /** True once it has been eaten by pollution or has timed out. */
    lost: boolean;
  };
}

interface BlockSkin {
  idle: string;
  used: string;
  /** Whether the block advertises itself with a slow pulse. */
  shimmer: boolean;
}

/** How each disguise is dressed. Only the crate gives itself away. */
const BLOCK_SKINS: Record<'crate' | 'stump' | 'boulder', BlockSkin> = {
  crate: { idle: 'mystery_block', used: 'mystery_block_used', shimmer: true },
  stump: { idle: 'mystery_stump', used: 'mystery_stump_used', shimmer: false },
  boulder: { idle: 'mystery_boulder', used: 'mystery_boulder_used', shimmer: false },
};

interface MysteryBlock {
  def: MysteryBlockDef;
  sprite: Phaser.Physics.Arcade.Sprite;
  restY: number;
  opened: boolean;
  skin: BlockSkin;
}

export interface MysteryBlockContext {
  levelWidth: number;
  movingPlatforms?: Phaser.Physics.Arcade.Group;
  /** Fired once the player actually touches the item. */
  onCollect: (kind: PowerUpKind, x: number, y: number) => void;
}

/**
 * Hidden "?" blocks and the eco power-ups they hold — the Super Mario beat,
 * retold with recycling props.
 *
 * The item's movement is the fiddly part, so it is pinned down deliberately:
 *
 *   - velocity is re-applied every frame, because a collision zeroes it and an
 *     item that is only pushed once quietly stops (or keeps a stale direction);
 *   - direction flips on `blocked.left/right`, so walls and bricks turn it;
 *   - a ledge probe looks one body-width ahead for footing and turns the item
 *     around *before* it can walk off a platform;
 *   - `rescue()` is the last line of defence: if the item ever ends up below
 *     the world or outside the level, it is put back on its last safe footing
 *     instead of being destroyed. A power-up can only ever leave play by being
 *     picked up.
 */
export class MysteryBlockManager {
  readonly blockGroup: Phaser.Physics.Arcade.StaticGroup;
  readonly itemGroup: Phaser.Physics.Arcade.Group;

  private readonly host: EntityHost;
  private readonly scene: Phaser.Scene;
  private readonly ctx: MysteryBlockContext;
  private readonly blocks: MysteryBlock[] = [];
  private readonly items: PowerUpSprite[] = [];

  constructor(host: EntityHost, defs: readonly MysteryBlockDef[], ctx: MysteryBlockContext) {
    this.host = host;
    this.scene = host.getScene();
    this.ctx = ctx;

    this.blockGroup = this.scene.physics.add.staticGroup();
    this.itemGroup = this.scene.physics.add.group();

    for (const def of defs) {
      this.createBlock(def);
    }

    this.registerColliders();
  }

  // ── Blocks ──────────────────────────────────────────────────

  private createBlock(def: MysteryBlockDef): void {
    const half = MYSTERY_BLOCK_SIZE / 2;
    const cx = def.x + half;
    const cy = def.y + half;
    const skin = BLOCK_SKINS[def.disguise ?? 'crate'];

    const sprite = this.blockGroup.create(cx, cy, skin.idle) as Phaser.Physics.Arcade.Sprite;
    sprite.setOrigin(0.5, 0.5);
    sprite.refreshBody();
    sprite.setDepth(BLOCK_DEPTH);

    const block: MysteryBlock = { def, sprite, restY: cy, opened: false, skin };
    this.blocks.push(block);

    if (skin.shimmer) {
      // The obvious crate pulses to invite a jump. A disguised block gets no
      // tell at all — finding it is the reward for being curious about a stump
      // sitting somewhere a stump has no reason to be.
      this.scene.tweens.add({
        targets: sprite,
        alpha: { from: 0.82, to: 1 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  private registerColliders(): void {
    const player = this.host.player;

    // Blocks are solid: stand on them, bonk them from below.
    this.scene.physics.add.collider(player, this.blockGroup, (_p, b) => {
      this.handleBlockContact(b as Phaser.Physics.Arcade.Sprite);
    });

    // The item needs real ground under it — that is what stops it falling out
    // of the level.
    this.scene.physics.add.collider(this.itemGroup, this.host.getPlatforms());
    this.scene.physics.add.collider(this.itemGroup, this.blockGroup);
    if (this.ctx.movingPlatforms) {
      this.scene.physics.add.collider(this.itemGroup, this.ctx.movingPlatforms);
    }

    // Overlap, not collide: the player walks through the item and picks it up
    // rather than shoving it around.
    this.scene.physics.add.overlap(player, this.itemGroup, (_p, i) => {
      this.collect(i as PowerUpSprite);
    });

    this.scene.events.once('shutdown', () => this.destroy());
  }

  private handleBlockContact(sprite: Phaser.Physics.Arcade.Sprite): void {
    if (!this.host.isPlaying()) return;

    const block = this.blocks.find((b) => b.sprite === sprite);
    if (!block || block.opened) return;

    const body = this.host.player.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    // Only a head-butt from underneath opens it.
    if (!body.blocked.up && !body.touching.up) return;
    if (sprite.y >= this.host.player.y) return;

    this.openBlock(block);
  }

  private openBlock(block: MysteryBlock): void {
    // Guarded here as well as in the contact handler: a block yields exactly one
    // item, no matter how many times a collision pair reports contact.
    if (block.opened) return;
    block.opened = true;
    block.sprite.setTexture(block.skin.used);
    this.scene.tweens.killTweensOf(block.sprite);
    block.sprite.setAlpha(1);
    sound.playBlockBump();

    // Mario's block kick. The static body is left where it is for the ~220ms of
    // the tween — the player is underneath it, so a frozen body is the safe
    // choice — then snapped back and refreshed.
    this.scene.tweens.add({
      targets: block.sprite,
      y: block.restY - MYSTERY_BLOCK_BUMP_PX,
      duration: MYSTERY_BLOCK_BUMP_MS,
      yoyo: true,
      ease: 'Quad.out',
      onComplete: () => {
        block.sprite.y = block.restY;
        block.sprite.refreshBody();
      },
    });

    this.host.burst(block.sprite.x, block.def.y, POWERUP_INFO[block.def.item].main, 10);
    this.releaseItem(block);
  }

  // ── The item ────────────────────────────────────────────────

  private releaseItem(block: MysteryBlock): void {
    const kind = block.def.item;
    const x = block.sprite.x;
    // Starts hidden inside the block and rises until it rests on the lid.
    const fromY = block.def.y + MYSTERY_BLOCK_SIZE / 2;
    const toY = block.def.y - ITEM_HALF;

    const item = this.scene.physics.add.sprite(x, fromY, `powerup_${kind}`) as PowerUpSprite;
    item.powerData = {
      kind,
      dir: x > this.ctx.levelWidth - 240 ? -1 : 1,
      walking: false,
      collected: false,
      safeX: x,
      safeY: toY,
      expiresAt: 0,
      lost: false,
    };
    item.setDepth(ITEM_DEPTH);
    item.setSize(ITEM_BODY, ITEM_BODY);
    item.setCollideWorldBounds(true);
    item.setBounce(0);

    const body = item.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    // Disabled while emerging so nothing can push, drop or collide with an item
    // that is still animating out of the block.
    body.enable = false;

    this.itemGroup.add(item);
    this.items.push(item);
    sound.playBlockReveal();

    this.scene.tweens.add({
      targets: item,
      y: toY,
      duration: POWERUP_EMERGE_MS,
      ease: 'Back.out',
      onComplete: () => this.startWalking(item),
    });

    // A glow that fades as the item clears the block, so the reveal reads.
    const glow = this.scene.add.circle(x, block.def.y, 6, POWERUP_INFO[kind].main, 0.55);
    glow.setDepth(ITEM_DEPTH - 1);
    this.scene.tweens.add({
      targets: glow,
      scale: 5,
      alpha: 0,
      duration: POWERUP_EMERGE_MS,
      onComplete: () => glow.destroy(),
    });
  }

  private startWalking(item: PowerUpSprite): void {
    if (!item.active || item.powerData.collected) return;

    const body = item.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(item.x, item.y);
    body.setAllowGravity(true);
    body.setGravityY(GRAVITY);
    body.setMaxVelocity(POWERUP_WALK_SPEED * 2, MAX_FALL_SPEED);
    body.setVelocity(item.powerData.dir * POWERUP_WALK_SPEED, 0);

    item.powerData.walking = true;
    item.powerData.safeX = item.x;
    item.powerData.safeY = item.y;
    // The countdown starts here, not at the block bump: the emerge animation
    // should not eat into the window the player has to reach it.
    item.powerData.expiresAt = this.scene.time.now + POWERUP_LIFETIME_MS;

    this.scene.tweens.add({
      targets: item,
      angle: { from: -6, to: 6 },
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  update(): void {
    // Anything that lost its sprite (scene teardown, a stray destroy) is dropped
    // rather than carried as a dead entry for the rest of the level.
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (!item.active || !item.body) {
        this.items.splice(i, 1);
        continue;
      }
      this.updateItem(item);
    }
  }

  private updateItem(item: PowerUpSprite): void {
    const data = item.powerData;
    if (!item.active || data.collected || data.lost || !data.walking) return;

    const body = item.body as Phaser.Physics.Arcade.Body | null;
    if (!body || !body.enable) return;

    // Nine seconds in play, then it is gone.
    const now = this.scene.time.now;
    const remaining = data.expiresAt - now;
    if (remaining <= 0) {
      this.expire(item);
      return;
    }
    // Blink through the last stretch so running out never feels arbitrary.
    item.setAlpha(remaining > POWERUP_EXPIRY_WARNING_MS || Math.floor(remaining / 130) % 2 === 0 ? 1 : 0.35);

    // Should never happen now that the item collides with the platforms, but if
    // physics ever drops it the item is recovered, never lost.
    if (item.y > GAME_HEIGHT + 40 || item.x < WORLD_MARGIN / 2 || item.x > this.ctx.levelWidth - WORLD_MARGIN / 2) {
      this.rescue(item);
      return;
    }

    // Walls and bricks turn it around.
    if (body.blocked.left || body.touching.left) {
      data.dir = 1;
    } else if (body.blocked.right || body.touching.right) {
      data.dir = -1;
    }

    if (body.blocked.down) {
      // Standing on something solid: remember it, then look ahead for a ledge.
      data.safeX = item.x;
      data.safeY = item.y;

      // The ledge guard only applies on a surface wide enough to actually walk
      // on. A block lid is a single tile — narrower than the item's own stride —
      // so guarding it would flip the item every frame and pin it on the lid.
      // There it should walk off and drop, exactly like a Super Mario mushroom
      // leaving its box; the guard resumes on the platform it lands on.
      const support = this.supportUnder(item, body);
      if (support && support.width >= body.width * MIN_PATROL_WIDTH_RATIO) {
        const stride = body.halfWidth + POWERUP_LEDGE_PROBE_PX;
        if (!this.hasFootingAt(item.x + data.dir * stride, body.bottom)) {
          data.dir = data.dir === 1 ? -1 : 1;
        }
      }
    }

    // Keep it inside the playable strip even if world bounds are ever relaxed.
    if (item.x <= WORLD_MARGIN) data.dir = 1;
    else if (item.x >= this.ctx.levelWidth - WORLD_MARGIN) data.dir = -1;

    // Re-applied every frame: a collision zeroes velocity.x, and an item that is
    // only pushed once ends up stuck against a wall or drifting one way forever.
    body.setVelocityX(data.dir * POWERUP_WALK_SPEED);
    item.setFlipX(data.dir < 0);
  }

  /** Every solid the item can stand on, in one list. */
  private solids(): Phaser.GameObjects.GameObject[] {
    return [
      ...this.host.getPlatforms().getChildren(),
      ...this.blockGroup.getChildren(),
      ...(this.ctx.movingPlatforms?.getChildren() ?? []),
    ];
  }

  /** The solid covering the probe point just under (x, feetY), if any. */
  private solidAt(x: number, feetY: number): SolidBody | null {
    const probeY = feetY + POWERUP_FOOTING_PROBE_PX;
    for (const obj of this.solids()) {
      const body = (obj as Phaser.Physics.Arcade.Sprite).body;
      if (!body || !body.enable) continue;
      if (x < body.left || x > body.right) continue;
      if (probeY < body.top - 2 || probeY > body.bottom) continue;
      return body;
    }
    return null;
  }

  private hasFootingAt(x: number, feetY: number): boolean {
    return this.solidAt(x, feetY) !== null;
  }

  /**
   * What the item is standing on. Both edges are probed as well as the centre,
   * so an item halfway off a ledge still reports the surface it came from.
   */
  private supportUnder(item: PowerUpSprite, body: Phaser.Physics.Arcade.Body): SolidBody | null {
    return (
      this.solidAt(item.x, body.bottom) ??
      this.solidAt(body.left, body.bottom) ??
      this.solidAt(body.right, body.bottom)
    );
  }

  /** Puts a stray item back on its last confirmed footing, walking the other way. */
  private rescue(item: PowerUpSprite): void {
    const data = item.powerData;
    const body = item.body as Phaser.Physics.Arcade.Body;
    const x = Phaser.Math.Clamp(data.safeX, WORLD_MARGIN, this.ctx.levelWidth - WORLD_MARGIN);
    const y = Math.min(data.safeY, GAME_HEIGHT - 100);

    body.reset(x, y);
    body.setVelocity(0, 0);
    data.dir = data.dir === 1 ? -1 : 1;
    this.host.burst(x, y, POWERUP_INFO[data.kind].main, 8);
  }

  /** The window closed — the item dissolves and the chance is gone. */
  private expire(item: PowerUpSprite): void {
    const data = item.powerData;
    if (data.lost || data.collected) return;
    data.lost = true;

    this.detach(item, 360);
    sound.playPowerDown();
    this.host.burst(item.x, item.y, 0x94a3b8, 10);
    this.host.floatScore(item.x, item.y - 14, 'Hilang!', '#cbd5e1');

    this.scene.tweens.add({
      targets: item,
      alpha: 0,
      scale: 0.4,
      y: item.y - 14,
      duration: 320,
    });
  }

  /**
   * Pollution reached the item first. The item is destroyed and the enemy that
   * swallowed it is supercharged — the manager only reports it; growing the
   * enemy is the scene's job, since it owns enemy state.
   */
  absorbedByEnemy(hit: Phaser.Physics.Arcade.Sprite): boolean {
    const item = hit as PowerUpSprite;
    const data = item.powerData;
    if (!data || data.collected || data.lost || !data.walking) return false;
    data.lost = true;

    this.detach(item, 280);
    sound.playPowerCorrupt();
    this.host.burst(item.x, item.y, 0x7e22ce, 16);

    this.scene.tweens.add({
      targets: item,
      alpha: 0,
      scale: 0.3,
      duration: 240,
    });
    return true;
  }

  /**
   * Takes an item out of play immediately — body off, out of the group, out of
   * the update list — and guarantees the sprite is gone shortly after.
   *
   * The removal must not depend on the fade tween's onComplete: an interrupted
   * tween would leave a half-faded, uncollectable ghost sitting in the level.
   * The timer is driven by the scene clock, which always advances.
   */
  private detach(item: PowerUpSprite, destroyAfterMs: number): void {
    this.scene.tweens.killTweensOf(item);
    if (item.body) item.body.enable = false;
    this.itemGroup.remove(item);
    const index = this.items.indexOf(item);
    if (index >= 0) this.items.splice(index, 1);
    this.scene.time.delayedCall(destroyAfterMs, () => item.destroy());
  }

  private collect(item: PowerUpSprite): void {
    const data = item.powerData;
    if (data.collected || data.lost || !data.walking) return;
    data.collected = true;

    this.scene.tweens.killTweensOf(item);
    const x = item.x;
    const y = item.y;
    const index = this.items.indexOf(item);
    if (index >= 0) this.items.splice(index, 1);
    item.destroy();

    this.ctx.onCollect(data.kind, x, y);
  }

  private destroy(): void {
    for (const item of this.items) {
      this.scene.tweens.killTweensOf(item);
    }
    this.items.length = 0;
    this.blocks.length = 0;
  }
}
