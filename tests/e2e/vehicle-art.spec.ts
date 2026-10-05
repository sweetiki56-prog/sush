import { expect, test } from '@playwright/test';
import { GL, W, startGame, state } from './helpers';

test.use(GL);

test('original vehicle cutouts remain readable on their maps', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startGame(page);
  await W(page, 'teleport', 18, 24); // beside the sedan, off its footprint
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/e2e-vehicles-sedan.png' });
  await W(page, 'teleport', 32, 22); // beside the pickup and burnt van
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/e2e-vehicles-pickup.png' });
  await W(page, 'teleport', 20, 25); // van stays in view without waking the roadside scorpion
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/e2e-vehicles-van.png' });
  expect(errors).toEqual([]);
});

test('water tanker has its own silhouette in the Elevator yard', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startGame(page);
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(intent: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: 'elevator_yard', entry: 'south' } }));
  await expect.poll(async () => (await state(page)).flags.at, { timeout: 30_000 }).toBe('elevator_yard');
  await expect.poll(() => W(page, 'worldMap'), { timeout: 30_000 }).toBe('elevator_yard');
  await page.waitForFunction(() => (window as unknown as { __world?: { player(): unknown } }).__world?.player());
  await W(page, 'teleport', 29, 20);
  await expect.poll(async () => (await W<{ x: number; y: number }>(page, 'player')).x).toBe(29);
  await expect.poll(() => W(page, 'loading'), { timeout: 30_000 }).toBe(false);
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/e2e-vehicles-tanker.png' });
  expect(errors).toEqual([]);
});
