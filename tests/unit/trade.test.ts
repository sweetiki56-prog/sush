// Barter: prices by Торговля and reputation, stock and money on both sides, the room checks the trader is near.
import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/Game';
import { buyPrice, offered, quote, sellPrice, stockOf, trade } from '../../src/core/room/Trade';
import { newState, plainCharacter } from '../../src/core/state';
import { CONTENT } from '../../src/content';
import { room, until } from './rooms';

function game(barter = false) {
  const tags = barter ? (['barter', 'speech', 'sneak'] as const) : (['lockpick', 'speech', 'sneak'] as const);
  return new Game(CONTENT, () => 0.5, newState(plainCharacter([...tags]), CONTENT));
}

describe('barter', () => {
  it('prices: Торговля and reputation make buying cheaper and selling dearer; quest items never sell', () => {
    const plain = game();
    const haggler = game(true);
    expect(buyPrice(haggler, 'birjuk', 'nomad')).toBeLessThan(buyPrice(plain, 'birjuk', 'nomad'));
    expect(sellPrice(haggler, 'birjuk', 'rifle')).toBeGreaterThan(sellPrice(plain, 'birjuk', 'rifle'));
    const before = buyPrice(plain, 'birjuk', 'nomad');
    plain.setFlag('rep_guild', 25);
    expect(buyPrice(plain, 'birjuk', 'nomad')).toBe(Math.max(1, Math.ceil(55 * (1.9 - plain.skill('barter') / 200) * 0.8)));
    expect(buyPrice(plain, 'birjuk', 'nomad')).toBeLessThan(before);
    expect(sellPrice(plain, 'birjuk', 'tube')).toBe(0);
    expect(sellPrice(plain, 'sipuha', 'rifle')).toBe(0); // she takes no guns
    expect(sellPrice(plain, 'sipuha', 'stinger', 10)).toBeGreaterThanOrEqual(2 * sellPrice(plain, 'birjuk', 'stinger', 10));
  });

  it('a deal moves goods and капли both ways and checks both purses', () => {
    const g = game();
    g.give('stinger', 3);
    const money = stockOf(g, 'hank').money;
    const caps = g.state.caps;
    const cost = buyPrice(g, 'hank', 'ammo', 6) - sellPrice(g, 'hank', 'stinger', 3);
    expect(trade(g, 'hank', { buy: { ammo: 6 }, sell: { stinger: 3 } })).toBe(true);
    expect(g.count('ammo')).toBe(12 + 6);
    expect(g.count('stinger')).toBe(0);
    expect(g.state.caps).toBe(caps - cost);
    expect(stockOf(g, 'hank').money).toBe(money + cost);
    expect(stockOf(g, 'hank').items.stinger).toBe(3);
    expect(quote(g, 'hank', { buy: { jacket: 2 }, sell: {} })).toEqual({ error: 'Столько у торговца нет.' });
    expect(quote(g, 'hank', { buy: {}, sell: { tube: 1 } })).toMatchObject({ error: expect.stringMatching(/нет/) });
    g.give('exo');
    expect(quote(g, 'hank', { buy: {}, sell: { exo: 1 } })).toEqual({ error: 'У торговца не хватает капель.' });
  });

  it('friends-only goods show from the right reputation', () => {
    const g = game();
    expect(offered(g, 'sipuha', 'reaper_spear')).toBe(false);
    expect(quote(g, 'sipuha', { buy: { reaper_spear: 1 }, sell: {} })).toEqual({ error: 'Столько у торговца нет.' });
    g.setFlag('rep_dry', 25);
    expect(offered(g, 'sipuha', 'reaper_spear')).toBe(true);
  });

  it('the room trades only with the trader close by, and Hank opens his window', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    c.do({ t: 'debug', op: { op: 'teleport', x: 3, y: 26 } });
    c.do({ t: 'trade', trader: 'hank', buy: { ammo: 1 }, sell: {} });
    expect(g.count('ammo')).toBe(12);
    c.do({ t: 'interact', id: 'hank' });
    expect(until(r, () => !!c.last('dialogue'))).toBe(true);
    const pick = (text: string) => c.do({ t: 'choose', i: c.last('dialogue')!.options.findIndex((o) => o.includes(text)) });
    pick('Что продаёшь');
    pick('Покажи товар');
    expect(c.last('window')).toMatchObject({ kind: 'barter', id: 'hank' });
    c.do({ t: 'trade', trader: 'hank', buy: { ammo: 1 }, sell: {} });
    expect(g.count('ammo')).toBe(13);
  });
});
