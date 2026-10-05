// Workbench and campfire: recipes check the bag and the skills, the room checks the bench is near.
import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/Game';
import { craft, craftCheck } from '../../src/core/room/Craft';
import { newState, plainCharacter } from '../../src/core/state';
import { CONTENT } from '../../src/content';
import { room, until } from './rooms';

function game(tags = ['repair', 'survival', 'speech'] as const) {
  return new Game(CONTENT, () => 0.5, newState(plainCharacter([...tags]), CONTENT));
}

describe('crafting', () => {
  it('turns a spear and the Old Reaper’s sting into the Жнецобой', () => {
    const g = game();
    g.give('spear');
    const r = CONTENT.recipes.reaper_spear;
    expect(craftCheck(g, r).missing).toEqual(['Жало Старого жнеца 0/1']);
    expect(craft(g, 'reaper_spear')).toBe(false);
    g.give('reaper_sting');
    expect(craftCheck(g, r).skill).toMatchObject({ id: 'repair', need: 40, have: 35 });
    expect(craftCheck(g, r).ok).toBe(false);
    g.char.spent.repair = 5; // tagged: +10
    expect(craftCheck(g, r).ok).toBe(true);
    expect(craft(g, 'reaper_spear')).toBe(true);
    expect([g.count('spear'), g.count('reaper_sting'), g.count('reaper_spear')]).toEqual([0, 0, 1]);
  });

  it('needs the skill, any one of several will do', () => {
    const weak = game(['lockpick', 'speech', 'sneak'] as never);
    weak.give('stinger');
    expect(craftCheck(weak, CONTENT.recipes.antidote).ok).toBe(false);
    expect(craft(weak, 'antidote')).toBe(false);
    expect(weak.state.log.at(-1)).toMatch(/Нужно: /);
    const medic = game(['medic', 'speech', 'sneak'] as never);
    medic.give('stinger');
    expect(craft(medic, 'antidote')).toBe(true);
    medic.give('stinger');
    expect(craft(medic, 'antidote')).toBe(true);
    expect(medic.char.xp).toBe(10); // more medicine, but no repeat XP
  });

  it('the room crafts only next to the right bench, and a dialogue opens the window', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    g.give('stinger', 2);
    g.give('lizard');
    c.do({ t: 'debug', op: { op: 'teleport', x: 3, y: 26 } });
    c.do({ t: 'craft', recipe: 'scent_lizard' });
    expect(g.count('scent_lizard')).toBe(0);
    expect(g.state.log.at(-1)).toMatch(/костёр/);
    c.do({ t: 'debug', op: { op: 'teleport', x: 16, y: 29 } });
    c.do({ t: 'craft', recipe: 'scent_lizard' });
    expect(g.count('scent_lizard')).toBe(1);
    c.do({ t: 'interact', id: 'workbench' });
    expect(until(r, () => !!c.last('dialogue'))).toBe(true);
    c.do({ t: 'choose', i: 0 });
    expect(c.last('window')).toMatchObject({ kind: 'workbench', id: 'workbench' });
  });
});
