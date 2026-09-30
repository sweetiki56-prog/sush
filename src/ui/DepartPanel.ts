// Co-op: someone is leading the party out of town. A countdown at the top and a button to ask to stay.
import Phaser from 'phaser';
import { GAME_W } from '../config';
import { C, button, glass, txt } from './theme';

const W = 440;
const H = 72;

export class DepartPanel {
  private box: Phaser.GameObjects.Container | null = null;

  constructor(
    private scene: Phaser.Scene,
    private onStay: () => void,
  ) {}

  /** `by` leads the party out (or to the area `where`) in `ms`; null calls it off. */
  show(by: string | null, ms: number, where?: string): void {
    this.box?.destroy();
    this.box = null;
    if (!by) return;
    const s = this.scene;
    const end = Date.now() + ms;
    const x = (GAME_W - W) / 2;
    const y = 56;
    const box = s.add.container(0, 0).setDepth(30);
    const line = txt(s, x + 16, y + 12, '', 14, C.crtBright, W - 32);
    const stay = button(s, x + W - 150, y + H - 34, 134, 24, 'ОСТАТЬСЯ', () => this.onStay());
    box.add([glass(s, x, y, W, H), line, stay.root]);
    const tick = () => line.setText(`${by} ведёт отряд ${where ? `в район «${where}»` : 'в путь'} через ${Math.max(0, Math.ceil((end - Date.now()) / 1000))} с.`);
    tick();
    const timer = s.time.addEvent({ delay: 250, loop: true, callback: tick });
    box.once('destroy', () => timer.remove());
    this.box = box;
  }
}
