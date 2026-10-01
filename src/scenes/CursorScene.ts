// Always-on top-level scene: draws the styled pixel cursor over every other scene
// (menu, dossier, prologue, world, UI). The system cursor is hidden via `canvas { cursor: none; }`.
import Phaser from 'phaser';
import { session, type Hover } from '../session';
import { TOUCH } from '../ui/touch';

export class CursorScene extends Phaser.Scene {
  private pointer!: Phaser.GameObjects.Image;
  private hovering: Hover | null = null;

  constructor() {
    super('Cursor');
  }

  create(): void {
    this.pointer = this.add.image(0, 0, 'atlas', 'pointer').setOrigin(0, 0);
    session().ui.on('hover', (h) => (this.hovering = h));
  }

  update(): void {
    const p = this.input.activePointer;
    // a finger needs no arrow: it would be left hanging where the last tap was
    this.pointer.setVisible(!TOUCH && !p.wasTouch);
    this.pointer.setPosition(p.x, p.y).setFrame(this.hovering?.interact ? 'hand' : 'pointer');
  }
}
