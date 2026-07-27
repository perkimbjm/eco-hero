import Phaser from 'phaser';
import { CRUMBLE_DELAY_MS, CRUMBLE_FALL_MS, CRUMBLE_RESPAWN_MS, TILE } from '../constants';
import type { CrumblingRockDef } from '../types';
import type { EntityHost } from './EntityHost';
import * as sound from '../sound';

type RockState = 'solid' | 'shaking' | 'gone';

interface CrumblingRock {
  def: CrumblingRockDef;
  sprite: Phaser.Physics.Arcade.Sprite;
  gfx: Phaser.GameObjects.Graphics;
  state: RockState;
  /** When the current state ends. */
  until: number;
  restX: number;
  restY: number;
}

/**
 * Stone shelves that give way shortly after they take weight.
 *
 * The shelf always shakes and cracks for CRUMBLE_DELAY_MS before it drops, so a
 * player who watches the ledge is never caught out — the pressure is on keeping
 * moving, not on guessing. Every shelf reforms a few seconds later, so a
 * mistimed crossing costs momentum rather than the run.
 */
export class CrumblingRockManager {
  readonly group: Phaser.Physics.Arcade.StaticGroup;

  private readonly host: EntityHost;
  private readonly scene: Phaser.Scene;
  private readonly rocks: CrumblingRock[] = [];

  constructor(host: EntityHost, defs: readonly CrumblingRockDef[]) {
    this.host = host;
    this.scene = host.getScene();
    this.group = this.scene.physics.add.staticGroup();

    for (const def of defs) this.create(def);
    this.scene.events.once('shutdown', () => this.rocks.length = 0);
  }

  private create(def: CrumblingRockDef): void {
    const restX = def.x + def.width / 2;
    const restY = def.y + TILE / 2;

    const gfx = this.scene.add.graphics();
    gfx.setDepth(14);
    drawRock(gfx, def.width, TILE, 'solid');
    gfx.setPosition(def.x, def.y);

    const sprite = this.group.create(restX, restY, '__white') as Phaser.Physics.Arcade.Sprite;
    sprite.setDisplaySize(def.width, TILE);
    sprite.setOrigin(0.5, 0.5);
    sprite.refreshBody();
    sprite.setVisible(false);

    this.rocks.push({ def, sprite, gfx, state: 'solid', until: 0, restX, restY });
  }

  /** Called from the player/rock collider; starts the countdown on contact. */
  handleContact(hit: Phaser.Physics.Arcade.Sprite): void {
    const rock = this.rocks.find((r) => r.sprite === hit);
    if (!rock || rock.state !== 'solid') return;

    const body = this.host.player.body;
    // Only weight from above triggers it — brushing the side is harmless.
    if (!body || (!body.blocked.down && !body.touching.down)) return;
    if (this.host.player.y > rock.sprite.y) return;

    rock.state = 'shaking';
    rock.until = this.scene.time.now + CRUMBLE_DELAY_MS;
    sound.playRockCrack();
  }

  update(): void {
    const now = this.scene.time.now;

    for (const rock of this.rocks) {
      if (rock.state === 'shaking') {
        // Rattle in place and crack visibly while the fuse burns down.
        const jitter = Math.sin(now / 26) * 2;
        rock.gfx.setPosition(rock.def.x + jitter, rock.def.y);
        drawRock(rock.gfx, rock.def.width, TILE, 'cracking');

        if (now >= rock.until) this.collapse(rock, now);
      } else if (rock.state === 'gone' && now >= rock.until) {
        this.reform(rock);
      }
    }
  }

  private collapse(rock: CrumblingRock, now: number): void {
    rock.state = 'gone';
    rock.until = now + CRUMBLE_RESPAWN_MS;

    // Body off first, so the player starts falling the instant it lets go.
    rock.sprite.body!.enable = false;
    sound.playRockFall();
    this.host.burst(rock.restX, rock.restY, 0x78716c, 12);

    this.scene.tweens.add({
      targets: rock.gfx,
      y: rock.def.y + 90,
      alpha: 0,
      duration: CRUMBLE_FALL_MS,
      ease: 'Quad.in',
    });
  }

  private reform(rock: CrumblingRock): void {
    rock.state = 'solid';
    rock.sprite.body!.enable = true;
    this.scene.tweens.killTweensOf(rock.gfx);
    rock.gfx.setPosition(rock.def.x, rock.def.y);
    drawRock(rock.gfx, rock.def.width, TILE, 'solid');
    rock.gfx.setAlpha(0);
    this.scene.tweens.add({ targets: rock.gfx, alpha: 1, duration: 260 });
    this.host.burst(rock.restX, rock.restY, 0xa8a29e, 6);
  }
}

/** A slab of grey mountain rock; the cracking pose adds fracture lines. */
function drawRock(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  pose: 'solid' | 'cracking'
): void {
  g.clear();
  g.fillStyle(0x1c1917, 1);
  g.fillRect(0, 4, width, height);
  g.fillStyle(pose === 'cracking' ? 0x6b5f58 : 0x57534e, 1);
  g.fillRect(0, 0, width, height - 3);
  g.fillStyle(pose === 'cracking' ? 0x8a7d74 : 0x78716c, 1);
  g.fillRect(0, 0, width, 5);
  g.fillStyle(0xa8a29e, 0.7);
  g.fillRect(3, 1, width * 0.3, 3);

  if (pose === 'cracking') {
    g.fillStyle(0x0c0a09, 0.9);
    for (let x = 10; x < width - 6; x += 26) {
      g.fillRect(x, 4, 2, height - 10);
      g.fillRect(x + 2, height * 0.5, 9, 2);
    }
  }
}
