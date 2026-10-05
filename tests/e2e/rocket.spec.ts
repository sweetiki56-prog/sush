import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, give, startGame, state, talkTo } from './helpers';

test.use(GL);

async function at(page: Page, map: string): Promise<void> {
  await expect.poll(async () => (await state(page)).flags.at, { timeout: 60_000 }).toBe(map);
  await expect.poll(() => W<string>(page, 'worldMap'), { timeout: 30_000 }).toBe(map);
  await page.waitForFunction(() => (window as unknown as { __world?: { player(): unknown } }).__world?.player(), null, { timeout: 30_000 });
  await expect.poll(() => W<boolean>(page, 'loading'), { timeout: 30_000 }).toBe(false);
  await page.waitForTimeout(400);
}

test('the moving storm discovers Raketa’s Sanctuary and its marker remains available', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 0);
  await page.evaluate(() => {
    const room = (window as unknown as { __world: { session(): { local: { room: { world: { flags: Record<string, unknown> }; grid: { applyFlag(k: string, v: unknown): void } } } } } }).__world.session().local.room;
    room.world.flags.trust_outcome = 'tax';
    room.world.flags.chapter5_done = true;
    room.grid.applyFlag('trust_outcome', 'tax');
  });
  await W(page, 'teleport', 2, 25);
  await W(page, 'walkTo', 0, 25);
  await page.waitForFunction(() => !!(window as unknown as { __travel?: unknown }).__travel, null, { timeout: 30_000 });
  await page.evaluate(() => {
    const s = (window as unknown as { __world: { session(): { local: { room: { world: { travel: { x: number; y: number; minute: number; parties: unknown[] } } } } } } }).__world.session();
    Object.assign(s.local.room.world.travel, { x: 90.5, y: 42.5, minute: 0, parties: [] });
    (window as unknown as { __travel: { go(x: number, y: number): void } }).__travel.go(91, 42);
  });
  await at(page, 'rocket_outpost');
  await page.mouse.click(480, 595); // close the Chapter I endcard raised by leaving Rusty Well
  await page.waitForTimeout(350);
  expect((await state(page)).flags.rocket_found).toBe(true);
  await page.screenshot({ path: 'test-results/e2e-rocket-01-outpost.png' });
  expect(errors).toEqual([]);
});

test('pilgrim gear returns intact after the audience and the one-time gifts stay one-time', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2);
  await give(page, 'knife');
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(m: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: 'rocket_outpost' } }));
  await at(page, 'rocket_outpost');
  const before = (await state(page)).items.knife;
  await W(page, 'teleport', 11, 17);
  await talkTo(page, 'rocket_psar');
  await answer(page, 'Сдать вещи');
  expect((await state(page)).items.knife ?? 0).toBe(0);
  await answer(page, 'Войти.');
  await closed(page);
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(m: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: 'rocket_palace' } }));
  await at(page, 'rocket_palace');
  await W(page, 'teleport', 16, 10);
  await talkTo(page, 'rocket_dog_actor');
  await answer(page, 'важно никому не навредить');
  await answer(page, 'принять её взгляд');
  const after = await state(page);
  expect(after.items.knife).toBe(before);
  expect([after.items.rocket_collar, after.items.rocket_fang, after.items.rocket_water]).toEqual([1, 1, 3]);
  await page.mouse.click(600, 210); // finish the dialogue typewriter before visual QA
  await page.waitForTimeout(2200);
  await page.screenshot({ path: 'test-results/e2e-rocket-02-audience.png' });
  await answer(page, 'Идти к Хранителю');
  await W(page, 'teleport', 16, 10);
  await talkTo(page, 'rocket_dog_actor');
  expect((await W<{ options: string[] }>(page, 'dialogue')).options.some((o) => o.includes('принять её взгляд'))).toBe(false);
  expect(errors).toEqual([]);
});

test('pilgrim chest survives a save inside the Sanctuary and returns its contents after loading', async ({ page }) => {
  test.setTimeout(120_000);
  await startGame(page, 0);
  await give(page, 'knife', 2);
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(m: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: 'rocket_outpost' } }));
  await at(page, 'rocket_outpost');
  const before = (await state(page)).items.knife;
  await W(page, 'teleport', 11, 17);
  await talkTo(page, 'rocket_psar');
  await answer(page, 'Сдать вещи');
  await answer(page, 'Войти.');
  await closed(page);
  expect((await state(page)).items.knife ?? 0).toBe(0);
  await page.evaluate(() => (window as unknown as { __world: { session(): { save(): void } } }).__world.session().save());

  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __menu?: unknown }).__menu);
  await page.evaluate(() => (window as unknown as { __menu: { continueGame(): void } }).__menu.continueGame());
  await page.waitForFunction(() => !!(window as unknown as { __world?: unknown }).__world);
  await at(page, 'rocket_outpost');
  expect((await state(page)).items.knife ?? 0).toBe(0);
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(m: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: 'rusty_well' } }));
  await at(page, 'rusty_well');
  expect((await state(page)).items.knife).toBe(before);
  const escrow = await page.evaluate(() => (window as unknown as { __world: { session(): { game: { state: { rocketEscrow?: Record<string, number> } } } } }).__world.session().game.state.rocketEscrow);
  expect(escrow).toBeUndefined();
});
