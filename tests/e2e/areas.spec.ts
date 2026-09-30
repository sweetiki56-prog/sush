// Stage L in the browser: the roof of the «Сухая глотка» melts when the hero walks in, the south way out of Три
// столба leads to the substation ruins and back, and the barge opens its town plan from the world map.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, startGame, state } from './helpers';

test.use(GL);

type Town = { areas(): string[]; enter(map: string): void };
const town = (page: Page) => page.evaluate(() => (window as unknown as { __town?: Town }).__town?.areas() ?? null);

async function at(page: Page, map: string): Promise<void> {
  await expect.poll(async () => (await state(page)).flags.at, { timeout: 60_000 }).toBe(map);
  await page.waitForFunction(() => (window as unknown as { __world?: { player(): unknown } }).__world?.player(), null, { timeout: 30_000 });
  await page.waitForTimeout(800);
}

test('areas: a roof melts, an edge leads to the next area and back, the barge opens its plan', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2);
  for (const [k, v] of [['chapter1_seen', true], ['trust_outcome', 'tax'], ['chapter1_done', true]] as const) await W(page, 'flag', k, v);
  await W(page, 'quietRoad', true);
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(m: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: 'three_pillars' } }));
  await at(page, 'three_pillars');

  // the roof over the tavern: shown from outside, gone once inside
  await W(page, 'teleport', 18, 28);
  await page.waitForTimeout(600);
  expect(await W(page, 'roof', 'tavern')).toBe(1);
  await W(page, 'walkTo', 12, 29);
  await expect.poll(() => W(page, 'roof', 'tavern'), { timeout: 20_000 }).toBe(0);
  await page.screenshot({ path: 'test-results/e2e-areas-01-tavern.png' });
  await W(page, 'walkTo', 18, 29);
  await expect.poll(() => W(page, 'roof', 'tavern'), { timeout: 20_000 }).toBe(1);

  // down the path to the substation ruins, and back up
  await W(page, 'teleport', 33, 37);
  await page.waitForTimeout(400);
  await W(page, 'walkTo', 33, 39);
  await at(page, 'pillars_ruins');
  await page.screenshot({ path: 'test-results/e2e-areas-02-ruins.png' });
  expect((await state(page)).flags.seen_pillars_ruins).toBe(true);
  await W(page, 'walkTo', 16, 0);
  await at(page, 'three_pillars');

  // out on the road and to the barge: the plan of its areas
  await W(page, 'teleport', 2, 19);
  await page.waitForTimeout(400);
  await W(page, 'walkTo', 0, 19);
  await page.waitForFunction(() => !!(window as unknown as { __travel?: unknown }).__travel, null, { timeout: 30_000 });
  await page.evaluate(() => (window as unknown as { __travel: { to(id: string): void } }).__travel.to('barge'));
  await expect.poll(() => town(page), { timeout: 120_000 }).toEqual(['barge_bed', 'barge_deck']);
  await page.screenshot({ path: 'test-results/e2e-areas-03-plan.png' });
  await page.keyboard.press('2');
  await at(page, 'barge_deck');
  await page.screenshot({ path: 'test-results/e2e-areas-04-deck.png' });
  expect(errors).toEqual([]);
});
