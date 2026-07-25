import Phaser from 'phaser';
import { GAME_WIDTH } from '../constants';

const HUD_DEPTH = 200;
const BAR_WIDTH = 320;
const BAR_HEIGHT = 16;

/**
 * Screen-fixed boss bar: name, segmented health, and the current objective line
 * that walks the player through the recycle-then-strike loop.
 */
export class BossHud {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private readonly segments: Phaser.GameObjects.Rectangle[] = [];
  private readonly taskText: Phaser.GameObjects.Text;
  private readonly maxHp: number;
  private lastTask = '';

  constructor(scene: Phaser.Scene, name: string, maxHp: number) {
    this.scene = scene;
    this.maxHp = maxHp;

    const cx = GAME_WIDTH / 2;
    const panel = scene.add.rectangle(cx, 40, BAR_WIDTH + 44, 74, 0x0c0a09, 0.72);
    panel.setStrokeStyle(2, 0x84cc16, 0.8);

    const title = scene.add.text(cx, 16, name.toUpperCase(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#fde047',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    title.setShadow(2, 2, 'rgba(0,0,0,0.8)', 3);

    const barBg = scene.add.rectangle(cx, 38, BAR_WIDTH, BAR_HEIGHT, 0x1c1917, 1);
    barBg.setStrokeStyle(2, 0x44403c, 1);

    this.barFill = scene.add.rectangle(cx - BAR_WIDTH / 2 + 2, 38, BAR_WIDTH - 4, BAR_HEIGHT - 4, 0xdc2626, 1);
    this.barFill.setOrigin(0, 0.5);

    this.taskText = scene.add.text(cx, 62, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#bbf7d0',
      fontStyle: 'bold',
      align: 'center',
    });
    this.taskText.setOrigin(0.5);
    this.taskText.setShadow(2, 2, 'rgba(0,0,0,0.8)', 3);

    this.container = scene.add.container(0, 0, [panel, title, barBg, this.barFill, this.taskText]);

    // Tick marks so each phase reads as one recycled hit.
    for (let i = 1; i < maxHp; i++) {
      const x = cx - BAR_WIDTH / 2 + (BAR_WIDTH * i) / maxHp;
      const tick = scene.add.rectangle(x, 38, 2, BAR_HEIGHT, 0x0c0a09, 1);
      this.segments.push(tick);
      this.container.add(tick);
    }

    this.container.setScrollFactor(0);
    this.container.setDepth(HUD_DEPTH);
    this.container.setAlpha(0);
    this.container.setVisible(false);
  }

  show(): void {
    if (this.container.visible) return;
    this.container.setVisible(true);
    this.container.setY(-40);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: 0,
      duration: 400,
      ease: 'Back.out',
    });
  }

  hide(): void {
    if (!this.container.visible) return;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      y: -40,
      duration: 400,
      onComplete: () => this.container.setVisible(false),
    });
  }

  setHp(hp: number): void {
    const pct = Phaser.Math.Clamp(hp / this.maxHp, 0, 1);
    this.scene.tweens.add({
      targets: this.barFill,
      displayWidth: (BAR_WIDTH - 4) * pct,
      duration: 350,
      ease: 'Cubic.out',
    });
    this.barFill.setFillStyle(pct > 0.6 ? 0xdc2626 : pct > 0.3 ? 0xf97316 : 0xfacc15);
  }

  setTask(text: string, color = '#bbf7d0'): void {
    if (text === this.lastTask) return;
    this.lastTask = text;
    this.taskText.setText(text);
    this.taskText.setColor(color);
    this.scene.tweens.add({
      targets: this.taskText,
      scale: { from: 1.18, to: 1 },
      duration: 260,
      ease: 'Back.out',
    });
  }

  destroy(): void {
    this.container.destroy(true);
    this.segments.length = 0;
  }
}
