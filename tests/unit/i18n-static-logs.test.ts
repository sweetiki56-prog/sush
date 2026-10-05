import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';
import { Game } from '../../src/core/Game';
import { logLineForDisplay, mapLabelForDisplay } from '../../src/i18n/display';
import { runtimeLineForDisplay } from '../../src/i18n/runtime';

function coreFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? coreFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('English runtime logs', () => {
  it('covers static room and player log lines', () => {
    const game = new Game(CONTENT);
    const missing: string[] = [];
    for (const path of coreFiles('src/core')) {
      const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
      const walk = (node: ts.Node): void => {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
          && ['log', 'logAll'].includes(node.expression.name.text)
          && node.arguments.length && ts.isStringLiteral(node.arguments[0])) {
          const source = node.arguments[0].text;
          if (/[А-Яа-яЁё]/.test(source) && /[А-Яа-яЁё]/.test(logLineForDisplay(game, source, 'en'))) missing.push(`${path}: ${source}`);
        }
        ts.forEachChild(node, walk);
      };
      walk(file);
    }
    expect(missing).toEqual([]);
  });

  it('covers static generated road dialogue and response copy', () => {
    const path = 'src/core/travel/Encounters.ts';
    const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const missing: string[] = [];
    const walk = (node: ts.Node): void => {
      if (ts.isStringLiteral(node) && /[А-Яа-яЁё]/.test(node.text) && node.text.length > 10) {
        const text = runtimeLineForDisplay(mapLabelForDisplay(node.text, 'en'), 'en');
        if (/[А-Яа-яЁё]/.test(text)) missing.push(node.text);
      }
      ts.forEachChild(node, walk);
    };
    walk(file);
    expect(missing).toEqual([]);
  });

  it('covers interpolated room and player log templates', () => {
    const game = new Game(CONTENT);
    const missing: string[] = [];
    for (const path of coreFiles('src/core')) {
      const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
      const walk = (node: ts.Node): void => {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
          && ['log', 'logAll'].includes(node.expression.name.text)
          && node.arguments.length && ts.isTemplateExpression(node.arguments[0])) {
          const template = node.arguments[0];
          let source = template.head.text + template.templateSpans.map((span) => `1${span.literal.text}`).join('');
          // Nested ternaries produce one of these authored fragments, not the synthetic "1".
          if (source.includes('бросок')) source = source.replace(/: 1\.?$/, source.startsWith('[') ? ': успех.' : source.includes('1: 1,') ? ': попадание.' : ': точно в цель.');
          if (source.includes('точно в цель.')) source = source.replace(/^1 /, 'Вы бросаете ');
          if (source.endsWith('бой!1')) source = source.slice(0, -1);
          if (/[А-Яа-яЁё]/.test(source) && /[А-Яа-яЁё]/.test(logLineForDisplay(game, source, 'en'))) missing.push(`${path}: ${source}`);
        }
        ts.forEachChild(node, walk);
      };
      walk(file);
    }
    expect(missing).toEqual([]);
  });
});
