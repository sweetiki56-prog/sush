// Barter: traders' stock and money live in the shared world; prices follow Торговля and the trader's
// faction reputation. Pure rules over a Game: the room checks who stands where, the window shows the same numbers.
import type { Game } from '../Game';
import type { TraderDef, TraderStock } from '../types';

/** A trader's goods and money, filled from content the first time (and again when the day restocks them). */
export function stockOf(g: Game, trader: string): TraderStock {
  const all = (g.state.stock ??= {});
  const def = g.content.traders[trader];
  return (all[trader] ??= fresh(def));
}

export function fresh(def: TraderDef): TraderStock {
  return { money: def.money, items: { ...def.stock } };
}

/** Reputation with the trader's people: 10+ is a tenth off, 25+ a fifth; a personal friend gets another tenth. */
export function discount(g: Game, def: TraderDef): number {
  const rep = def.faction ? Number(g.flag(`rep_${def.faction}`) ?? 0) : 0;
  const friend = def.friend && g.flag(def.friend) ? 0.1 : 0;
  return (rep >= 25 ? 0.2 : rep >= 10 ? 0.1 : 0) + friend;
}

/** A trader's asking price for one unit, before rounding (cheap goods cost a fraction of a капля each). */
export function unitBuy(g: Game, trader: string, item: string): number {
  const def = g.content.traders[trader];
  return (g.content.items[item]?.value ?? 0) * (1.9 - Math.min(100, g.skill('barter')) / 200) * (1 - discount(g, def));
}

/** What a trader pays for one unit, before rounding; 0 when they do not take it. */
export function unitSell(g: Game, trader: string, item: string): number {
  const def = g.content.traders[trader];
  const it = g.content.items[item];
  if (!it || it.cat === 'quest' || !it.value) return 0;
  if (def.buys && !def.buys.includes(it.cat)) return 0;
  return it.value * (0.3 + Math.min(100, g.skill('barter')) / 400) * (def.likes?.[item] ?? 1);
}

/** What a trader asks for `qty` of an item: rounded up, at least a капля. */
export function buyPrice(g: Game, trader: string, item: string, qty = 1): number {
  return Math.max(1, Math.ceil(unitBuy(g, trader, item) * qty));
}

/** What a trader pays for `qty` of an item, rounded down (0: they do not take it, or it is too little). */
export function sellPrice(g: Game, trader: string, item: string, qty = 1): number {
  return Math.floor(unitSell(g, trader, item) * qty);
}

/** Goods only a friend of the trader's people gets to see. */
export function offered(g: Game, trader: string, item: string): boolean {
  const def = g.content.traders[trader];
  const need = def.need?.[item];
  return need === undefined || Number(g.flag(`rep_${def.faction}`) ?? 0) >= need;
}

export interface Deal {
  buy: Record<string, number>;
  sell: Record<string, number>;
}

/** The balance of a deal: positive = you pay, negative = the trader pays. Null when it cannot be done, with the reason. */
export function quote(g: Game, trader: string, d: Deal): { total: number } | { error: string } {
  const s = stockOf(g, trader);
  let total = 0;
  for (const [item, n] of Object.entries(d.buy)) {
    if (!Number.isInteger(n) || n <= 0) return { error: 'Странное количество.' };
    if ((s.items[item] ?? 0) < n || !offered(g, trader, item)) return { error: 'Столько у торговца нет.' };
    total += buyPrice(g, trader, item, n);
  }
  for (const [item, n] of Object.entries(d.sell)) {
    if (!Number.isInteger(n) || n <= 0) return { error: 'Странное количество.' };
    if (g.count(item) < n) return { error: 'У вас столько нет.' };
    if (!unitSell(g, trader, item)) return { error: `${g.content.items[item]?.name ?? item}: это здесь не берут.` };
    total -= sellPrice(g, trader, item, n);
  }
  if (total > g.state.caps) return { error: 'Не хватает капель.' };
  if (-total > s.money) return { error: 'У торговца не хватает капель.' };
  return { total };
}

/** Do the deal: goods and капли change hands. False (with a log line) when it cannot be done. */
export function trade(g: Game, trader: string, d: Deal): boolean {
  const q = quote(g, trader, d);
  if ('error' in q) {
    g.log(q.error);
    return false;
  }
  const s = stockOf(g, trader);
  for (const [item, n] of Object.entries(d.sell)) {
    g.take(item, n);
    s.items[item] = (s.items[item] ?? 0) + n;
  }
  for (const [item, n] of Object.entries(d.buy)) {
    s.items[item] -= n;
    if (!s.items[item]) delete s.items[item];
    g.give(item, n);
  }
  s.money += q.total;
  if (q.total) g.addCaps(-q.total);
  g.log(`Сделка с ${g.content.traders[trader].name}.`);
  return true;
}
