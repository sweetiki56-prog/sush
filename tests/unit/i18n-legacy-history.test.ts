import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';
import { Game } from '../../src/core/Game';
import en from '../../src/i18n/en.json';
import { historyLineForDisplay, historySpeakerForDisplay } from '../../src/i18n/display';

describe('reference-free v2 dialogue history', () => {
  it('identifies every current catalog line by saved speaker and role', () => {
    const game = new Game(CONTENT);
    const missing: string[] = [];
    for (const [path, entry] of Object.entries(en)) {
      const parts = path.match(/^\/dialogues\/([^/]+)\/nodes\/[^/]+\/(text|options\/\d+\/text)$/);
      if (!parts || !entry.en) continue;
      const speaker = en[`/dialogues/${parts[1]}/speaker` as keyof typeof en]?.ru;
      if (!speaker) continue;
      const role = parts[2] === 'text' ? 'npc' : 'hero';
      const shown = historyLineForDisplay({ role, text: entry.ru }, game, 'en', speaker);
      if (shown !== entry.en) missing.push(`${path}: ${shown}`);
    }
    expect(missing).toEqual([]);
  });

  it('keeps different voices for identical Russian lines and translates old speaker headings', () => {
    const game = new Game(CONTENT);
    const nearby = { role: 'npc' as const, text: '— Рядом. Как скажешь.' };
    expect(historyLineForDisplay(nearby, game, 'en', 'Ведро')).toBe('“AT YOUR SIDE. CONFIRMED.”');
    expect(historyLineForDisplay(nearby, game, 'en', 'Шёпот')).toBe('“At your side. If you say so.”');
    const trade = { role: 'hero' as const, text: 'Покажи товар.' };
    expect(historyLineForDisplay(trade, game, 'en', 'Бродяга Хэнк')).toBe('Show me what you have.');
    expect(historyLineForDisplay(trade, game, 'en', 'Оружейник Ремень')).toBe('Show me your goods.');
    expect(historySpeakerForDisplay({ speaker: 'Бродяга Хэнк', lines: [trade] }, game, 'en')).toBe('Drifter Hank');
    expect(historySpeakerForDisplay({ speaker: 'Бродяга Хэнк', lines: [trade] }, game, 'ru')).toBe('Бродяга Хэнк');
  });

  it('restores recorded placeholder values rather than current flags and leaves unknown lines alone', () => {
    const game = new Game(CONTENT);
    game.char.name = 'Лис';
    game.setFlag('evidence', 99);
    const remembered = { role: 'npc' as const, text: 'Затвор молчит. Улик на столе: 7.' };
    expect(historyLineForDisplay(remembered, game, 'en', 'Председатель Затвор'))
      .toBe('Zatvor says nothing. Evidence presented: 7.');
    expect(game.flag('evidence')).toBe(99);
    expect(remembered.text).toBe('Затвор молчит. Улик на столе: 7.');
    expect(historyLineForDisplay({ role: 'hero', text: 'Меня зовут Лис.' }, game, 'en', 'Старейшина Марта'))
      .toBe('My name is Lis.');
    expect(historyLineForDisplay({ role: 'hero', text: 'Покажи товар.' }, game, 'en', 'Неизвестный'))
      .toBe('Покажи товар.');
    expect(historyLineForDisplay({ role: 'npc', text: 'Архивная строка, которой уже нет.' }, game, 'en', 'Старейшина Марта'))
      .toBe('Архивная строка, которой уже нет.');
    expect(historySpeakerForDisplay({ speaker: 'Неизвестный', lines: [] }, game, 'en')).toBe('Неизвестный');
  });
});
