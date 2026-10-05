import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';

/** These rules catch damaged strings; prose, names and directions still need an editor. */
describe('dialogue text hygiene', () => {
  for (const [id, dialogue] of Object.entries(CONTENT.dialogues)) {
    it(`${id}: speaker, lines and choices are clean`, () => {
      const check = (where: string, value: string) => {
        expect(value.trim(), where).toBe(value);
        expect(value, `${where}: empty`).not.toBe('');
        expect(value, `${where}: stray whitespace`).not.toMatch(/[ \t]{2,}|\t|\r/);
        for (const token of value.match(/\{[^{}]*\}/g) ?? []) {
          expect(token, `${where}: unknown substitution ${token}`).toMatch(/^\{(?:name|f:[\w-]+)\}$/);
        }
      };
      check(`${id}.speaker`, dialogue.speaker);
      for (const [nodeId, node] of Object.entries(dialogue.nodes)) {
        check(`${id}.${nodeId}.text`, node.text);
        for (const [index, option] of node.options.entries()) {
          check(`${id}.${nodeId}.options.${index}`, option.text);
          if (option.check) expect(option.text, `${id}.${nodeId}: skill tag is added by the view`).not.toMatch(/^\[[^\]]*(?:Стрельб|Краснореч|Ремонт|Наук|Взлом|Выживан|Скрытност|Медицин)[^\]]*\]/);
        }
      }
    });
  }
});
