import { describe, expect, it } from 'vitest';
import rocket from '../../src/content/dialogues/rocket.json';
import companions from '../../src/content/companions.json';
import dam from '../../src/content/dialogues/dam.json';
import en from '../../src/i18n/en.json';
import es from '../../src/i18n/es.json';
import zh from '../../src/i18n/zh-Hans.json';

type Entry = { ru: string; en?: string; es?: string; 'zh-Hans'?: string };
const catalogs = { en, es, 'zh-Hans': zh } as Record<string, Record<string, Entry>>;
const pointer = (parts: (string | number)[]) => '/' + parts.map(String).join('/');

function strings(value: unknown, path: (string | number)[] = []): [string, string][] {
  if (typeof value === 'string') return /[А-Яа-яЁё]/.test(value) ? [[pointer(path), value]] : [];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => strings(child, [...path, key]));
}

describe('Rocket branch localization', () => {
  it('has every new dialogue line, companion reaction and dam bypass in all three catalogs', () => {
    const keys = strings(rocket, ['dialogues']);
    const c = companions as Record<string, { barks?: { text: string }[] }>;
    for (const [id, def] of Object.entries(c)) {
      const index = def.barks!.length - 1;
      keys.push([`/companions/${id}/barks/${index}/text`, def.barks![index].text]);
    }
    const options = dam.sentry_panel.nodes.look.options as { text: string }[];
    options.forEach((option, index) => {
      if (option.text.startsWith('По записи Обители')) keys.push([`/dialogues/sentry_panel/nodes/look/options/${index}/text`, option.text]);
    });
    for (const [locale, catalog] of Object.entries(catalogs))
      for (const [key, ru] of keys) {
        expect(catalog[key]?.ru, `${locale}: ${key}`).toBe(ru);
        expect(catalog[key]?.[locale as keyof Entry], `${locale}: ${key}`).toBeTruthy();
      }
  });

  it('keeps the single-dog evidence separate from the unproven theory', () => {
    const medical = '/dialogues/rocket_medical/nodes/look/text';
    const theory = '/dialogues/rocket_project/nodes/look/text';
    expect(en[medical].en).toContain('no record of death');
    expect(en[theory].en).toContain('proves nothing');
    expect(es[medical].es).toContain('otra perra');
    expect(es[theory].es).toContain('no demuestra nada');
    expect(zh[medical]['zh-Hans']).toContain('从无死亡');
    expect(zh[theory]['zh-Hans']).toContain('不能证明');
  });
});
