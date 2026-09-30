// The server trusts nothing: stage G intents are checked for shape before any room sees them.
import { describe, it, expect } from 'vitest';
import { cleanIntent } from '../../src/core/room/validate';

describe('intent checks', () => {
  it('equip needs a known slot and an item or null', () => {
    expect(cleanIntent({ t: 'equip', slot: 'charm', item: 'lens' })).toEqual({ t: 'equip', slot: 'charm', item: 'lens' });
    expect(cleanIntent({ t: 'equip', slot: 'armor', item: null })).toEqual({ t: 'equip', slot: 'armor', item: null });
    expect(cleanIntent({ t: 'equip', slot: 'head', item: 'lens' })).toBeNull();
    expect(cleanIntent({ t: 'equip', slot: 'weapon', item: 5 })).toBeNull();
  });

  it('trade needs a trader and whole positive counts; craft a recipe name', () => {
    expect(cleanIntent({ t: 'trade', trader: 'hank', buy: { ammo: 6 }, sell: { stinger: 1 } })).toEqual({ t: 'trade', trader: 'hank', buy: { ammo: 6 }, sell: { stinger: 1 } });
    expect(cleanIntent({ t: 'trade', trader: 'hank', buy: { ammo: -6 }, sell: {} })).toBeNull();
    expect(cleanIntent({ t: 'trade', trader: 'hank', buy: { ammo: 1.5 }, sell: {} })).toBeNull();
    expect(cleanIntent({ t: 'trade', trader: 'hank', buy: 'all', sell: {} })).toBeNull();
    expect(cleanIntent({ t: 'craft', recipe: 'reaper_spear' })).toEqual({ t: 'craft', recipe: 'reaper_spear' });
    expect(cleanIntent({ t: 'craft' })).toBeNull();
  });
});
