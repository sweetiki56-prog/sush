import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/Game';
import { DialogueRunner } from '../../src/core/DialogueRunner';
import { fixedRng } from '../../src/core/rng';
import { CONTENT } from '../../src/content';

const PASS = 0.0; // d100 roll 1
const FAIL = 0.99; // d100 roll 100

function talk(g: Game, id: string, picks: string[]): DialogueRunner {
  const d = new DialogueRunner(g, CONTENT.dialogues[id], id);
  for (const text of picks) {
    const idx = d.options().findIndex((o) => o.label.includes(text));
    if (idx < 0) throw new Error(`${id}@${d.nodeId}: no option "${text}" in ${d.options().map((o) => o.label).join(' | ')}`);
    d.choose(idx);
  }
  return d;
}

describe('mission: Water for Rusty Well', () => {
  it('completes via Hank key (paid), manual repair, plain reward', () => {
    const g = new Game(CONTENT, fixedRng([PASS]));
    talk(g, 'marta', ['Я могу помочь', 'Договорились', 'Как поставить клапан', 'Спасибо']);
    expect(g.stage('water')).toBe('find_station');
    expect(g.count('manual')).toBe(1);
    talk(g, 'hank', ['ключ от насосной', 'Держи пять капель', 'Не скажу']);
    expect(g.count('key')).toBe(1);
    expect(g.state.caps).toBe(7);
    g.setStage('water', 'open_door');
    talk(g, 'door', ['[Ключ]']);
    expect(g.flag('door_method')).toBe('ключ');
    talk(g, 'crate', ['Забрать клапан']);
    expect(g.stage('water')).toBe('fix_pump');
    talk(g, 'pump', ['[Инструкция]', 'Готово']);
    expect(g.flag('pump_fixed')).toBe(true);
    expect(g.count('valve')).toBe(0);
    const d = talk(g, 'marta', ['Было приятно помочь.', 'Прощай']);
    expect(d.done).toBe(true);
    expect(g.flag('quest_complete')).toBe(true);
    expect(g.stage('water')).toBe('done');
    expect(g.state.caps).toBe(22);
  });

  it('bargain success pays 30', () => {
    const g = new Game(CONTENT, fixedRng([PASS]));
    talk(g, 'marta', ['Я могу помочь', 'тридцать', 'По рукам', 'Уже иду']);
    expect(g.flag('bargain')).toBe(true);
    g.setFlag('pump_fixed');
    talk(g, 'marta', ['Тридцать капель']);
    expect(g.state.caps).toBe(42);
  });

  it('bargain failure still gives the quest at 15', () => {
    const g = new Game(CONTENT, fixedRng([FAIL]));
    talk(g, 'marta', ['Я могу помочь', 'тридцать', 'Берусь']);
    expect(g.flag('quest_accepted')).toBe(true);
    expect(g.flag('bargain')).toBeUndefined();
  });

  it('lockpick: two failures jam the lock, option disappears', () => {
    const g = new Game(CONTENT, fixedRng([FAIL, FAIL]));
    talk(g, 'door', ['отмычкой', 'Ещё раз', 'отмычкой', 'заклинило']);
    expect(g.flag('lock_fails')).toBe(2);
    const d = new DialogueRunner(g, CONTENT.dialogues.door, 'door');
    expect(d.options().some((o) => o.label.includes('отмычкой'))).toBe(false);
  });

  it('lockpick success opens the door and shows the chance', () => {
    const g = new Game(CONTENT, fixedRng([PASS]));
    const d = new DialogueRunner(g, CONTENT.dialogues.door, 'door');
    expect(d.options().find((o) => o.label.includes('отмычкой'))!.label).toContain('[Взлом 40%]');
    talk(g, 'door', ['отмычкой']);
    expect(g.flag('door_open')).toBe(true);
    expect(g.stage('water')).toBe('get_valve');
  });

  it('crowbar from the pickup opens the door', () => {
    const g = new Game(CONTENT);
    talk(g, 'car_pickup', ['Поднять брезент']);
    talk(g, 'door', ['[Монтировка]']);
    expect(g.flag('door_method')).toBe('монтировка');
  });

  it('Hank gives the key for free on a speech pass, only one attempt', () => {
    const g = new Game(CONTENT, fixedRng([FAIL]));
    g.setFlag('quest_accepted');
    talk(g, 'hank', ['ключ от насосной', 'костёр', 'Вернуться к делу']);
    const d = new DialogueRunner(g, CONTENT.dialogues.hank, 'hank');
    d.choose(0);
    expect(d.options().some((o) => o.label.includes('костёр'))).toBe(false);
  });

  it('repair failure hurts and allows retry', () => {
    const g = new Game(CONTENT, fixedRng([FAIL, PASS]));
    g.give('valve');
    talk(g, 'pump', ['на глаз', 'Попробовать снова', 'на глаз']);
    expect(g.state.hp).toBe(28);
    expect(g.flag('pump_fixed')).toBe(true);
  });
});
