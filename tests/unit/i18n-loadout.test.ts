import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { loadoutText } from '../../src/i18n/loadout';

describe('arena loadout localization', () => {
  it('covers every static Russian label on the loadout screen', () => {
    const source = readFileSync('src/scenes/LoadoutScene.ts', 'utf8');
    const file = ts.createSourceFile('LoadoutScene.ts', source, ts.ScriptTarget.Latest, true);
    const missing: string[] = [];
    const walk = (node: ts.Node): void => {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /[А-Яа-яЁё]/.test(node.text)
        && /[А-Яа-яЁё]/.test(loadoutText(node.text, 'en'))) missing.push(node.text);
      ts.forEachChild(node, walk);
    };
    walk(file);
    expect(missing).toEqual([]);
  });

  it('handles changing preset, skill, and level values', () => {
    expect(loadoutText('Пресет 3: Mara.', 'en')).toBe('Preset 3: Mara.');
    expect(loadoutText('ПЕРКИ · 2 из 5', 'en')).toBe('PERKS · 2 of 5');
    expect(loadoutText('Навыки: ±5%, до 100%', 'en')).toBe('Skills: ±5%, up to 100%');
    expect(loadoutText('уровень 8', 'en')).toBe('level 8');
  });
});
