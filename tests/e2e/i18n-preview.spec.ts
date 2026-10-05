import { test, expect } from '@playwright/test';
import { startGame, W, state } from './helpers';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

test('reviewed English menu, settings, and prologue appear without changing game rules', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rusty-well-settings', JSON.stringify({ language: 'en' })));
  await page.goto('/');
  expect(await page.locator('html').getAttribute('lang')).toBe('en');
  expect(await page.title()).toBe('Sush');
  expect(await page.locator('#app-manifest').getAttribute('href')).toBe('manifest.en.webmanifest');
  expect(await page.locator('#turn-line-1').textContent()).toBe('Turn your phone sideways.');
  await page.waitForFunction(() => !!(window as unknown as { __menu?: unknown }).__menu);
  await page.waitForFunction(() => !(window as unknown as { __phaser: { scene: { isActive(id: string): boolean } } }).__phaser.scene.isActive('Loading'));
  const texts = (scene: string) => page.evaluate((id) => {
    const game = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser;
    const strings: string[] = [];
    const visit = (object: unknown): void => {
      if (!object || typeof object !== 'object') return;
      const item = object as { text?: string; list?: unknown[] };
      if (typeof item.text === 'string') strings.push(item.text);
      item.list?.forEach(visit);
    };
    game.scene.getScene(id).children.list.forEach(visit);
    return strings;
  }, scene);
  expect(await texts('Menu')).toContain('> NEW GAME <');
  expect(await texts('Menu')).toContain('The Lowlands, Salt Flats, and Highlands · Chapters I–IX');
  await page.screenshot({ path: 'test-results/e2e-en-menu.png' });

  await page.mouse.click(640, 456);
  expect(await texts('Menu')).toContain('Text speed');
  expect(await texts('Menu')).toContain('Grain and vignette');
  await page.screenshot({ path: 'test-results/e2e-en-settings.png' });
  await page.mouse.click(640, 510); // close settings

  await page.mouse.click(640, 292);
  await page.waitForFunction(() => !!(window as unknown as { __create?: unknown }).__create);
  const dossier = await texts('Create');
  expect(dossier).toContain('WANDERER DOSSIER');
  expect(dossier).toContain('MECHANIC');
  expect(dossier.some((line) => line.includes('Natural Talent'))).toBe(true);
  expect(dossier).not.toContain('НАВЫКИ · отметьте 3 основных');
  await page.screenshot({ path: 'test-results/e2e-en-create.png' });
  await page.mouse.click(90, 364); // select a complete premade build
  expect(await page.evaluate(() => (window as unknown as { __create: { draft: { name: string } } }).__create.draft.name)).toBe('Osya');
  await page.mouse.click(1166, 682);
  await page.waitForFunction(() => (window as unknown as { __phaser: { scene: { isActive(id: string): boolean } } }).__phaser.scene.isActive('Intro'), null, { timeout: 30_000 });
  const intro = await texts('Intro');
  expect(intro).toContain('CHAPTER I · A DROP');
  expect(intro).toContain('[ENTER] BEGIN');
  await page.keyboard.press('Enter');
  expect((await texts('Intro')).some((line) => line.includes('The Svetlaya River ran dry.'))).toBe(true);
  await page.screenshot({ path: 'test-results/e2e-en-intro.png' });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !!(window as unknown as { __world?: { session(): { started: boolean } } }).__world?.session().started);
  await page.waitForFunction(() => !(window as unknown as { __phaser: { scene: { isActive(id: string): boolean } } }).__phaser.scene.isActive('Loading'));
  expect(await texts('UI')).toContain('INVENTORY [I]');
  expect(await texts('UI')).toContain('JOURNAL [J]');
  expect((await texts('UI')).some((line) => line.includes('You enter Rusty Well.'))).toBe(true);
  await page.screenshot({ path: 'test-results/e2e-en-hud.png' });
  await page.keyboard.press('i');
  const inventory = await texts('UI');
  expect(inventory).toContain('INVENTORY');
  expect(inventory).toContain('WEAPONS');
  expect(inventory).toContain('Drops');
  expect(inventory).toContain('HAND 1');
  expect(inventory).not.toContain('ИНВЕНТАРЬ');
  await page.screenshot({ path: 'test-results/e2e-en-inventory.png' });
  await page.keyboard.press('i');
  await page.keyboard.press('c');
  const character = await texts('UI');
  expect(character).toContain('TRAITS AND STATUS');
  expect(character).toContain('PERKS');
  expect(character.some((line) => line.includes('Level 1'))).toBe(true);
  expect(character).not.toContain('ОСОБЕННОСТИ И СОСТОЯНИЕ');
  await page.screenshot({ path: 'test-results/e2e-en-character.png' });
});

test('English is the fresh default; settings can switch to Russian and back', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as unknown as { __menu?: unknown }).__menu);
  await page.waitForFunction(() => !(window as unknown as { __phaser: { scene: { isActive(id: string): boolean } } }).__phaser.scene.isActive('Loading'));
  expect(await page.locator('html').getAttribute('lang')).toBe('en');
  expect(await page.title()).toBe('Sush');
  await page.mouse.click(640, 456); // settings in online-capable menu
  await expect.poll(() => page.evaluate(() => {
    const scene = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('Menu');
    const visit = (item: unknown): boolean => {
      if (!item || typeof item !== 'object') return false;
      const object = item as { text?: string; list?: unknown[] };
      return object.text === 'Language' || !!object.list?.some(visit);
    };
    return scene.children.list.some(visit);
  })).toBe(true);
  await page.mouse.click(858, 170); // center of language arrow: English → Русский
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('rusty-well-settings') ?? '{}').language)).toBe('ru');
  await page.mouse.click(640, 510); // apply and restart
  await expect.poll(() => page.locator('html').getAttribute('lang'), { timeout: 30_000 }).toBe('ru');
  expect(await page.title()).toBe('Сушь');
  await page.waitForFunction(() => !!(window as unknown as { __menu?: unknown }).__menu);
  await page.waitForFunction(() => !(window as unknown as { __phaser: { scene: { isActive(id: string): boolean } } }).__phaser.scene.isActive('Loading'));
  await page.mouse.click(640, 456);
  await page.mouse.click(858, 170); // Русский → English
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('rusty-well-settings') ?? '{}').language)).toBe('en');
  await page.mouse.click(640, 510);
  await expect.poll(() => page.locator('html').getAttribute('lang'), { timeout: 30_000 }).toBe('en');
  expect(await page.title()).toBe('Sush');
});

test('English world map loads translated chart art and travel console', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rusty-well-settings', JSON.stringify({ language: 'en' })));
  await startGame(page, 2);
  await page.keyboard.press('c');
  const sheet = await page.evaluate(() => {
    const scene = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('UI');
    const lines: string[] = [];
    const visit = (item: unknown): void => {
      if (!item || typeof item !== 'object') return;
      const object = item as { text?: string; list?: unknown[] };
      if (typeof object.text === 'string') lines.push(object.text);
      object.list?.forEach(visit);
    };
    scene.children.list.forEach(visit);
    return lines.join('\n');
  });
  expect(sheet).toContain('Voron\nLevel 1');
  expect(sheet).not.toContain('Ворон');
  await page.keyboard.press('c');
  await page.evaluate(() => {
    const game = (window as unknown as { __world: { session(): { game: { setFlag(key: string, value?: unknown): void } } } }).__world.session().game;
    game.setFlag('trust_outcome', 'tax');
    game.setFlag('chapter1_seen');
    game.setFlag('chapter1_done');
  });
  await W(page, 'teleport', 3, 25);
  await W(page, 'walkTo', 0, 25);
  await page.waitForFunction(() => !!(window as unknown as { __travel?: unknown }).__travel, null, { timeout: 30_000 });
  await page.waitForFunction(() => !(window as unknown as { __phaser: { scene: { isActive(id: string): boolean } } }).__phaser.scene.isActive('Loading'));
  await expect.poll(async () => (await state(page)).flags.at).toBe('world');
  await page.waitForFunction(() => {
    const phaser = (window as unknown as { __phaser: { textures: { exists(key: string): boolean } } }).__phaser;
    return phaser.textures.exists('worldmap_low_en_0');
  });
  const text = await page.evaluate(() => {
    const scene = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('Travel');
    const strings: string[] = [];
    const visit = (object: unknown): void => {
      if (!object || typeof object !== 'object') return;
      const item = object as { text?: string; list?: unknown[] };
      if (typeof item.text === 'string') strings.push(item.text);
      item.list?.forEach(visit);
    };
    scene.children.list.forEach(visit);
    return strings.join('\n');
  });
  expect(text).toContain('SNEAK');
  expect(text).toContain('MAKE CAMP');
  expect(text).toContain('Day');
  const hud = await page.evaluate(() => {
    const scene = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: { text?: string }[] } } } } }).__phaser.scene.getScene('UI');
    return scene.children.list.map((child) => child.text ?? '').join('\n');
  });
  expect(hud).toContain('Voron, Lv. 1');
  await page.screenshot({ path: 'test-results/e2e-en-world-map.png' });
});

test('reference-free v2 dialogue history uses saved NPC and role in the English journal', async ({ page }) => {
  await startGame(page, 2);
  await page.waitForFunction(() => !(window as unknown as { __phaser: { scene: { isActive(id: string): boolean } } }).__phaser.scene.isActive('Loading'));
  await page.evaluate(() => {
    const game = (window as unknown as { __world: { session(): { game: { state: { dialogueHistory: unknown[] } } } } }).__world.session().game;
    game.state.dialogueHistory = [{ speaker: 'Старейшина Марта', lines: [
      { role: 'hero', text: 'Договорились.' },
      { role: 'hero', text: 'Меня зовут Ворон.' },
    ] }];
  });
  await page.keyboard.press('j');
  await expect.poll(async () => (await state(page)).modal).toBe(true);
  await page.waitForTimeout(350); // let Phaser register the newly created tab hit areas
  await page.mouse.click(632, 121); // DIALOGUES tab
  const tabText = await page.evaluate(() => {
    const scene = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('UI');
    const lines: string[] = [];
    const visit = (item: unknown): void => {
      if (!item || typeof item !== 'object') return;
      const object = item as { text?: string; list?: unknown[] };
      if (typeof object.text === 'string') lines.push(object.text);
      object.list?.forEach(visit);
    };
    scene.children.list.forEach(visit);
    return lines.join('\n');
  });
  expect(tabText).toContain('Elder Marta');
  await page.waitForTimeout(350); // allow the new row hit area to enter Phaser's input list
  await page.mouse.click(500, 188); // Elder Marta
  const shown = await page.evaluate(() => {
    const scene = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('UI');
    const lines: string[] = [];
    const visit = (item: unknown): void => {
      if (!item || typeof item !== 'object') return;
      const object = item as { text?: string; list?: unknown[] };
      if (typeof object.text === 'string') lines.push(object.text);
      object.list?.forEach(visit);
    };
    scene.children.list.forEach(visit);
    return lines.join('\n');
  });
  expect(shown).toContain('Elder Marta');
  expect(shown).toContain('You: Agreed.');
  expect(shown).toContain('You: My name is Voron.');
  expect(shown).not.toContain('Старейшина Марта');
});
