// Character creation and level-up through the real UI (mouse clicks on the dossier and the sheet).
import { test, expect, type Page } from '@playwright/test';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

type Char = { name: string; attrs: Record<string, number>; tags: string[]; traits: string[]; perks: string[]; spent: Record<string, number>; skillPoints: number; level: number };
const char = (page: Page) =>
  page.evaluate(() => (window as unknown as { __world: { session(): { game: { char: Char } } } }).__world.session().game.char);
// Phaser makes new hit zones clickable on its next step: let two frames pass after every click.
const frames = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
const click = async (page: Page, x: number, y: number) => {
  await page.mouse.click(x, y);
  await frames(page);
};

// dossier layout (src/scenes/CreateScene.ts): attributes at (396, 64, w 400), skills at (808, 64, w 448), traits at (24, 396)
const attrPlus = (i: number) => [396 + 400 - 24, 64 + 40 + i * 30 + 9] as const;
const skillRow = (i: number) => [900, 64 + 42 + i * 34 + 8] as const;
const traitRow = (i: number) => [120, 396 + 38 + i * 30 + 8] as const;

test('create a character by hand, then level up and take a perk', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __menu?: unknown }).__menu);
  await page.keyboard.press('Enter'); // НОВАЯ ИГРА
  await page.waitForFunction(() => !!(window as unknown as { __create?: unknown }).__create);
  await page.waitForTimeout(300);

  for (let i = 0; i < 5; i++) await click(page, ...attrPlus(5)); // Ловкость 5 -> 10
  await click(page, ...attrPlus(0)); // no points left: stays 5
  for (const s of [0, 3, 4]) await click(page, ...skillRow(s)); // Стрельба, Скрытность, Взлом
  await click(page, ...skillRow(6)); // a fourth tag is refused
  await click(page, ...traitRow(0)); // Самородок
  await page.keyboard.type('Tester');
  const draft = await page.evaluate(() => (window as unknown as { __create: { draft: { attrs: Record<string, number>; tags: string[]; traits: string[]; name: string } } }).__create.draft);
  expect(draft.attrs.agi).toBe(10);
  expect(draft.attrs.str).toBe(5);
  expect(draft.tags).toEqual(['guns', 'sneak', 'lockpick']);
  expect(draft.traits).toEqual(['gifted']);
  expect(draft.name).toBe('Tester');
  await page.screenshot({ path: 'test-results/e2e-07-dossier.png' });

  await click(page, 1280 - 204 + 90, 666 + 16); // ГОТОВО
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter'); // finish the prologue typing
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter'); // into the world
  await page.waitForFunction(() => !!(window as unknown as { __world?: unknown }).__world);
  const c = await char(page);
  expect(c).toMatchObject({ name: 'Tester', tags: ['guns', 'sneak', 'lockpick'], traits: ['gifted'], level: 1 });

  // level up and use the sheet: X = 50, Y = 40 (src/ui/CharacterWindow.ts)
  await page.evaluate(() => (window as unknown as { __world: { session(): { game: { addXp(n: number): void } } } }).__world.session().game.addXp(100));
  await page.keyboard.press('c');
  await frames(page);
  for (let i = 0; i < 3; i++) await click(page, 420 + 420 - 24, 100 + 42 + 0 * 34 + 8); // + Стрельба
  await click(page, 520, 540); // ПРИМЕНИТЬ
  await click(page, 1031, 554); // ВЫБРАТЬ ПЕРК
  await click(page, 950, 250 + 38 + 8); // Живучий
  await page.screenshot({ path: 'test-results/e2e-08-perk.png' });
  await click(page, 1031, 554); // ВЗЯТЬ
  const after = await char(page);
  expect(after.spent).toEqual({ guns: 3 });
  expect(after.skillPoints).toBe(17 - 3); // 5 + 2 x Int 6 (Самородок)
  expect(after.perks).toEqual(['tough']);
  expect(errors).toEqual([]);
});
