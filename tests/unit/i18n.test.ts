import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';
import { localizedContent } from '../../src/i18n/content';
import en from '../../src/i18n/en.json';
import es from '../../src/i18n/es.json';
import zhHans from '../../src/i18n/zh-Hans.json';

describe('translation catalogs (work in progress)', () => {
  it('preserves every game rule while replacing reviewed text', () => {
    const translated = localizedContent(CONTENT, 'en');
    expect(translated.quests.mandate.title).toBe('The Mandate');
    expect(translated.dialogues.marta.nodes.after.text).toContain('head north to Three Pillars');
    expect(translated.quests.mandate.stages[1].id).toBe(CONTENT.quests.mandate.stages[1].id);
    expect(translated.dialogues.marta.nodes.after.options.map((option) => ({ ...option, text: '' }))).toEqual(
      CONTENT.dialogues.marta.nodes.after.options.map((option) => ({ ...option, text: '' })),
    );
    expect(translated.dialogues.marta.nodes.after.options[0].text).not.toBe(CONTENT.dialogues.marta.nodes.after.options[0].text);
    expect(localizedContent(CONTENT, 'es').dialogues.marta.nodes.after.text).toContain('Tres Pilares');
    expect(localizedContent(CONTENT, 'zh-Hans').dialogues.marta.nodes.after.text).toContain('三柱镇');
    expect(translated.armor.jacket.name).toBe('Leather Jacket');
    expect(localizedContent(CONTENT, 'es').armor.jacket.name).toBe('Chaqueta de cuero');
    expect(localizedContent(CONTENT, 'zh-Hans').armor.jacket.name).toBe('皮夹克');
    expect(CONTENT.quests.mandate.title).toBe('Мандат');
    expect(localizedContent(CONTENT, 'ru')).toBe(CONTENT);
  });

  it('rejects stale source strings and lost placeholders', () => {
    for (const [locale, catalog] of [['en', en], ['es', es], ['zh-Hans', zhHans]] as const)
      for (const [path, entry] of Object.entries(catalog)) {
      const parts = path.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
      let value: unknown = CONTENT;
      for (const part of parts) value = (value as Record<string, unknown>)[part];
      expect(value, path).toBe(entry.ru);
      const tokens = (text: string) => [...text.matchAll(/\{[^{}]*\}/g)].map(([token]) => token).sort();
      const translated = entry[locale];
      expect(tokens(translated), `${locale}:${path}`).toEqual(tokens(entry.ru));
      expect(translated, `${locale}:${path}`).not.toMatch(/[А-Яа-яЁё]/);
    }
  });

  it('keeps canonical place names instead of translating them as common nouns', () => {
    expect(en['/locations/zapruda/name'].en).toBe('Zapruda');
    expect(en['/endings/9/title'].en).toBe('Zapruda');
    expect(en['/endings/8/title'].en).toBe('Kolyuchka');
    expect(en['/endings/4/title'].en).toBe('Inspector Shluz');
    expect(en['/endings/2/title'].en).toBe('Surguch');
    expect(en['/items/flaregun/name'].en).toBe('Flare Gun');
    expect(es['/locations/kolyuchka/name'].es).toBe('Kolyuchka');
    expect(zhHans['/locations/dam/name']['zh-Hans']).toBe('扎斯隆大坝');
    expect(en['/dialogues/archive_door/nodes/open/text'].ru).toBe(CONTENT.dialogues.archive_door.nodes.open.text);
    expect(en).not.toHaveProperty('/dialogues/archive_door/nodes/look/text');
  });

  it('keeps Irga’s companion dialogue at Rosa-2, not Shepot’s arena home', () => {
    const irga = CONTENT.dialogues.comp_irga;
    expect(irga.nodes.home.text).toContain('Ирга');
    expect(irga.nodes.home.text).toContain('Росы-2');
    expect(irga.nodes.home.text).not.toContain('Шёпот');
    expect(en['/dialogues/comp_irga/nodes/home/text'].en).toContain('Irga');
  });

  it('spells glossary names one way in English', () => {
    // Variants that crept into the catalog once; docs/LOCALIZATION.md holds the chosen form.
    const banned = /Shlyuz|Khlebnoye|Sukhovey|Sukhostoi|Dew Order|grain elevator|Wax-seal|Warden['’]s (?:Bunker|Rod|Button)|Warden-4|\bB-4\b|\bthe printer\b/;
    const hits = Object.entries(en)
      .filter(([, entry]) => banned.test(entry.en) || (/фляг/i.test(entry.ru) && /\bflasks?\b/i.test(entry.en)))
      .map(([path, entry]) => `${path}: ${entry.en}`);
    expect(hits).toEqual([]);
    for (const [path, entry] of Object.entries(en)) {
      const gear = /^\/(armor|weapons)\/([^/]+)\/name$/.exec(path);
      const item = gear && (en as Record<string, { ru: string; en: string }>)[`/items/${gear[2]}/name`];
      if (item && item.ru === entry.ru) expect(entry.en, path).toBe(item.en);
    }
  });
});
