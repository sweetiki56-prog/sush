// Workbench or campfire: the recipes of that bench, what they need and what you have, and a button to make it.
// Crafting goes to the room as an intent; the window redraws when the bag changes.
import Phaser from 'phaser';
import { SKILL_NAMES } from '../core/character/defs';
import { craftCheck } from '../core/room/Craft';
import { C, button, glass, hitRow, txt } from './theme';
import { itemStats } from './itemText';
import { Window } from './Window';

const W = 900;
const H = 540;
const ROWS = 9;
const ROW_H = 34;

export class Workbench extends Window {
  onCraft: (recipe: string) => void = () => {};
  private bench: 'workbench' | 'fire' = 'workbench';
  private picked: string | null = null;
  private scroll = 0;
  private body: Phaser.GameObjects.Container | null = null;
  private at = { x: 0, y: 0 };
  private unsub: (() => void)[] = [];
  private wheel = (_p: unknown, _o: unknown, _dx: number, dy: number) => {
    this.scroll = Phaser.Math.Clamp(this.scroll + (dy > 0 ? 1 : -1), 0, Math.max(0, this.recipes().length - ROWS));
    this.draw();
  };

  show(): void {
    if (this.root) this.close();
    else this.showBench(this.bench);
  }

  showBench(bench: 'workbench' | 'fire'): void {
    if (this.root) this.close();
    this.bench = bench;
    this.at = this.frame(W, H, bench === 'fire' ? 'КОСТЁР' : 'ВЕРСТАК');
    this.scroll = 0;
    this.picked = this.recipes()[0] ?? null;
    const redraw = () => this.root && this.draw();
    this.unsub = [this.game.events.on('inventory', redraw), this.game.events.on('sync', redraw)];
    this.scene.input.on('wheel', this.wheel);
    this.draw();
  }

  close(): void {
    this.unsub.forEach((u) => u());
    this.unsub = [];
    this.scene.input.off('wheel', this.wheel);
    this.body = null;
    super.close();
  }

  /** This bench's recipes: the ones you can make now first. */
  private recipes(): string[] {
    const g = this.game;
    return Object.entries(g.content.recipes)
      .filter(([, r]) => r.bench === this.bench)
      .sort(([, a], [, b]) => Number(craftCheck(g, b).ok) - Number(craftCheck(g, a).ok))
      .map(([id]) => id);
  }

  private outputOf(id: string): string {
    return Object.keys(this.game.content.recipes[id].output)[0];
  }

  private draw(): void {
    const s = this.scene;
    const g = this.game;
    const { x, y } = this.at;
    this.body?.destroy();
    const body = (this.body = s.add.container(0, 0));
    this.root!.add(body);
    body.add(glass(s, x + 32, y + 64, 380, ROWS * ROW_H + 16));
    const list = this.recipes();
    list.slice(this.scroll, this.scroll + ROWS).forEach((id, i) => {
      const ry = y + 72 + i * ROW_H;
      const out = this.outputOf(id);
      const ok = craftCheck(g, g.content.recipes[id]).ok;
      const on = id === this.picked;
      body.add([
        s.add.image(x + 56, ry + 15, 'atlas', g.content.items[out]?.icon ?? 'icon_note'),
        txt(s, x + 80, ry + 6, `${on ? '▸ ' : ''}${g.content.items[out]?.name ?? out}`, 14, on ? C.amber : ok ? C.crtBright : C.crtDim),
        hitRow(s, x + 36, ry, 372, ROW_H - 2, () => {}, () => {
          this.picked = id;
          this.draw();
        }),
      ]);
    });
    if (!list.length) body.add(txt(s, x + 48, y + 80, 'Здесь делать нечего.', 14, C.crtDim));
    if (list.length > ROWS) body.add(txt(s, x + 404, y + 70, `колесо ↕`, 11, C.crtDim).setOrigin(1, 0));

    const id = this.picked;
    if (!id) return;
    const r = g.content.recipes[id];
    const out = this.outputOf(id);
    const def = g.content.items[out];
    const c = craftCheck(g, r);
    const px = x + 436;
    body.add(s.add.image(px + 32, y + 100, 'atlas', def.icon).setScale(2));
    body.add(txt(s, px + 76, y + 70, def.name, 16, C.amber, W - 540, true));
    body.add(txt(s, px, y + 140, def.desc, 13, C.crt, W - 480));
    const stats = itemStats(g.content, out);
    if (stats) body.add(txt(s, px, y + 230, stats, 12, C.sand, W - 480));
    const need = Object.entries(r.inputs).map(([it, n]) => `${g.content.items[it]?.name ?? it}: ${g.count(it)}/${n}`);
    body.add(txt(s, px, y + 300, `Нужно:\n${need.join('\n')}`, 13, C.crt, W - 480));
    if (c.skill) {
      const names = Object.keys(r.skill ?? {}).map((k) => `${SKILL_NAMES[k as keyof typeof SKILL_NAMES]} ${r.skill![k as keyof typeof r.skill]}%`);
      body.add(txt(s, px, y + 300 + (need.length + 1) * 20, `Навык: ${names.join(' или ')} (у вас ${c.skill.have}%)`, 13, c.skill.have >= c.skill.need ? C.crt : C.red, W - 480));
    }
    const b = button(s, px, y + H - 64, 240, 30, 'СДЕЛАТЬ', () => this.onCraft(id));
    b.setEnabled(c.ok);
    body.add(b.root);
  }
}
