// Description box: shows whatever row the pointer is over (Fallout's info card).
import Phaser from 'phaser';
import { C, glass, title, txt } from '../theme';

export class InfoCard {
  private head: Phaser.GameObjects.Text;
  private body: Phaser.GameObjects.Text;
  private fallback: [string, string] = ['', ''];

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number) {
    this.head = title(scene, x + 14, y + 12, '', 12, C.amber);
    this.body = txt(scene, x + 14, y + 36, '', 13, C.crt, w - 28);
    parent.add([glass(scene, x, y, w, h), this.head, this.body]);
  }

  show(head: string, body: string): void {
    this.head.setText(head.toUpperCase());
    this.body.setText(body);
  }

  setDefault(head: string, body: string): void {
    this.fallback = [head, body];
    this.reset();
  }

  reset(): void {
    this.show(...this.fallback);
  }
}
