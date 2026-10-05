// A titled list of traits, perks or gear with check marks; hover shows the description. Long lists scroll with the wheel.
import Phaser from 'phaser';
import { C, glass, hitRow, title, txt } from '../theme';
import type { InfoCard } from './InfoCard';
import { dragScroll } from '../touch';
import { settings } from '../../core/Settings';

export interface ListItem {
  id: string;
  name: string;
  desc: string;
  mark: 'on' | 'off' | 'none';
  dim?: boolean;
}

export class ListPanel {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private head: Phaser.GameObjects.Text;
  private items: ListItem[] = [];
  private empty = '';
  private offset = 0;

  constructor(
    private scene: Phaser.Scene,
    private parent: Phaser.GameObjects.Container,
    private x: number,
    private y: number,
    private w: number,
    private h: number,
    heading: string,
    private info: InfoCard,
    private onClick?: (id: string) => void,
    private rowH = 26,
  ) {
    this.head = title(scene, x + 14, y + 12, heading, 11, C.amber);
    parent.add([glass(scene, x, y, w, h), this.head]);
    const wheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (p.x < x || p.x > x + w || p.y < y || p.y > y + h || this.items.length <= this.capacity) return;
      this.offset = Phaser.Math.Clamp(this.offset + (dy > 0 ? 2 : -2), 0, this.items.length - this.capacity + ((this.items.length - this.capacity) % 2));
      this.render();
    };
    scene.input.on('wheel', wheel);
    const inside = (p: Phaser.Input.Pointer) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    const undrag = dragScroll(scene, (dy, p) => wheel(p, null, 0, dy), inside); // a finger scrolls like the wheel
    parent.once('destroy', () => {
      scene.input.off('wheel', wheel);
      undrag();
    });
  }

  /** Rows that fit: one column, or two when the list is longer. */
  private get rows(): number {
    return Math.max(1, Math.floor((this.h - 40) / this.rowH));
  }

  private get capacity(): number {
    return this.items.length > this.rows ? this.rows * 2 : this.rows;
  }

  setHeading(s: string): void {
    this.head.setText(s);
  }

  setItems(items: ListItem[], empty = ''): void {
    this.items = items;
    this.empty = empty;
    this.offset = Math.min(this.offset, Math.max(0, items.length - this.capacity));
    this.render();
  }

  private render(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
    const s = this.scene;
    const all = this.items;
    const items = all.slice(this.offset, this.offset + this.capacity);
    const cols = all.length > this.rows ? 2 : 1;
    const perCol = cols === 2 ? this.rows : Math.max(1, items.length);
    const cw = (this.w - 12) / cols;
    items.forEach((it, i) => {
      const cx = this.x + 6 + Math.floor(i / perCol) * cw;
      const ry = this.y + 38 + (i % perCol) * this.rowH;
      const hit = hitRow(s, cx, ry - 3, cw - 4, this.rowH - 2, () => this.info.show(it.name, it.desc), this.onClick ? () => this.onClick!(it.id) : undefined);
      const mark = it.mark === 'none' ? '·' : it.mark === 'on' ? '■' : '□';
      const fit = Math.floor((cw - 18) / 8.4); // mono 14 px: about 8.4 px a letter
      const name = it.name.length > fit ? `${it.name.slice(0, fit - 1)}…` : it.name;
      const t = txt(s, cx + 10, ry, `${mark} ${name}`, 14, it.mark === 'on' ? C.amber : it.dim ? C.crtDim : C.crt);
      this.objs.push(hit, t);
    });
    if (!all.length && this.empty) this.objs.push(txt(s, this.x + 16, this.y + 40, this.empty, 13, C.crtDim, this.w - 32));
    if (all.length > this.capacity) this.objs.push(txt(s, this.x + this.w - 10, this.y + 12, `${this.offset + 1}–${this.offset + items.length} ${settings().language === 'en' ? 'of' : 'из'} ${all.length} ↕`, 11, C.crtDim).setOrigin(1, 0));
    this.parent.add(this.objs);
  }
}
