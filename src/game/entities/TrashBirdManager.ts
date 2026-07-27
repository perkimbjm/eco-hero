import Phaser from 'phaser';
import {
  TRASH_BIRD_COOLDOWN_MS,
  TRASH_BIRD_DIVE_SPEED,
  TRASH_BIRD_RETURN_SPEED,
  TRASH_BIRD_SCORE,
  TRASH_BIRD_TELEGRAPH_MS,
} from '../constants';
import { COIN_REWARDS, XP_REWARDS } from '../progression';
import type { TrashBirdDef } from '../types';
import type { EntityHost } from './EntityHost';
import type { StunnableFlyer } from './RecycleVacuum';
import * as sound from '../sound';

const FLAP_ANIM = 'trashbird_flap';
const BODY_W = 34;
const BODY_H = 22;

type BirdState = 'perched' | 'telegraph' | 'dive' | 'returning';

interface BirdData {
  nestX: number;
  nestY: number;
  range: number;
  state: BirdState;
  stateUntil: number;
  nextDiveAt: number;
  diveX: number;
  diveY: number;
  alive: boolean;
  stunnedUntil: number;
}

interface BirdSprite extends Phaser.Physics.Arcade.Sprite {
  birdData: BirdData;
}

/**
 * Burung Pemakan Sampah — a scavenger that waits on its nest, drops on the
 * player when they wander into range, then climbs straight back home.
 *
 * The commit point is deliberate: it locks its dive target when the telegraph
 * ends, so the dive can always be side-stepped. It never pursues, which keeps
 * the summit's difficulty about reading timings rather than outrunning enemies.
 */
export class TrashBirdManager {
  readonly group: Phaser.Physics.Arcade.Group;

  private readonly host: EntityHost;
  private readonly scene: Phaser.Scene;

  constructor(host: EntityHost, defs: readonly TrashBirdDef[]) {
    this.host = host;
    this.scene = host.getScene();
    this.group = this.scene.physics.add.group();

    this.ensureAnimation();
    for (const def of defs) this.spawn(def);
  }

  private ensureAnimation(): void {
    if (this.scene.anims.exists(FLAP_ANIM)) return;
    this.scene.anims.create({
      key: FLAP_ANIM,
      frames: [{ key: 'bird_up' }, { key: 'bird_down' }],
      frameRate: 9,
      repeat: -1,
    });
  }

  private spawn(def: TrashBirdDef): void {
    // The nest is scenery, drawn under the bird.
    const nest = this.scene.add.image(def.x, def.y + 16, 'bird_nest');
    nest.setDepth(13);

    const sprite = this.scene.physics.add.sprite(def.x, def.y, 'bird_up') as BirdSprite;
    sprite.birdData = {
      nestX: def.x,
      nestY: def.y,
      range: def.range,
      state: 'perched',
      stateUntil: 0,
      nextDiveAt: this.scene.time.now + 900 + Math.random() * 1200,
      diveX: def.x,
      diveY: def.y,
      alive: true,
      stunnedUntil: 0,
    };
    sprite.setDepth(24);
    sprite.setSize(BODY_W, BODY_H);
    sprite.setOffset((sprite.width - BODY_W) / 2, (sprite.height - BODY_H) / 2);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    sprite.play(FLAP_ANIM);
    this.group.add(sprite);
  }

  update(): void {
    const now = this.scene.time.now;
    const player = this.host.player;

    this.group.getChildren().forEach((obj) => {
      const bird = obj as BirdSprite;
      const d = bird.birdData;
      if (!d?.alive || !bird.body) return;

      if (now < d.stunnedUntil) {
        bird.setVelocity(Math.sin(now / 200) * 22, Math.sin(now / 140) * 14);
        bird.setRotation(Math.sin(now / 170) * 0.4);
        return;
      }
      if (d.stunnedUntil > 0) {
        d.stunnedUntil = 0;
        d.nextDiveAt = now + TRASH_BIRD_COOLDOWN_MS;
        bird.clearTint();
        bird.setRotation(0);
        bird.play(FLAP_ANIM);
      }

      switch (d.state) {
        case 'perched': {
          // Settle onto the nest and hold still.
          bird.setVelocity((d.nestX - bird.x) * 3, (d.nestY - bird.y) * 3);
          const near = Phaser.Math.Distance.Between(bird.x, bird.y, player.x, player.y) <= d.range;
          if (near && now >= d.nextDiveAt && this.host.isPlaying()) {
            d.state = 'telegraph';
            d.stateUntil = now + TRASH_BIRD_TELEGRAPH_MS;
            this.telegraph(bird);
          }
          break;
        }

        case 'telegraph':
          bird.setVelocity(0, Math.sin(now / 45) * 30);
          if (now >= d.stateUntil) {
            // Target locked at commit time, so the dive is dodgeable.
            d.diveX = player.x;
            d.diveY = player.y;
            d.state = 'dive';
            this.launch(bird);
          }
          break;

        case 'dive': {
          const reached =
            Phaser.Math.Distance.Between(bird.x, bird.y, d.diveX, d.diveY) < 26 ||
            bird.y > d.diveY + 40;
          if (reached) {
            d.state = 'returning';
            bird.clearTint();
            bird.play(FLAP_ANIM);
          }
          break;
        }

        case 'returning': {
          const angle = Phaser.Math.Angle.Between(bird.x, bird.y, d.nestX, d.nestY);
          bird.setVelocity(
            Math.cos(angle) * TRASH_BIRD_RETURN_SPEED,
            Math.sin(angle) * TRASH_BIRD_RETURN_SPEED
          );
          if (Phaser.Math.Distance.Between(bird.x, bird.y, d.nestX, d.nestY) < 18) {
            d.state = 'perched';
            d.nextDiveAt = now + TRASH_BIRD_COOLDOWN_MS;
          }
          break;
        }
      }

      const vx = bird.body.velocity.x;
      if (Math.abs(vx) > 12) bird.setFlipX(vx > 0);
    });
  }

  private telegraph(bird: BirdSprite): void {
    bird.stop();
    bird.setTexture('bird_angry');
    bird.setTint(0xfca5a5);
    sound.playBirdCry();
    this.scene.tweens.add({
      targets: bird,
      scale: { from: 1, to: 1.16 },
      duration: TRASH_BIRD_TELEGRAPH_MS,
      yoyo: true,
      ease: 'Sine.inOut',
    });
  }

  private launch(bird: BirdSprite): void {
    const d = bird.birdData;
    const angle = Phaser.Math.Angle.Between(bird.x, bird.y, d.diveX, d.diveY);
    bird.setVelocity(Math.cos(angle) * TRASH_BIRD_DIVE_SPEED, Math.sin(angle) * TRASH_BIRD_DIVE_SPEED);
    this.host.burst(bird.x, bird.y, 0xa8a29e, 5);
  }

  handleContact(hit: Phaser.Physics.Arcade.Sprite): void {
    const bird = hit as BirdSprite;
    if (!bird.birdData?.alive || !this.host.isPlaying()) return;

    const player = this.host.player;
    if (!player.body || !bird.body) return;

    const playerBottom = player.y + player.body.halfHeight;
    const birdTop = bird.y - bird.body.halfHeight;
    const stomping =
      player.body.velocity.y > 0 && playerBottom - player.body.velocity.y * 0.02 <= birdTop + 12;

    if (stomping) {
      this.defeat(bird);
    } else if (this.scene.time.now < bird.birdData.stunnedUntil) {
      // Dazed birds are harmless.
    } else if (!this.host.isInvincible()) {
      this.host.damagePlayer(bird.x);
    }
  }

  private defeat(bird: BirdSprite): void {
    const d = bird.birdData;
    d.alive = false;
    bird.body!.enable = false;
    bird.setVelocity(0, 0);
    bird.stop();
    bird.setTexture('bird_down');
    bird.setTint(0x9ca3af);

    this.host.award({ score: TRASH_BIRD_SCORE, xp: XP_REWARDS.flyingEnemy, coins: COIN_REWARDS.flyingEnemy, flyingKill: true });
    this.host.bouncePlayer();
    this.host.burst(bird.x, bird.y, 0x78716c, 10);
    this.host.floatScore(bird.x, bird.y - 12, `+${TRASH_BIRD_SCORE}`, '#facc15');
    sound.playStomp();

    this.scene.tweens.add({
      targets: bird,
      alpha: 0,
      y: bird.y + 40,
      duration: 520,
      delay: 260,
      onComplete: () => bird.destroy(),
    });
  }

  /** Birds count as small flyers, so the Recycle Vacuum can daze them too. */
  stunnables(): StunnableFlyer[] {
    return this.group.getChildren().map((obj) => {
      const bird = obj as BirdSprite;
      return {
        sprite: bird,
        stun: (untilMs: number) => {
          bird.birdData.stunnedUntil = untilMs;
          bird.birdData.state = 'returning';
          bird.stop();
          bird.setTexture('bird_up');
          bird.setTint(0x86efac);
          bird.setVelocity(0, 0);
        },
        isStunned: () => this.scene.time.now < bird.birdData.stunnedUntil,
        isAlive: () => !!bird.birdData?.alive,
      };
    });
  }
}
