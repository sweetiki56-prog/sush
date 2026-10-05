import { describe, it, expect } from 'vitest';
import { CONTENT } from '../../src/content';
import { DialogueRunner } from '../../src/core/DialogueRunner';
import { Game } from '../../src/core/Game';
import { MAP, TOWNS, room, until } from './rooms';

describe('town cats and dogs', () => {
  it('live in settlements as peaceful, talkable actors', () => {
    for (const id of ['rusty_well', 'three_pillars', 'kolyuchka', 'barge_deck', 'zap_lower', 'salt_market', 'crystal_gate', 'skit_yard', 'depot_yard']) {
      const map = id === 'rusty_well' ? MAP : TOWNS[id];
      const pets = map.actors.filter((a) => a.dialogue === 'street_cat' || a.dialogue === 'street_dog');
      expect(pets.length, id).toBeGreaterThan(0);
      for (const pet of pets) {
        expect(pet.creature, `${id}:${pet.id}`).toBeUndefined();
        expect(CONTENT.dialogues[pet.dialogue!], `${id}:${pet.id}`).toBeDefined();
      }
    }
  });

  it('petting through dialogue works repeatedly without granting XP', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    c.do({ t: 'debug', op: { op: 'teleport', x: 10, y: 27 } });
    c.do({ t: 'interact', id: 'town_cat' });
    expect(until(r, () => !!c.last('dialogue'))).toBe(true);
    expect(c.last('dialogue')!.options).toContain('Осторожно погладить.');
    c.do({ t: 'choose', i: 0 });
    expect(c.last('dialogue')!.text).toContain('мурлычет');
    c.do({ t: 'choose', i: 0 });
    expect(g.char.xp).toBe(0);

    const dog = new DialogueRunner(new Game(CONTENT), CONTENT.dialogues.street_dog, 'street_dog');
    expect(dog.options()[0].label).toContain('Погладить');
    dog.choose(0);
    expect(dog.text).toContain('шерсть');
  });
});
