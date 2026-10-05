import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';
import { DialogueRunner } from '../../src/core/DialogueRunner';
import { Game } from '../../src/core/Game';
import type { Dialogue } from '../../src/core/types';

const dialogue: Dialogue = {
  speaker: 'Путник',
  entry: [{ node: 'hello' }],
  nodes: {
    hello: {
      text: 'Привет, {name}.',
      options: [
        { text: 'Как дорога?', next: 'road' },
        { text: 'Что нового?', next: 'news' },
      ],
    },
    road: { text: 'Тракт свободен.', options: [{ text: 'Спасибо.' }] },
    news: { text: 'Вода подорожала.', options: [{ text: 'Спасибо.' }] },
  },
};

describe('dialogue journal', () => {
  it('keeps only seen and chosen lines, without repeating a conversation', () => {
    const game = new Game(CONTENT);
    const first = new DialogueRunner(game, dialogue, 'traveler');
    first.choose(0);
    first.choose(0);
    const again = new DialogueRunner(game, dialogue, 'traveler');
    again.choose(0);
    again.choose(0);
    expect(game.state.dialogueHistory).toEqual([{ speaker: 'Путник', lines: [
      { role: 'npc', text: 'Привет, Странник.' },
      { role: 'hero', text: 'Как дорога?' },
      { role: 'npc', text: 'Тракт свободен.' },
      { role: 'hero', text: 'Спасибо.' },
    ] }]);
    const different = new DialogueRunner(game, dialogue, 'traveler');
    different.choose(1);
    different.choose(0);
    expect(game.state.dialogueHistory?.[0].lines.map((line) => line.text)).toEqual([
      'Привет, Странник.', 'Как дорога?', 'Тракт свободен.', 'Спасибо.', 'Что нового?', 'Вода подорожала.',
    ]);
  });

  it('survives saving and starts on the next conversation in an old v2 save', () => {
    const game = new Game(CONTENT);
    new DialogueRunner(game, dialogue, 'traveler');
    const saved = structuredClone(game.state);
    const loaded = new Game(CONTENT, Math.random, saved);
    new DialogueRunner(loaded, dialogue, 'traveler');
    expect(loaded.state.dialogueHistory).toHaveLength(1);
    delete saved.dialogueHistory;
    const oldSave = new Game(CONTENT, Math.random, saved);
    new DialogueRunner(oldSave, dialogue, 'traveler');
    expect(oldSave.state.dialogueHistory?.[0].lines).toEqual([{ role: 'npc', text: 'Привет, Странник.' }]);
  });
});

describe('route to Соль', () => {
  it('sends the early quest through Запруда and opens Соль after chapter III', () => {
    const game = new Game(CONTENT);
    const early = CONTENT.quests.inspector.stages.find((stage) => stage.id === 'gone')!;
    for (const journal of [early.journal, ...(early.alt ?? []).map((alt) => alt.journal)]) {
      expect(journal).toMatch(/Запруд/);
      expect(journal).not.toContain('в Соль');
    }
    expect(CONTENT.locations.salt.cell).toEqual([74, 56]);
    expect(game.testAll(CONTENT.locations.salt.open)).toBe(false);
    game.setFlag('chapter3_seen');
    expect(game.testAll(CONTENT.locations.salt.open)).toBe(true);
  });

  it('distinguishes the village exit from the northbound world-map road', () => {
    const marta = CONTENT.dialogues.marta.nodes;
    for (const node of ['after', 'letter_more']) {
      expect(marta[node].text).toMatch(/запад/);
      expect(marta[node].text).toMatch(/север/);
    }
  });
});
