// Barter with a trader: their goods on the left, yours on the right. Left click adds one to the deal,
// right click takes one back; the balance below shows who pays whom. The room checks and does the deal.
import Phaser from 'phaser';
import { offered, quote, stockOf, unitBuy, unitSell, type Deal } from '../core/room/Trade';
import { C, button, glass, txt } from './theme';
import { itemStats } from './itemText';
import { Window } from './Window';
import { dragScroll } from './touch';

const W = 1040;
const H = 560;
const ROWS = 9;
const ROW_H = 30;
const COL_W = 470;

interface Row {
  id: string;
  qty: number;
  price: number;
}

export class Barter extends Window {
  onTrade: (trader: string, deal: Deal) => void = () => {};
  private trader = '';
  private deal: Deal = { buy: {}, sell: {} };
  private scroll = { buy: 0, sell: 0 };
  private hover: string | null = null;
  private body: Phaser.GameObjects.Container | null = null;
  private at = { x: 0, y: 0 };
  private unsub: (() => void)[] = [];
  private undrag: () => void = () => {};
  private wheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
    const side = p.x < this.at.x + W / 2 ? 'buy' : 'sell';
    const n = (side === 'buy' ? this.theirs() : this.yours()).length;
    this.scroll[side] = Phaser.Math.Clamp(this.scroll[side] + (dy > 0 ? 1 : -1), 0, Math.max(0, n - ROWS));
    this.draw();
  };

  show(): void {
    if (this.root) this.close();
    else if (this.trader) this.showTrader(this.trader);
  }

  showTrader(trader: string): void {
    if (this.root) this.close();
    this.trader = trader;
    this.deal = { buy: {}, sell: {} };
    this.scroll = { buy: 0, sell: 0 };
    this.at = this.frame(W, H, `ТОРГОВЛЯ С ${this.game.content.traders[trader].name.toUpperCase()}`);
    // the room answers a deal with a new state: start the next one from scratch
    const redraw = () => {
      if (!this.root) return;
      this.deal = { buy: {}, sell: {} };
      this.draw();
    };
    this.unsub = [this.game.events.on('inventory', redraw), this.game.events.on('sync', redraw)];
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

  private theirs(): Row[] {
    const g = this.game;
    const s = stockOf(g, this.trader);
    return Object.entries(s.items)
      .filter(([id, n]) => n > 0 && g.content.items[id] && offered(g, this.trader, id))
      .map(([id, qty]) => ({ id, qty, price: unitBuy(g, this.trader, id) }));
  }

  private yours(): Row[] {
    const g = this.game;
    return Object.entries(g.state.items)
      .filter(([id]) => g.content.items[id])
      .map(([id, qty]) => ({ id, qty, price: unitSell(g, this.trader, id) }));
  }

  private change(side: 'buy' | 'sell', row: Row, d: 1 | -1): void {
    const bag = this.deal[side];
    const n = Math.max(0, Math.min(row.qty, (bag[row.id] ?? 0) + d));
    if (side === 'sell' && !row.price) return;
    if (n) bag[row.id] = n;
    else delete bag[row.id];
    this.draw();
  }

  private column(body: Phaser.GameObjects.Container, side: 'buy' | 'sell', x: number, y: number, rows: Row[]): void {
    const s = this.scene;
    const g = this.game;
    body.add(glass(s, x, y, COL_W, ROWS * ROW_H + 12));
    rows.slice(this.scroll[side], this.scroll[side] + ROWS).forEach((r, i) => {
      const ry = y + 6 + i * ROW_H;
      const def = g.content.items[r.id];
      const inDeal = this.deal[side][r.id] ?? 0;
      const zone = s.add.rectangle(x + 4, ry, COL_W - 8, ROW_H - 2, 0x7ad36a, inDeal ? 0.12 : 0).setOrigin(0).setInteractive();
      zone.on('pointerover', () => {
        zone.setFillStyle(0x7ad36a, 0.18);
        this.hover = r.id;
        this.card(body);
      });
      zone.on('pointerout', () => zone.setFillStyle(0x7ad36a, inDeal ? 0.12 : 0));
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.change(side, r, p.rightButtonDown() ? -1 : 1));
      const each = r.price < 1 ? r.price.toFixed(1) : String(side === 'buy' ? Math.ceil(r.price) : Math.floor(r.price));
      const price = side === 'sell' && !r.price ? 'не берут' : `${each} кап.`;
      body.add([
        zone,
        s.add.image(x + 20, ry + 14, 'atlas', def.icon).setScale(0.8),
        txt(s, x + 40, ry + 6, def.name, 13, inDeal ? C.amber : C.crt, 250),
        txt(s, x + 300, ry + 6, `×${r.qty}${inDeal ? ` → ${inDeal}` : ''}`, 13, inDeal ? C.amber : C.crtDim),
        txt(s, x + COL_W - 12, ry + 6, price, 13, C.sand).setOrigin(1, 0),
      ]);
    });
    if (!rows.length) body.add(txt(s, x + 16, y + 14, 'Пусто.', 13, C.crtDim));
    if (rows.length > ROWS) body.add(txt(s, x + COL_W - 8, y - 18, 'колесо ↕', 11, C.crtDim).setOrigin(1, 0));
  }

  private cardText: Phaser.GameObjects.Text | null = null;

  private card(body: Phaser.GameObjects.Container): void {
    const g = this.game;
    const id = this.hover;
    this.cardText?.destroy();
    if (!id) return;
    const def = g.content.items[id];
    const stats = itemStats(g.content, id);
    this.cardText = txt(this.scene, this.at.x + 36, this.at.y + 386, `${def.name}. ${def.desc}${stats ? `\n${stats}` : ''}`, 12, C.crt, W - 72);
    body.add(this.cardText);
  }

  private draw(): void {
    const s = this.scene;
    const g = this.game;
    const { x, y } = this.at;
    this.body?.destroy();
    this.cardText = null;
    const body = (this.body = s.add.container(0, 0));
    this.root!.add(body);
    const stock = stockOf(g, this.trader);
    body.add(txt(s, x + 36, y + 62, `ТОВАР · у торговца ${stock.money} кап.`, 12, C.amber));
    body.add(txt(s, x + W / 2 + 14, y + 62, `ВАШЕ · у вас ${g.state.caps} кап.`, 12, C.amber));
    this.column(body, 'buy', x + 32, y + 82, this.theirs());
    this.column(body, 'sell', x + W / 2 + 10, y + 82, this.yours());
    this.card(body);

    const q = quote(g, this.trader, this.deal);
    const empty = !Object.keys(this.deal.buy).length && !Object.keys(this.deal.sell).length;
    const line = empty
      ? 'Левый клик — в сделку, правый — обратно.'
      : 'error' in q
        ? q.error
        : q.total > 0
          ? `Вы платите ${q.total} кап.`
          : q.total < 0
            ? `Вам платят ${-q.total} кап.`
            : 'Обмен без доплаты.';
    body.add(txt(s, x + 36, y + H - 58, line, 15, !empty && 'error' in q ? C.red : C.crtBright));
    const deal = button(s, x + W - 300, y + H - 64, 130, 30, 'СДЕЛКА', () => this.onTrade(this.trader, this.deal));
    deal.setEnabled(!empty && !('error' in q));
    const reset = button(s, x + W - 160, y + H - 64, 120, 30, 'СБРОС', () => {
      this.deal = { buy: {}, sell: {} };
      this.draw();
    });
    body.add([deal.root, reset.root]);
  }
}
