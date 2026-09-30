// Build-dependent mission branches: every attribute and skill opens something.
import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/Game';
import { DialogueRunner } from '../../src/core/DialogueRunner';
import { newState, plainCharacter } from '../../src/core/state';
import { fixedRng } from '../../src/core/rng';
import { CONTENT } from '../../src/content';
import type { CharacterData } from '../../src/core/character/defs';

const PASS = 0.0;
const FAIL = 0.99;

function hero(patch: Partial<CharacterData> & { a?: Partial<CharacterData['attrs']> } = {}, rolls: number[] = [PASS]): Game {
  const c = plainCharacter();
  Object.assign(c, patch);
  c.attrs = { ...c.attrs, ...(patch.a ?? {}) };
  return new Game(CONTENT, fixedRng(rolls), newState(c, CONTENT));
}

function labels(g: Game, id: string, picks: string[] = []): string[] {
  const d = talk(g, id, picks);
  return d.options().map((o) => o.label);
}

function talk(g: Game, id: string, picks: string[]): DialogueRunner {
  const d = new DialogueRunner(g, CONTENT.dialogues[id], id);
  for (const text of picks) {
    const idx = d.options().findIndex((o) => o.label.includes(text));
    if (idx < 0) throw new Error(`${id}@${d.nodeId}: no "${text}" in ${d.options().map((o) => o.label).join(' | ')}`);
    d.choose(idx);
  }
  return d;
}

describe('Marta', () => {
  it('low intelligence gets the simple-words dialogue and cannot read the manual', () => {
    const g = hero({ a: { int: 3 } });
    expect(talk(g, 'marta', []).text).toMatch(/понимаешь/);
    talk(g, 'marta', ['Моя хотеть пить', 'Моя принести железка', 'Картинки']);
    expect(g.flag('quest_accepted')).toBe(true);
    expect(g.count('manual')).toBe(1);
    g.give('valve');
    const pump = labels(g, 'pump');
    expect(pump.some((l) => l.includes('Посмотреть картинки'))).toBe(true);
    expect(pump.some((l) => l.includes('по схеме.'))).toBe(false);
  });

  it('names the hero once', () => {
    const g = hero({ name: 'Ворон' });
    const d = talk(g, 'marta', ['Меня зовут Ворон']);
    expect(d.text).toMatch(/^— Ворон\?/);
    expect(labels(g, 'marta').some((l) => l.includes('Меня зовут'))).toBe(false);
  });

  it('barter advance: 5 now, 10 on report', () => {
    const g = hero();
    talk(g, 'marta', ['Я могу помочь', 'Половину вперёд', 'Справедливо', 'Уже иду']);
    expect(g.state.caps).toBe(17);
    g.setFlag('pump_fixed');
    talk(g, 'marta', ['Остаток, десять']);
    expect(g.state.caps).toBe(27);
    expect(g.flag('quest_complete')).toBe(true);
  });

  it('charisma or survival reveals the scorpion nest', () => {
    for (const g of [hero({ a: { cha: 7 } }), hero({ tags: ['survival', 'guns', 'sneak'] })]) {
      talk(g, 'marta', ['Я могу помочь', 'Договорились']);
      const opts = labels(g, 'marta', ['Где эта станция', 'Ясно']);
      expect(opts).toEqual([]);
      const acc = new DialogueRunner(g, CONTENT.dialogues.marta, 'marta');
      expect(acc.nodeId).toBe('progress');
    }
    const g = hero({ a: { cha: 7 } });
    talk(g, 'marta', ['Я могу помочь', 'Договорились', 'недоговариваешь']);
    expect(g.flag('knows_nest')).toBe(true);
    expect(labels(hero(), 'marta', ['Я могу помочь', 'Договорились']).some((l) => l.includes('недоговариваешь'))).toBe(false);
  });

  it('a thief gets a cold thank-you', () => {
    const g = hero();
    g.setFlag('quest_accepted');
    g.setFlag('karma', -1);
    g.setFlag('pump_fixed');
    expect(talk(g, 'marta', []).text).toMatch(/шаришь по чужим мешкам/);
  });
});

describe('Hank', () => {
  it('barter sets the key price', () => {
    const cheap = hero({ a: { cha: 8 }, tags: ['barter', 'speech', 'sneak'] }); // 32 + 20 = 52... + trader later
    cheap.char.perks.push('trader'); // 77
    cheap.setFlag('quest_accepted');
    talk(cheap, 'hank', ['ключ от насосной', 'Три, и то много']);
    expect(cheap.state.caps).toBe(9);
    const plain = hero();
    plain.setFlag('quest_accepted');
    expect(labels(plain, 'hank', ['ключ от насосной']).some((l) => l.includes('Три'))).toBe(false);
  });

  it('strength 7 or the imposing perk scares the key out of him', () => {
    const g = hero({ a: { str: 7 } });
    g.setFlag('quest_accepted');
    talk(g, 'hank', ['ключ от насосной', 'Сейчас же']);
    expect(g.count('key')).toBe(1);
    expect(g.flag('karma')).toBe(-1);
    expect(talk(g, 'hank', []).nodeId).toBe('scared');
    const p = hero({ perks: ['imposing'] });
    p.setFlag('quest_accepted');
    expect(labels(p, 'hank', ['ключ от насосной']).some((l) => l.includes('[Внушительный]'))).toBe(true);
  });

  it('stealing the key: success keeps it quiet, confession restores karma', () => {
    const g = hero({ tags: ['sneak', 'guns', 'lockpick'] }, [PASS]);
    talk(g, 'hank_bag', ['пошарить']);
    expect(g.count('key')).toBe(1);
    expect(g.flag('karma')).toBe(-1);
    talk(g, 'hank', ['Прости, Хэнк']);
    expect(g.flag('karma')).toBe(1);
    expect(g.state.caps).toBe(7);
  });

  it('getting caught doubles the price', () => {
    const g = hero({}, [FAIL]);
    talk(g, 'hank_bag', ['пошарить']);
    expect(g.flag('hank_angry')).toBe(true);
    expect(talk(g, 'hank_bag', []).nodeId).toBe('watched');
    g.addCaps(10);
    talk(g, 'hank', ['десять капель']);
    expect(g.count('key')).toBe(1);
    expect(g.state.caps).toBe(12);
  });

  it('Hank opens his barter window', () => {
    const g = hero();
    const d = talk(g, 'hank', ['Что продаёшь']);
    expect(d.options().map((o) => o.label)).toContain('Покажи товар.');
  });
});

describe('door, pump and finds', () => {
  it('a weak hero needs a strength roll to force the door', () => {
    const g = hero({ a: { str: 3 } }, [FAIL, PASS]);
    g.give('crowbar');
    expect(labels(g, 'door').find((l) => l.includes('Попробовать сорвать'))).toContain('[Сила 50%]');
    talk(g, 'door', ['Попробовать сорвать', 'Ещё раз', 'Попробовать сорвать']);
    expect(g.flag('door_method')).toBe('монтировка');
  });

  it('nimble fingers allow a third lockpick attempt', () => {
    const g = hero({ perks: ['nimble'] }, [FAIL, FAIL, PASS]);
    talk(g, 'door', ['отмычкой', 'Ещё раз', 'отмычкой', 'Ещё раз', '[Ловкие пальцы]']);
    expect(g.flag('door_open')).toBe(true);
  });

  it('schematic from the station log or the handy perk fixes the pump', () => {
    const sci = hero({ tags: ['science', 'guns', 'sneak'] });
    talk(sci, 'machine', ['Разобраться']);
    expect(sci.count('schematic')).toBe(1);
    sci.give('valve');
    talk(sci, 'pump', ['[Схема]']);
    expect(sci.flag('pump_fixed')).toBe(true);
    const handy = hero({ perks: ['handy'] });
    handy.give('valve');
    talk(handy, 'pump', ['[Золотые руки]']);
    expect(handy.flag('pump_fixed')).toBe(true);
  });

  it('station log: one failed read locks it', () => {
    const g = hero({}, [FAIL]);
    talk(g, 'machine', ['Разобраться']);
    expect(labels(g, 'machine').some((l) => l.includes('Разобраться'))).toBe(false);
  });

  it('perception, luck and repair find extra loot', () => {
    const per = hero({ a: { per: 6 } });
    talk(per, 'car_sedan', ['[Восприятие]']);
    expect(per.count('bandage')).toBe(2);
    const luk = hero({ a: { luk: 7 } });
    talk(luk, 'skeleton', ['Обыскать сумку', '[Удача]']);
    expect(luk.state.caps).toBe(12 + 5 + 8);
    const rep = hero();
    talk(rep, 'car_pickup', ['[Ремонт]']);
    expect(rep.count('scrap')).toBe(1);
    expect(labels(hero({ a: { per: 5 } }), 'car_sedan').some((l) => l.includes('[Восприятие]'))).toBe(false);
  });

  it('the station locker: two tries with lockpick', () => {
    const g = hero({}, [FAIL, PASS]);
    talk(g, 'locker', ['Вскрыть', 'Ещё раз', 'Вскрыть']);
    expect(g.count('ammo')).toBe(20);
    const j = hero({}, [FAIL, FAIL]);
    talk(j, 'locker', ['Вскрыть', 'Ещё раз', 'Вскрыть']);
    expect(labels(j, 'locker').some((l) => l.includes('сломан'))).toBe(true);
  });
});
