// A clipped region of a window whose content scrolls: the mouse wheel over it, dragging it, or the arrow and page
// keys; a thin bar on the right shows where you are. Content is laid out in screen coordinates as if unclipped;
// what scrolls out of the box is hidden and stops taking clicks.
import Phaser from 'phaser';
import { C } from './theme';
import { onKey } from './keys';

const STEP = 40; // px per wheel notch or arrow key
const BAR_W = 4;

export class ScrollBox {
  readonly content: Phaser.GameObjects.Container;
  private bar: Phaser.GameObjects.Graphics;
  private offset = 0;
  private height = 0;
  private drag: { y: number; offset: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number,
    keys = false,
  ) {
    this.content = scene.add.container(0, 0);
    const shape = scene.make.graphics({}, false);
    shape.fillStyle(0xffffff).fillRect(x, y, w, h);
    this.content.setMask(shape.createGeometryMask());
    this.bar = scene.add.graphics();
    parent.add([this.content, this.bar]);

    const inside = (p: Phaser.Input.Pointer) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    const wheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) =>
      inside(p) && this.by(dy > 0 ? STEP : -STEP);
    const down = (p: Phaser.Input.Pointer) => {
      if (inside(p) && this.max > 0) this.drag = { y: p.y, offset: this.offset };
    };
    const move = (p: Phaser.Input.Pointer) => {
      if (this.drag && p.isDown) this.to(this.drag.offset - (p.y - this.drag.y));
    };
    const up = () => (this.drag = null);
    scene.input.on('wheel', wheel);
    scene.input.on('pointerdown', down);
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', up);
    const offKeys = keys
      ? onKey(scene, (e) => {
          const page = h - STEP;
          const d = {
            ArrowDown: STEP,
            ArrowUp: -STEP,
            PageDown: page,
            PageUp: -page,
            Home: -Infinity,
            End: Infinity,
          }[e.key];
          if (d !== undefined) this.by(d);
        })
      : () => {};
    parent.once('destroy', () => {
      offKeys();
      scene.input.off('wheel', wheel);
      scene.input.off('pointerdown', down);
      scene.input.off('pointermove', move);
      scene.input.off('pointerup', up);
      shape.destroy();
    });
  }

  private get max(): number {
    return Math.max(0, this.height - this.h);
  }

  /** The content is this tall now (call after adding to it). */
  fit(contentHeight: number): void {
    this.height = contentHeight;
    this.to(this.offset);
  }

  by(dy: number): void {
    this.to(this.offset + dy);
  }

  to(offset: number): void {
    this.offset = Phaser.Math.Clamp(offset, 0, this.max);
    this.content.y = -this.offset;
    // what is out of sight takes no clicks
    for (const o of this.content.list as (Phaser.GameObjects.GameObject & { y: number; height?: number })[]) {
      if (!o.input) continue;
      const top = o.y - this.offset;
      o.input.enabled = top + (o.height ?? 0) > this.y && top < this.y + this.h;
    }
    this.drawBar();
  }

  /** Keep the bottom in view (text still being typed). */
  toEnd(): void {
    this.to(Infinity);
  }

  private drawBar(): void {
    const g = this.bar.clear();
    if (this.max <= 0) return;
    const len = Math.max(24, (this.h * this.h) / this.height);
    const at = this.y + ((this.h - len) * this.offset) / this.max;
    g.fillStyle(Phaser.Display.Color.HexStringToColor(C.crtDim).color, 0.5).fillRect(
      this.x + this.w - BAR_W,
      this.y,
      BAR_W,
      this.h,
    );
    g.fillStyle(Phaser.Display.Color.HexStringToColor(C.crt).color, 0.9).fillRect(
      this.x + this.w - BAR_W,
      at,
      BAR_W,
      len,
    );
  }
}
