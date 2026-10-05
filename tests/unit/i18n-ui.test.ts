import { afterEach, describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';
import { Game } from '../../src/core/Game';
import { resetSettingsCache, settings, updateSettings } from '../../src/core/Settings';
import type { KV } from '../../src/core/SaveSystem';
import { areaNameForDisplay, characterContentForDisplay, endingSlidesForDisplay, fillDisplay, heroNameForDisplay, locationNameForDisplay, logLineForDisplay } from '../../src/i18n/display';
import { uiText } from '../../src/i18n/ui';
import { EN_TIPS, TIPS, randomTip } from '../../src/ui/tips';
import en from '../../src/i18n/en.json';
import { attrName, skillName } from '../../src/i18n/character';
import { itemStats } from '../../src/ui/itemText';
import { contentText } from '../../src/i18n/display';
import { slidesFor } from '../../src/core/endings';

afterEach(() => resetSettingsCache());

describe('English client UI foundations', () => {
  it('uses reviewed location and area names', () => {
    const game = new Game(CONTENT);
    expect(locationNameForDisplay(game, 'rusty_well', 'en')).toBe('Rusty Well');
    expect(locationNameForDisplay(game, 'zapruda', 'en')).toBe('Zapruda');
    expect(locationNameForDisplay(game, 'missing', 'en')).toBe('missing');
    expect(areaNameForDisplay(game, 'zapruda', 'zap_lower', 'en')).toBe('Lower City');
    expect(areaNameForDisplay(game, 'rusty_well', 'rusty_well', 'en')).toBe('Settlement');
    expect(areaNameForDisplay(game, 'rocket', 'rocket_sanctuary', 'en')).toBe('Enclosed Garden');
  });

  it('keeps every town-plan area name reviewed and in sync with its Russian source', () => {
    for (const [id, place] of Object.entries(CONTENT.locations)) {
      for (const [index, area] of (place.areas ?? []).entries()) {
        const key = `/locations/${id}/areas/${index}/name` as keyof typeof en;
        const entry = en[key];
        expect(entry, key).toBeDefined();
        expect(entry.ru, key).toBe(area.name);
        expect('draft' in entry && entry.draft, key).toBe(false);
        expect(entry.en, key).not.toBe(area.name);
      }
    }
  });

  it('keeps UI copy paired by semantic key', () => {
    expect(uiText('settings.title', 'ru')).toBe('НАСТРОЙКИ');
    expect(uiText('settings.title', 'en')).toBe('SETTINGS');
    expect(uiText('map.opensInChapter', 'en')).toBe('unlocks in Chapter');
    expect(uiText('loading.rocketTitle', 'en')).toBe("Raketa's Sanctuary");
    expect(uiText('menu.newGame', 'en')).toBe('NEW GAME');
    expect(uiText('intro.prologue', 'en')).toContain('{name}');
    expect(uiText('intro.prologue', 'en')).toContain('The Svetlaya River');
  });

  it('shows built-in hero names in English without changing saved names or player-entered names', () => {
    const game = new Game(CONTENT);
    game.char.name = 'Лис';
    expect(heroNameForDisplay(game.char.name, 'en')).toBe('Lis');
    expect(fillDisplay('Hello, {name}.', game, 'en')).toBe('Hello, Lis.');
    expect(game.char.name).toBe('Лис');
    expect(heroNameForDisplay('Unlisted Player', 'en')).toBe('Unlisted Player');
  });

  it('defaults to English and persists an explicit Russian preference outside save data', () => {
    const data = new Map<string, string>();
    const kv: KV = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
      removeItem: (key) => void data.delete(key),
    };
    expect(settings(kv).language).toBe('en');
    updateSettings({ language: 'ru' }, kv);
    resetSettingsCache();
    expect(settings(kv).language).toBe('ru');
    data.set('rusty-well-settings', JSON.stringify({ language: 'zh-Hans' }));
    resetSettingsCache();
    expect(settings(kv).language).toBe('en');
  });

  it('pairs loading tips in both languages without mixed-script English', () => {
    expect(EN_TIPS).toHaveLength(TIPS.length);
    expect(EN_TIPS.every((tip) => !/[А-Яа-яЁё]/.test(tip))).toBe(true);
    expect(EN_TIPS).toContain(randomTip('en'));
  });

  it('reviews the entire character catalog without changing build rules', () => {
    const source = CONTENT.character;
    const shown = characterContentForDisplay(source, 'en');
    expect(Object.entries(en).filter(([path, entry]) => path.startsWith('/character/') && 'draft' in entry && entry.draft)).toHaveLength(0);
    expect(shown.traits.drifter.desc).toContain('The road clings to you');
    expect(shown.perks.nimble.desc).toContain('Lockpicking');
    expect(shown.premades[1].name).toBe('Lis');
    expect(shown.premades[1].attrs).toEqual(source.premades[1].attrs);
    expect(shown.traits.drifter.mods).toEqual(source.traits.drifter.mods);
    expect(source.premades[1].name).toBe('Лис');
    expect(attrName('str', 'en')).toBe('Strength');
    expect(skillName('barter', 'en')).toBe('Barter');
  });

  it('shows reviewed companion arrival lines in English but preserves saved Russian logs', () => {
    const game = new Game(CONTENT);
    const line = `${CONTENT.companions.hank.name}: «${CONTENT.companions.hank.barks![1].text}»`;
    expect(logLineForDisplay(game, line, 'en')).toContain('Hank: “Zapruda.');
    expect(logLineForDisplay(game, line, 'ru')).toBe(line);
    expect(logLineForDisplay(game, 'Вы входите в Ржавый колодец. Где-то скрипит несмазанная помпа.', 'en')).toBe('You enter Rusty Well. Somewhere nearby, an unoiled pump creaks.');
    expect(logLineForDisplay(game, 'Сургучная метка: третья.', 'en')).toBe('Wax mark: third.');
    expect(logLineForDisplay(game, 'unknown message', 'en')).toBe('unknown message');
  });

  it('keeps starter inventory names and combat stats readable in English', () => {
    expect(contentText('/items/crowbar/name', CONTENT.items.crowbar.name, 'en')).toBe('Crowbar');
    expect(contentText('/items/shells/name', CONTENT.items.shells.name, 'en')).toBe('Shotgun Shells');
    expect(contentText('/items/letter/desc', CONTENT.items.letter.desc, 'en')).toContain('To Prokop, Kolyuchka');
    expect(itemStats(CONTENT, 'rifle', 'en')).toContain('Damage');
    expect(itemStats(CONTENT, 'rifle', 'en')).toContain('AP');
    expect(itemStats(CONTENT, 'jacket', 'en')).toContain('Damage threshold');
    expect(itemStats(CONTENT, 'jacket', 'ru')).toContain('Порог');
    expect(itemStats(CONTENT, 'venom_ward', 'en')).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('reviews item, combat, board, trader and travel catalogs without changing source data', () => {
    const groups = ['items', 'weapons', 'creatures', 'jobs', 'traders', 'travel', 'locations'];
    for (const group of groups) {
      const drafts = Object.entries(en).filter(([path, entry]) => path.startsWith(`/${group}/`) && 'draft' in entry && entry.draft);
      expect(drafts, group).toHaveLength(0);
    }
    expect(contentText('/creatures/boxer/name', CONTENT.creatures.boxer.name, 'en')).toBe('Bugai');
    expect(contentText('/weapons/lastochka/name', CONTENT.weapons.lastochka.name, 'en')).toBe('“Swallow”');
    expect(contentText('/jobs/stingers/title', CONTENT.jobs.stingers.title, 'en')).toBe('Stingers for the Brew');
    const log = CONTENT.locations.barkhan.reach![0].log!;
    expect(logLineForDisplay(new Game(CONTENT), log, 'en')).toContain("Barkhan's campsite");
  });

  it('shows the selected ending variant in English while retaining the Russian source slide', () => {
    const game = new Game(CONTENT);
    game.setFlag('rocket_fate', 'shared');
    game.setFlag('ending', 'flood');
    const source = slidesFor(game, CONTENT.endings);
    const shown = endingSlidesForDisplay(source, CONTENT.endings, game, 'en');
    const rocket = shown.find((slide) => slide.id === 'rocket')!;
    expect(rocket.title).toBe("Raketa's Sanctuary");
    expect(rocket.text).toContain('sheltered refugees');
    expect(source.find((slide) => slide.id === 'rocket')!.text).toContain('беженцев');
    expect(Object.entries(en).filter(([path, entry]) => path.startsWith('/endings/') && 'draft' in entry && entry.draft)).toHaveLength(0);
  });
});
