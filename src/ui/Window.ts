// A modal window over the game: a dimmer that closes it, a rusted frame with glass, a title and a close button.
import Phaser from 'phaser';
import type { Game } from '../core/Game';
import { GAME_H, GAME_W } from '../config';
import { button, dimmer, glass, metalPanel, title } from './theme';

export abstract class Window {
  protected root: Phaser.GameObjects.Container | null = null;
  constructor(
    protected scene: Phaser.Scene,
    protected game: Game,
    protected onClose: () => void,
  ) {}
  get open(): boolean {
    return !!this.root;
  }
  close(): void {
    if (!this.root) return;
    this.root.destroy();
    this.root = null;
    this.onClose();
  }
  protected frame(w: number, h: number, heading: string): { x: number; y: number } {
    const s = this.scene;
    const x = (GAME_W - w) / 2;
    const y = (GAME_H - 116 - h) / 2;
    this.root = s.add.container(0, 0).setDepth(20);
    const dim = dimmer(s, 0.4).on('pointerdown', () => this.close());
    this.root.add([dim, metalPanel(s, x, y, w, h), glass(s, x + 16, y + 16, w - 32, h - 32), title(s, x + 32, y + 30, heading, 14)]);
    const b = button(s, x + w - 130, y + 24, 96, 24, 'ЗАКРЫТЬ', () => this.close());
    this.root.add(b.root);
    return { x, y };
  }
}
