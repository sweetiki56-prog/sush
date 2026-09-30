// Days: sleeping at the campfire, guests by schedule, restocking, the burrow breeding again.
import { describe, it, expect } from 'vitest';
import { stockOf } from '../../src/core/room/Trade';
import { room, until } from './rooms';

function sleep(r: ReturnType<typeof room>['r'], c: ReturnType<typeof room>['clients'][number]) {
  c.do({ t: 'debug', op: { op: 'teleport', x: 16, y: 29 } });
  r.players.get(c.id)!.game.apply([{ type: 'rest' }]);
}

describe('days at the Rusty Well', () => {
  it('a night heals, resets the pump and moves the day on; guests come on their days', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    g.state.hp = 3;
    g.setFlag('water_drawn', 3);
    sleep(r, c);
    expect(g.flag('day')).toBe(2);
    expect(g.state.hp).toBe(g.maxHp);
    expect(g.flag('water_drawn')).toBeFalsy();
    expect(g.flag('caravan_here')).toBe(true);
    expect(until(r, () => r.npcs.get('birjuk')?.mover.moving === false)).toBe(true);
    expect(r.npcs.get('birjuk')!.mover.tile).toEqual({ x: 7, y: 27 });
    expect(r.npcs.has('sipuha')).toBe(false);
    sleep(r, c);
    expect(g.flag('caravan_here')).toBe(false);
    expect(g.flag('sipuha_here')).toBe(true);
    expect(until(r, () => !r.npcs.has('birjuk') && r.npcs.get('sipuha')?.mover.moving === false)).toBe(true);
  });

  it('the burrow fills from the second morning and again after a kill', () => {
    const { r, clients } = room();
    const [c] = clients;
    expect(r.hostiles.group('burrow')).toHaveLength(0);
    sleep(r, c);
    expect(r.hostiles.group('burrow')).toHaveLength(3);
    r.hostiles.byId('burrow_0')!.dead = true;
    r.players.get(c.id)!.game.setFlag('dead_burrow_0');
    expect(r.hostiles.group('burrow')).toHaveLength(2);
    sleep(r, c);
    expect(r.hostiles.group('burrow')).toHaveLength(3);
    expect(r.world.flags.dead_burrow_0).toBe(false);
  });

  it('traders restock on their day; no sleep with a monster awake nearby', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    const s = stockOf(g, 'hank');
    s.items.ammo = 0;
    s.money = 0;
    sleep(r, c);
    sleep(r, c);
    expect(stockOf(g, 'hank').items.ammo).toBe(0); // two days: not yet
    sleep(r, c);
    expect(stockOf(g, 'hank').items.ammo).toBe(24);
    expect(stockOf(g, 'hank').money).toBe(60);
    const sc = r.hostiles.byId('scorp_road')!.mover.tile;
    c.do({ t: 'debug', op: { op: 'teleport', x: sc.x, y: sc.y - 2 } }); // next to the road scorpion
    const day = g.flag('day');
    g.apply([{ type: 'rest' }]);
    expect(g.flag('day')).toBe(day);
    expect(g.state.log.at(-1)).toMatch(/твари/);
  });
});
