// The bag: tabs by kind, a scrolling grid, the gear slots (two hands, armor, two charms) and a card
// for the chosen item with what can be done with it. Changes go to the room as intents; the window
// redraws when the game state changes (solo: the shared Game, online: the mirror's sync).
import Phaser from 'phaser';
import type { ItemCat } from '../core/types';
import type { EquipSlot } from '../core/room/protocol';
import { C, button, glass, txt } from './theme';
import { itemStats } from './itemText';
import { Window } from './Window';
import { dragScroll } from './touch';

const TABS: { id: ItemCat | 'all'; label: string; cats: ItemCat[] }[] = [
  { id: 'all', label: 'ВСЁ', cats: [] },
  { id: 'weapon', label: 'ОРУЖИЕ', cats: ['weapon', 'grenade'] },
  { id: 'armor', label: 'БРОНЯ', cats: ['armor'] },
  { id: 'charm', label: 'ОБЕРЕГИ', cats: ['charm'] },
  { id: 'chem', label: 'ХИМИЯ', cats: ['chem'] },
  { id: 'ammo', label: 'ЗАРЯДЫ', cats: ['ammo'] },
  { id: 'part', label: 'ХЛАМ', cats: ['part'] },
  { id: 'quest', label: 'СЮЖЕТ', cats: ['quest'] },
];

const USE_LABEL: Record<string, string> = {
  heal: 'ПЕРЕВЯЗАТЬСЯ',
  cure: 'ВЫПИТЬ',
  bait: 'БРОСИТЬ ПРИМАНКУ',
  throw: 'БРОСИТЬ БОМБУ',
  craft: 'СВАРИТЬ',
  stim: 'ПРИНЯТЬ',
  grenade: 'БРОСИТЬ',
};

const W = 940;
const H = 560;
const COLS = 6;
const ROWS = 3;
const CELL = 84;
const PITCH_X = 98;
const PITCH_Y = 112;

interface Entry {
  id: string;
  icon: string;
  name: string;
  qty: number;
}

export class Inventory extends Window {
  onUse: (item: string) => void = () => {};
  onEquip: (slot: EquipSlot, item: string | null) => void = () => {};
  /** Co-op: a teammate close enough to hand things to, if any. */
  giveTo: () => { id: string; name: string } | null = () => null;
  onGive: (to: string, item: string) => void = () => {};

  private tab: (typeof TABS)[number]['id'] = 'all';
  private scroll = 0;
  private picked: string | null = null;
  private body: Phaser.GameObjects.Container | null = null;
  private at = { x: 0, y: 0 };
  private unsub: (() => void)[] = [];
  private undrag: () => void = () => {};
  private wheel = (_p: unknown, _o: unknown, _dx: number, dy: number) => {
    const rows = Math.ceil(this.entries().length / COLS);
    this.scroll = Phaser.Math.Clamp(this.scroll + (dy > 0 ? 1 : -1), 0, Math.max(0, rows - ROWS));
    this.draw();
  };

  show(): void {
    if (this.root) return this.close();
    this.at = this.frame(W, H, 'ИНВЕНТАРЬ');
    this.scroll = 0;
    this.picked = null;
    const redraw = () => this.root && this.draw();
    this.unsub = [this.game.events.on('inventory', redraw), this.game.events.on('sync', redraw), this.game.events.on('stats', redraw)];
    this.scene.input.on('wheel', this.wheel);
    this.undrag = dragScroll(this.scene, (dy, p) => this.wheel(p, null, 0, dy)); // a finger scrolls like the wheel
    this.draw();
  }

  close(): void {
    this.unsub.forEach((u) => u());
    this.unsub = [];
    this.scene.input.off('wheel', this.wheel);
    this.undrag();
    this.body = null;
    super.close();
  }

  private entries(): Entry[] {
    const g = this.game;
    const tab = TABS.find((t) => t.id === this.tab)!;
    const out: Entry[] = [];
    if (this.tab === 'all') out.push({ id: 'caps', icon: 'icon_caps', name: 'Капли', qty: g.state.caps });
    for (const [id, qty] of Object.entries(g.state.items)) {
      const def = g.content.items[id];
      if (!def || (tab.cats.length && !tab.cats.includes(def.cat))) continue;
      out.push({ id, icon: def.icon, name: def.name, qty });
    }
    return out;
  }

  /** Which slot an item sits in right now, if any. */
  private slotOf(id: string): string | null {
    const g = this.game;
    const [main, alt] = g.hands();
    if (id === main) return 'рука 1';
    if (id === alt) return 'рука 2';
    if (g.state.equipped.armor === id && g.armor) return 'надето';
    if (g.charms.includes(id)) return 'оберег';
    return null;
  }

  private draw(): void {
    const s = this.scene;
    const g = this.game;
    const { x, y } = this.at;
    this.body?.destroy();
    const body = (this.body = s.add.container(0, 0));
    this.root!.add(body);

    // gear slots
    const [main, alt] = g.hands();
    const charms = g.charms;
    const slots: [string, string | undefined][] = [
      ['РУКА 1', main],
      ['РУКА 2', alt],
      ['БРОНЯ', g.armor ? g.state.equipped.armor : undefined],
      ['ОБЕРЕГ', charms[0]],
      ['ОБЕРЕГ', charms[1]],
    ];
    body.add(glass(s, x + 32, y + 64, 196, 348));
    slots.forEach(([label, id], i) => {
      const sy = y + 74 + i * 66;
      const cell = s.add.rectangle(x + 42, sy, 56, 56, 0x16261a).setOrigin(0).setStrokeStyle(1, 0x3f7a3a).setInteractive();
      body.add([cell, txt(s, x + 106, sy + 4, label, 11, C.crtDim), txt(s, x + 106, sy + 20, id ? (g.content.items[id]?.name ?? id) : '—', 12, C.crtBright, 118)]);
      if (id) body.add(s.add.image(x + 70, sy + 28, 'atlas', g.content.items[id]?.icon ?? 'icon_note').setScale(1.5));
      cell.on('pointerdown', () => {
        if (!id) return;
        this.picked = id;
        this.draw();
      });
    });

    // tabs
    TABS.forEach((t, i) => {
      const b = button(s, x + 244 + i * 82, y + 64, 78, 24, t.label, () => {
        this.tab = t.id;
        this.scroll = 0;
        this.draw();
      });
      if (t.id === this.tab) b.label.setColor(C.amber);
      body.add(b.root);
    });

    // grid
    const list = this.entries();
    const rows = Math.ceil(list.length / COLS);
    list.slice(this.scroll * COLS, (this.scroll + ROWS) * COLS).forEach((e, i) => {
      const cx = x + 248 + (i % COLS) * PITCH_X;
      const cy = y + 100 + Math.floor(i / COLS) * PITCH_Y;
      const on = e.id === this.picked;
      const cell = s.add.rectangle(cx, cy, CELL, CELL, 0x16261a).setOrigin(0).setStrokeStyle(on ? 2 : 1, on ? 0xf0a040 : 0x3f7a3a).setInteractive();
      const worn = this.slotOf(e.id);
      body.add([
        cell,
        s.add.image(cx + CELL / 2, cy + CELL / 2, 'atlas', e.icon).setScale(2),
        txt(s, cx + CELL - 4, cy + CELL - 18, e.qty > 1 ? `×${e.qty}` : '', 12, C.sand).setOrigin(1, 0),
        txt(s, cx + 4, cy + 2, worn ? '✓' : '', 13, C.amber),
        txt(s, cx + CELL / 2, cy + CELL + 3, e.name, 11, C.crt, PITCH_X - 4).setOrigin(0.5, 0).setAlign('center'),
      ]);
      cell.on('pointerover', () => !on && cell.setStrokeStyle(2, 0x7ad36a));
      cell.on('pointerout', () => !on && cell.setStrokeStyle(1, 0x3f7a3a));
      cell.on('pointerdown', () => {
        this.picked = e.id;
        this.draw();
      });
    });
    if (!list.length) body.add(txt(s, x + 248, y + 110, 'Пусто.', 14, C.crtDim));
    if (rows > ROWS) body.add(txt(s, x + W - 44, y + 100, `${this.scroll + 1}–${Math.min(rows, this.scroll + ROWS)} / ${rows}\nколесо ↕`, 11, C.crtDim).setOrigin(1, 0).setAlign('right'));

    this.card(body, x, y);
  }

  /** The chosen item: what it is, its numbers, and what can be done with it. */
  private card(body: Phaser.GameObjects.Container, x: number, y: number): void {
    const s = this.scene;
    const g = this.game;
    const id = this.picked;
    const cy = y + 428;
    if (!id || (id !== 'caps' && !g.count(id))) {
      body.add(txt(s, x + 36, cy, 'Выберите предмет. Колесо мыши листает список.', 13, C.crtDim));
      return;
    }
    if (id === 'caps') {
      body.add(txt(s, x + 36, cy, 'Капли. Латунные жетоны Треста с выбитой каплей. Их меняют на воду, а значит на всё.', 13, C.crt, W - 72));
      return;
    }
    const def = g.content.items[id];
    const stats = itemStats(g.content, id);
    body.add(txt(s, x + 36, cy, `${def.name}. ${def.desc}`, 13, C.crt, W - 72));
    if (stats) body.add(txt(s, x + 36, cy + 38, stats, 12, C.sand, W - 72));

    const acts: [string, () => void][] = [];
    const where = this.slotOf(id);
    const [main, alt] = g.hands();
    if (def.cat === 'weapon') {
      if (id !== main) acts.push(['В РУКУ 1', () => this.onEquip('weapon', id)]);
      if (id !== alt) acts.push(['В РУКУ 2', () => this.onEquip('alt', id)]);
      if (id === main) acts.push(['УБРАТЬ ИЗ РУКИ', () => this.onEquip('weapon', null)]);
      if (id === alt) acts.push(['УБРАТЬ ИЗ РУКИ', () => this.onEquip('alt', null)]);
    } else if (def.cat === 'armor') acts.push([where ? 'СНЯТЬ' : 'НАДЕТЬ', () => this.onEquip('armor', where ? null : id)]);
    else if (def.cat === 'charm') acts.push([where ? 'СНЯТЬ' : 'НАДЕТЬ', () => this.onEquip('charm', id)]);
    else if (def.use && USE_LABEL[def.use])
      acts.push([
        USE_LABEL[def.use],
        () => {
          this.close();
          this.onUse(id);
        },
      ]);
    const mate = this.giveTo();
    if (mate && !where)
      acts.push([
        `ОТДАТЬ → ${mate.name.toUpperCase()}`,
        () => {
          this.close();
          this.onGive(mate.id, id);
        },
      ]);
    acts.forEach(([label, fn], i) => body.add(button(s, x + 36 + i * 216, y + H - 58, 204, 28, label, fn).root));
  }
}
