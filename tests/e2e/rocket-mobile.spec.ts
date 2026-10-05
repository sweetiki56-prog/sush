import { test, expect, devices, type Page } from '@playwright/test';
import { W, give, startGame, state } from './helpers';

const phone = devices['iPhone 13 landscape'];
test.use({ ...phone, defaultBrowserType: 'chromium', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

async function tap(page: Page, x: number, y: number): Promise<void> {
  const box = (await page.locator('canvas').boundingBox())!;
  const scale = box.width / 1280;
  await page.touchscreen.tap(box.x + x * scale, box.y + y * scale);
  await page.waitForTimeout(300);
}

test('Raketa’s guard can take gear through touch-only dialogue on a phone', async ({ page }) => {
  test.setTimeout(90_000);
  await startGame(page, 0);
  await give(page, 'knife');
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(m: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: 'rocket_outpost' } }));
  await expect.poll(async () => (await state(page)).flags.at).toBe('rocket_outpost');
  await expect.poll(() => W<string>(page, 'worldMap')).toBe('rocket_outpost');
  await expect.poll(() => W<boolean>(page, 'loading')).toBe(false);
  await W(page, 'teleport', 11, 17);
  await page.waitForTimeout(600);
  const pos = await W<{ x: number; y: number }>(page, 'screenOfActor', 'rocket_psar');
  await tap(page, pos.x, pos.y);
  await expect.poll(async () => (await state(page)).modal).toBe(true);
  await tap(page, 640, 220); // finish the typewriter
  await tap(page, 320, 330); // first, wide answer: surrender gear
  await expect.poll(async () => (await state(page)).flags.rocket_disarmed).toBe(true);
  expect((await state(page)).items.knife ?? 0).toBe(0);
  await page.screenshot({ path: 'test-results/e2e-rocket-mobile.png' });
});
