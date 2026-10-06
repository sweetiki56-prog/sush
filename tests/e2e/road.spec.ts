// The road in the browser: out of the Rusty Well onto the world map, a gang stops the party, a toll is paid;
// the next gang is fought on a battlefield, then the party is back on the map.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, give, startGame, state, type CombatInfo, type Talk } from './helpers';

test.use(GL);

type TravelHook = { state(): { x: number; y: number; path: unknown[] }; go(x: number, y: number): void; party(tpl: string, dx: number, dy: number, members?: string[]): void };
const T = <R>(page: Page, fn: (t: TravelHook) => R) => page.evaluate(`(${fn.toString()})(window.__travel)`) as Promise<R>;

async function meetGang(page: Page, members: string[]): Promise<void> {
  const at = await T(page, (t) => t.state());
  await T(page, new Function('t', `t.party('gang', 1, 0, ${JSON.stringify(members)})`) as (t: TravelHook) => void);
  await T(page, new Function('t', `t.go(${Math.floor(at.x) + 1}, ${Math.floor(at.y)})`) as (t: TravelHook) => void);
  // solo: the room ticks with the page's frames, so a loaded machine walks slower
  await expect.poll(() => W<Talk>(page, 'dialogue'), { timeout: 60_000 }).not.toBeNull();
  await page.waitForTimeout(300);
}

test('leave town, pay off one gang, fight the next on a battlefield, go on', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2); // Стрелок
  await page.evaluate(() => {
    const g = (window as unknown as { __world: { session(): { game: { setFlag(k: string, v?: unknown): void } } } }).__world.session().game;
    g.setFlag('trust_outcome', 'tax');
    g.setFlag('chapter1_seen'); // the chapter screen is covered by finale.spec
    g.setFlag('chapter1_done');
  });
  await give(page, 'flask', 2);
  await W(page, 'teleport', 3, 25);
  await W(page, 'walkTo', 0, 25);
  await page.waitForFunction(() => !!(window as unknown as { __travel?: unknown }).__travel, null, { timeout: 30_000 });
  await expect.poll(async () => (await state(page)).flags.at).toBe('world');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/e2e-road-01-map.png' });

  // the first gang wants a toll
  const caps = (await state(page)).caps;
  await meetGang(page, ['raider', 'raider']);
  const d = (await W<Talk>(page, 'dialogue'))!;
  expect(d.text).toMatch(/Капли или жизнь/);
  const hasRaiderAvatar = await page.evaluate(() => {
    const scene = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('UI');
    const containsPortrait = (value: unknown): boolean => {
      if (!value || typeof value !== 'object') return false;
      const object = value as { frame?: { name?: string }; list?: unknown[] };
      return object.frame?.name === 'portrait_raider' || !!object.list?.some(containsPortrait);
    };
    return scene.children.list.some(containsPortrait);
  });
  expect(hasRaiderAvatar).toBe(true);
  await page.screenshot({ path: 'test-results/e2e-road-02-meeting.png' });
  await answer(page, 'Держите');
  await answer(page, '…');
  await closed(page);
  expect((await state(page)).caps).toBeLessThan(caps);
  expect((await state(page)).flags.at).toBe('world');

  // the second is fought
  await meetGang(page, ['raider']);
  await answer(page, 'Напасть');
  await answer(page, '…');
  await expect.poll(async () => String((await state(page)).flags.at), { timeout: 30_000 }).toMatch(/^enc_/);
  await expect.poll(() => W<CombatInfo>(page, 'combat'), { timeout: 60_000 }).not.toBeNull();
  await W(page, 'pace', 0.05);
  await W(page, 'rig', [0.01]); // every roll 2: the rifle lands a critical, the raider drops before it can run
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/e2e-road-03-battle.png' });
  // fight until the spoils window opens (the scene may be mid-restart: keep polling through it)
  for (let i = 0; i < 300 && !(await state(page)).modal; i++) {
    const c = await W<CombatInfo>(page, 'combat').catch(() => null);
    if (c?.current === 'player' && !c.outcome) {
      const ap = c.units.find((u) => u.id === 'player')!.ap;
      const foe = c.units.find((u) => u.id.startsWith('enc_') && !u.dead);
      // the far side of the field is off screen: shoot by intent, not by click
      if (foe && ap >= 5) await page.evaluate((id) => (window as unknown as { __world: { session(): { send(i: object): void } } }).__world.session().send({ t: 'attack', target: id }), foe.id);
      await page.waitForTimeout(600);
      // no shot went off (out of range, or out of AP): end the turn and let them come
      const again = await W<CombatInfo>(page, 'combat').catch(() => null);
      if (again?.current === 'player' && !again.outcome && again.units.find((u) => u.id === 'player')!.ap === ap) await page.keyboard.press(' ');
    }
    await page.waitForTimeout(300);
  }
  // the spoils: take everything with the mouse, then set off
  await expect.poll(async () => (await state(page)).modal, { timeout: 30_000 }).toBe(true);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/e2e-road-04-loot.png' });
  const before = Object.values((await state(page)).items).reduce((a, b) => a + b, 0);
  await page.mouse.click(660, 488); // ВЗЯТЬ ВСЁ
  await expect.poll(async () => Object.values((await state(page)).items).reduce((a, b) => a + b, 0)).toBeGreaterThan(before);
  // В ПУТЬ: the pile window redraws as the room answers the take, so press again until the party is on the road
  await expect
    .poll(async () => {
      if ((await state(page)).flags.at !== 'world') await page.mouse.click(840, 488);
      return (await state(page)).flags.at;
    }, { timeout: 30_000, intervals: [1000] })
    .toBe('world');
  await page.waitForFunction(() => !!(window as unknown as { __travel?: unknown }).__travel);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/e2e-road-05-back.png' });
  const s = await state(page);
  expect(s.stats.kills).toBeGreaterThanOrEqual(1);
  expect(s.log.some((l) => l.includes('возвращаетесь на дорогу'))).toBe(true);
  expect(errors).toEqual([]);
});

test('hire on with a caravan, ride with it, fight a gang beside its guards', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2); // Стрелок
  await page.evaluate(() => {
    const g = (window as unknown as { __world: { session(): { game: { setFlag(k: string, v?: unknown): void } } } }).__world.session().game;
    g.setFlag('trust_outcome', 'tax');
    g.setFlag('chapter1_seen');
    g.setFlag('chapter1_done');
  });
  await give(page, 'flask', 2);
  await W(page, 'teleport', 3, 25);
  await W(page, 'walkTo', 0, 25);
  await page.waitForFunction(() => !!(window as unknown as { __travel?: unknown }).__travel, null, { timeout: 30_000 });
  await page.waitForTimeout(300);

  // a Guild caravan on the tract: hire on to its next stop
  const at = await T(page, (t) => t.state());
  await T(page, new Function('t', `t.party('caravan', 2, 0, undefined, 'tract')`) as (t: TravelHook) => void);
  await T(page, new Function('t', `t.go(${Math.floor(at.x) + 2}, ${Math.floor(at.y)})`) as (t: TravelHook) => void);
  await expect.poll(() => W<Talk>(page, 'dialogue'), { timeout: 30_000 }).not.toBeNull();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/e2e-road-06-caravan.png' });
  await answer(page, 'Нужна охрана');
  await answer(page, 'По рукам');
  await closed(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/e2e-road-07-escort.png' });
  const moved = await T(page, (t) => t.state());
  expect(Math.hypot(moved.x - at.x, moved.y - at.y)).toBeGreaterThan(0.3); // riding with the caravan

  // a gang steps out: the caravan's guards fight beside us
  await T(page, new Function('t', `t.party('gang', 0, 0, ['raider'])`) as (t: TravelHook) => void);
  await expect.poll(() => W<Talk>(page, 'dialogue'), { timeout: 30_000 }).not.toBeNull();
  await page.waitForTimeout(300);
  await answer(page, 'Напасть');
  await answer(page, '…');
  await expect.poll(() => W<CombatInfo>(page, 'combat'), { timeout: 60_000 }).not.toBeNull();
  await W(page, 'pace', 0.05);
  await page.waitForTimeout(800);
  const c = (await W<CombatInfo>(page, 'combat'))!;
  expect(c.units.filter((u) => u.id.startsWith('ally_')).length).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: 'test-results/e2e-road-08-allies.png' });
  expect(errors).toEqual([]);
});
