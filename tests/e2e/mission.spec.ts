// Plays the whole mission in a real browser: walking via the dev debug hook
// (same code path as a mouse click on a tile/object), dialogue choices via keys 1-9.
import { test, expect, type Page } from '@playwright/test';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

type W = {
  interact(id: string): boolean;
  walkTo(x: number, y: number): boolean;
  player(): { x: number; y: number; moving: boolean };
  session(): { modal: boolean; started: boolean; game: { state: { flags: Record<string, unknown>; items: Record<string, number>; caps: number; quests: Record<string, string> } } };
};

const state = (page: Page) =>
  page.evaluate(() => {
    const w = (window as unknown as { __world: W }).__world;
    const s = w.session();
    return { modal: s.modal, ...JSON.parse(JSON.stringify(s.game.state)) };
  });

/** Fresh game with a premade build (0 = Механик: 12 caps, no bargaining traits). */
async function startGame(page: Page, premade = 0) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __menu?: unknown }).__menu);
  await page.evaluate((i) => (window as unknown as { __menu: { quickStart(i: number): void } }).__menu.quickStart(i), premade);
  await page.waitForFunction(() => !!(window as unknown as { __world?: W }).__world && (window as unknown as { __world: W }).__world.session().started);
}

async function talkTo(page: Page, id: string) {
  const ok = await page.evaluate((i) => (window as unknown as { __world: W }).__world.interact(i), id);
  expect(ok, `interact ${id}`).toBe(true);
  await expect.poll(async () => (await state(page)).modal, { timeout: 120_000 }).toBe(true);
  await page.waitForTimeout(250);
}

// Long walks are covered by the real-mouse test; here we hop close first so the
// suite stays fast even when software WebGL renders only a few frames per second.
async function near(page: Page, x: number, y: number) {
  await page.evaluate(([a, b]) => (window as unknown as { __world: { teleport(x: number, y: number): void } }).__world.teleport(a, b), [x, y]);
}

async function say(page: Page, ...keys: number[]) {
  for (const k of keys) {
    await page.keyboard.press(String(k));
    await page.waitForTimeout(200);
  }
}

async function closed(page: Page) {
  await expect.poll(async () => (await state(page)).modal, { timeout: 60_000 }).toBe(false);
}

test('mission: key from Hank, manual repair, report to Marta', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/e2e-01-start.png' });

  // Marta: help -> agree -> ask for manual -> thanks
  await talkTo(page, 'marta');
  await page.screenshot({ path: 'test-results/e2e-02-marta.png' });
  await say(page, 2, 1, 1, 1);
  await closed(page);
  let s = await state(page);
  expect(s.flags.quest_accepted).toBe(true);
  expect(s.items.manual).toBe(1);

  // Hank: ask about key -> pay 5 caps -> bye
  await near(page, 14, 31);
  await talkTo(page, 'hank');
  await say(page, 1, 1, 1);
  await closed(page);
  s = await state(page);
  expect(s.items.key).toBe(1);
  expect(s.caps).toBe(7);

  // Door: sneak up the road past the sleeping nest (crosses the trigger zone), open with the key
  await page.evaluate(() => (window as unknown as { __world: { sneak(on: boolean): void } }).__world.sneak(true));
  await near(page, 31, 19);
  await talkTo(page, 'door');
  await page.screenshot({ path: 'test-results/e2e-03-door.png' });
  s = await state(page);
  expect(s.quests.water).toBe('open_door');
  await say(page, 1);
  await closed(page);
  expect((await state(page)).flags.door_open).toBe(true);

  // Crate inside: take valve
  await talkTo(page, 'crate_valve');
  await say(page, 1);
  await closed(page);
  await page.screenshot({ path: 'test-results/e2e-04-inside.png' });
  expect((await state(page)).items.valve).toBe(1);

  // Pump: install by manual
  await near(page, 14, 26);
  await talkTo(page, 'pump');
  await say(page, 1, 1);
  await closed(page);
  s = await state(page);
  expect(s.flags.pump_fixed).toBe(true);
  expect(s.quests.water).toBe('report');

  // Marta: reward
  await talkTo(page, 'marta');
  await say(page, 1, 1);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/e2e-05-complete.png' });
  s = await state(page);
  expect(s.flags.quest_complete).toBe(true);
  expect(s.quests.water).toBe('done');
  expect(s.caps).toBe(22);

  // Save survives reload: main menu -> continue
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __menu?: unknown }).__menu);
  await page.evaluate(() => (window as unknown as { __menu: { continueGame(): void } }).__menu.continueGame());
  await page.waitForFunction(() => !!(window as unknown as { __world?: W }).__world);
  await page.waitForTimeout(400);
  s = await state(page);
  expect(s.flags.quest_complete).toBe(true);
  expect(s.flags.door_open).toBe(true);
  expect(errors).toEqual([]);
});

test('lockpick path: two failures jam the lock, crowbar still works', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => (window as unknown as { __world: { sneak(on: boolean): void } }).__world.sneak(true));
  await near(page, 31, 15);
  // force failures: rig the RNG through the dev hook
  await page.evaluate(() => {
    const g = (window as unknown as { __world: { session(): { game: { rng: () => number } } } }).__world.session().game;
    g.rng = () => 0.99;
  });
  await talkTo(page, 'door');
  await say(page, 1, 1, 1, 1); // pick, retry, pick, give up
  await closed(page);
  expect((await state(page)).flags.lock_fails).toBe(2);
  await near(page, 32, 19);
  await talkTo(page, 'car_pickup');
  await say(page, 1, 2); // lift the tarp -> leave (option 1 is now the Ремонт salvage)
  await closed(page);
  await talkTo(page, 'door');
  await say(page, 1); // [Монтировка]
  await closed(page);
  const s = await state(page);
  expect(s.flags.door_open).toBe(true);
  expect(s.flags.door_method).toBe('монтировка');
});

test('real mouse: click ground to walk, click NPC to talk, HUD clicks do not walk', async ({ page }) => {
  const dbg = <T,>(fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => ((window as unknown as { __world: Record<string, (...x: unknown[]) => unknown> }).__world[f as string](...(a as unknown[])) as T), [fn, args] as const);
  await startGame(page);
  await dbg('teleport', 10, 26);
  await page.waitForTimeout(1200); // camera settles

  const target = await dbg<{ x: number; y: number }>('screenOfTile', 12, 27);
  await page.mouse.click(target.x, target.y);
  await expect.poll(() => dbg<{ x: number; y: number; moving: boolean }>('player'), { timeout: 10_000 }).toEqual({ x: 12, y: 27, moving: false });

  await page.mouse.click(640, 690); // HUD log area
  await page.waitForTimeout(400);
  expect(await dbg('player')).toEqual({ x: 12, y: 27, moving: false });

  await page.waitForTimeout(1000);
  const marta = await dbg<{ x: number; y: number }>('screenOfActor', 'marta');
  await page.mouse.move(marta.x, marta.y);
  await page.mouse.click(marta.x, marta.y);
  await expect.poll(async () => (await state(page)).modal, { timeout: 10_000 }).toBe(true);
  await page.screenshot({ path: 'test-results/e2e-06-mouse-talk.png' });
  await page.keyboard.press('5'); // "Мне пора."
  await closed(page);
});
