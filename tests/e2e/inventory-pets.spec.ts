import { test, expect } from '@playwright/test';
import { GL, W, answer, clickActor, closed, give, startGame, state } from './helpers';

test.use(GL);

test('inventory actions keep hand slots and a full flask ends thirst', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page);
  await give(page, 'flask');
  await page.evaluate(() => {
    const g = (window as unknown as { __world: { session(): { game: { body: { thirsty?: boolean } } } } }).__world.session().game;
    g.body.thirsty = true;
  });

  await page.keyboard.press('i');
  await expect.poll(async () => (await state(page)).modal).toBe(true);
  await page.waitForTimeout(250); // wait for Phaser to install inventory hit areas under load
  await page.mouse.click(460, 260, { button: 'right' }); // full flask in the second row
  await page.screenshot({ path: 'test-results/e2e-inventory-01-drink-menu.png' });
  await page.mouse.click(600, 260); // ВЫПИТЬ
  await expect.poll(async () => (await state(page)).modal).toBe(false);
  const afterDrink = await state(page) as Awaited<ReturnType<typeof state>> & { body: { thirsty?: boolean } };
  expect(afterDrink.body.thirsty).toBe(false);
  expect(afterDrink.items.flask).toBeUndefined();
  expect(afterDrink.items.canteen).toBe(2);

  await page.keyboard.press('i');
  await page.waitForTimeout(150); // Phaser registers the newly drawn hit areas on the next frame
  await page.mouse.click(656, 160); // equipped rifle in the grid
  await page.screenshot({ path: 'test-results/e2e-inventory-02-hand-menu.png' });
  await page.mouse.click(800, 190); // УБРАТЬ ИЗ РУКИ 1
  const slots = () => page.evaluate(() => (window as unknown as { __world: { session(): { game: { weaponSlots(): [string, string] } } } }).__world.session().game.weaponSlots());
  await expect.poll(slots).toEqual(['', 'knife']);
  await page.screenshot({ path: 'test-results/e2e-inventory-02-empty-first-hand.png' });
  await page.waitForTimeout(150);
  await page.mouse.click(656, 160); // rifle in the grid, single click opens actions
  await page.waitForTimeout(150);
  await page.mouse.click(800, 195); // В РУКУ 2: the first hand stays empty
  await expect.poll(slots).toEqual(['', 'rifle']);
  await page.waitForTimeout(150);
  await page.mouse.click(754, 160); // knife
  await page.waitForTimeout(150);
  await page.mouse.click(920, 150); // В РУКУ 1
  await expect.poll(slots).toEqual(['knife', 'rifle']);
  expect(errors).toEqual([]);
});

test('a town cat is clickable and can be petted in dialogue', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page);
  await W(page, 'teleport', 10, 27);
  expect(await clickActor(page, 'town_cat')).toBe(true);
  await expect.poll(async () => (await state(page)).modal).toBe(true);
  await answer(page, 'Осторожно погладить');
  const talk = await W<{ text: string } | null>(page, 'dialogue');
  expect(talk?.text).toContain('мурлычет');
  await page.screenshot({ path: 'test-results/e2e-pets-01-cat.png' });
  await answer(page, 'Пусть отдыхает');
  await closed(page);
  expect(errors).toEqual([]);
});
