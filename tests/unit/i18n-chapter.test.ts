import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { chapterText } from '../../src/i18n/chapter';

describe('English chapter recaps', () => {
  it('translates state-dependent values and route summaries', () => {
    expect(chapterText('продана Затвору', 'en')).toBe('sold to Zatvor');
    expect(chapterText('7 успех / 2 провал', 'en')).toBe('7 passed / 2 failed');
    expect(chapterText('Лис, уровень 6', 'en')).toBe('Lis, level 6');
    expect(chapterText('Custom Name, уровень 6', 'en')).toBe('Custom Name, level 6');
    expect(chapterText('12 мин 04 с', 'en')).toBe('12 min 04 sec');
    expect(chapterText('Впереди — водонапорные башни Запруды. Нотариус в Нижнем городе прочтёт Мандат. Если сборщики на воротах пропустят…', 'en'))
      .not.toMatch(/[А-Яа-яЁё]/);
  });

  it('covers every static Russian fragment used by the chapter-end screen', () => {
    const source = readFileSync('src/ui/Windows.ts', 'utf8');
    const start = source.indexOf('function nestOutcome(');
    const file = ts.createSourceFile('Windows.ts', source, ts.ScriptTarget.Latest, true);
    const missing = new Set<string>();
    const walk = (node: ts.Node): void => {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.getStart(file) >= start) {
        const value = node.text;
        if (value !== 'спрятан' && /[А-Яа-яЁё]/.test(value) && /[А-Яа-яЁё]/.test(chapterText(value, 'en'))) missing.add(value);
      }
      ts.forEachChild(node, walk);
    };
    walk(file);
    expect([...missing]).toEqual([]);
  });
});
