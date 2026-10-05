// The spoils of a road battle: what the fallen carried, in one pile for the whole party.
// A click takes one kind, «Взять всё» takes the lot; closing the window sets off back onto the road.
import Phaser from 'phaser';
import { C, button, glass, hitRow, txt } from './theme';
import { itemStats } from './itemText';
import { Window } from './Window';
import { ScrollBox } from './ScrollBox';
import { settings } from '../core/Settings';
import { contentText } from '../i18n/display';
import { uiText } from '../i18n/ui';

const W = 640;
const H = 470;
const ROWS = 9;
const ROW_H = 34;

export class Loot extends Window {
  onTake: (item?: string) => void = () => {};
  onDone: () => void = () => {};
  private items: Record<string, number> = {};
  private body: Phaser.GameObjects.Container | null = null;
  private at = { x: 0, y: 0 };
  private quiet = false; // closed by the room (the pile is gone): nothing to send

  /** Show the pile, or redraw it if the window is already open. */
  showPile(items: Record<string, number>): void {
    this.items = items;
    if (!this.root) this.at = this.frame(W, H, uiText('loot.title', settings().language));
    this.draw();
  }

  /** The room took the party back to the road. */
  gone(): void {
    this.quiet = true;
    this.close();
    this.quiet = false;
  }

  close(): void {
    if (!this.root) return;
    this.body = null;
    super.close();
    if (!this.quiet) this.onDone();
  }

  private draw(): void {
    const s = this.scene;
    const g = this.game;
    const locale = settings().language;
    const { x, y } = this.at;
    this.body?.destroy();
    const body = (this.body = s.add.container(0, 0));
    this.root!.add(body);
    body.add(glass(s, x + 32, y + 64, W - 64, ROWS * ROW_H + 16));
    const list = Object.entries(this.items).filter(([, n]) => n > 0);
    // a big pile scrolls inside its glass
    const box = new ScrollBox(s, body, x + 34, y + 68, W - 68, ROWS * ROW_H + 8);
    list.forEach(([id, n], i) => {
      const ry = y + 72 + i * ROW_H;
      const def = g.content.items[id];
      const stats = itemStats(g.content, id, locale);
      box.content.add([
        s.add.image(x + 56, ry + 15, 'atlas', def?.icon ?? 'icon_note'),
        txt(s, x + 80, ry + 6, `${def ? contentText(`/items/${id}/name`, def.name, locale) : id} ×${n}`, 14, C.crtBright),
        txt(s, x + W - 48, ry + 8, stats ? stats.split('\n')[0] : '', 11, C.crtDim).setOrigin(1, 0),
        hitRow(s, x + 36, ry, W - 72, ROW_H - 2, () => {}, () => this.onTake(id)),
      ]);
    });
    box.fit(list.length * ROW_H + 8);
    if (!list.length) body.add(txt(s, x + 48, y + 80, uiText('loot.empty', locale), 14, C.crtDim));
    else if (list.length > ROWS) body.add(txt(s, x + 48, y + 72 + ROWS * ROW_H + 20, uiText('loot.more', locale).replace('{count}', String(list.length - ROWS)), 12, C.crtDim));
    body.add(txt(s, x + 32, y + H - 58, uiText('loot.help', locale), 12, C.crtDim));
    const all = button(s, x + W - 380, y + H - 64, 160, 30, uiText('loot.takeAll', locale), () => this.onTake());
    all.setEnabled(list.length > 0);
    const go = button(s, x + W - 200, y + H - 64, 160, 30, uiText('loot.depart', locale), () => this.close());
    body.add([all.root, go.root]);
  }
}
