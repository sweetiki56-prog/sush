// Chapter IV in the browser: into the Guild yard for the fee (Крупица's roof melts), a paid share and the caravan,
// a bout in the «Пыльная чаша» with weapons where nobody dies, the Guild caravan into the salt storm, the Trust's
// hunters bought off, the reckoning with Крупица, the mad captain as a guide, Кристалл and the chapter-end screen.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, give, startGame, state, talkTo, type CombatInfo, type Talk } from './helpers';

test.use(GL);

type Ses = {
  session(): { send(x: unknown): void; game: { apply(e: unknown[]): void; state: { caps: number } } };
};

async function goto(page: Page, map: string, entry?: string): Promise<void> {
  await page.evaluate(
    ([m, e]) =>
      (window as unknown as { __world: Ses }).__world
        .session()
        .send({ t: 'debug', op: { op: 'goto', map: m, entry: e } }),
    [map, entry] as const,
  );
  await expect.poll(async () => (await state(page)).flags.at, { timeout: 60_000 }).toBe(map);
  await page.waitForFunction(
    () => (window as unknown as { __world?: { player(): unknown } }).__world?.player(),
    null,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(800);
}

async function onRoad(page: Page): Promise<void> {
  await page.evaluate(() =>
    (window as unknown as { __world: Ses }).__world.session().game.apply([{ type: 'travel' }]),
  );
  await expect.poll(async () => (await state(page)).flags.at, { timeout: 60_000 }).toBe('world');
  await page.waitForFunction(() => !!(window as unknown as { __travel?: unknown }).__travel, null, {
    timeout: 30_000,
  });
  await page.waitForTimeout(600);
}

type Trv = {
  go(x: number, y: number): void;
  to(id: string): void;
  party(tpl: string, dx: number, dy: number, members?: string[]): void;
};
const trv = (page: Page) => ({
  go: (x: number, y: number) =>
    page.evaluate(([a, b]) => (window as unknown as { __travel: Trv }).__travel.go(a, b), [x, y] as const),
  to: (id: string) => page.evaluate((i) => (window as unknown as { __travel: Trv }).__travel.to(i), id),
  party: (tpl: string, dx: number, dy: number, members: string[]) =>
    page.evaluate(
      ([t, x, y, m]) =>
        (window as unknown as { __travel: Trv }).__travel.party(
          t as string,
          x as number,
          y as number,
          m as string[],
        ),
      [tpl, dx, dy, members] as const,
    ),
});

test('Chapter IV: the Guild, a bout in the «Пыльная чаша», the storm and the hunters, the captain leads to Кристалл', async ({
  page,
}) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2); // Стрелок
  for (const [k, v] of [
    ['chapter1_seen', true],
    ['chapter1_done', true],
    ['trust_outcome', 'tax'],
    ['chapter2_seen', true],
    ['chapter2_done', true],
    ['chapter3_seen', true],
    ['chapter3_done', true],
    ['forgery_fate', 'kept'],
  ] as const)
    await W(page, 'flag', k, v);
  await give(page, 'tube');
  await give(page, 'ammo', 40);
  await page.evaluate(
    () => ((window as unknown as { __world: Ses }).__world.session().game.state.caps = 900),
  );
  await W(page, 'rig', [0.01]);
  await goto(page, 'salt_market', 'west');
  await page.screenshot({ path: 'test-results/e2e-salt-01-market.png' });
  expect((await state(page)).quests.salt).toBe('guild');

  // the Guild yard for the fee; Крупица's office roof melts as the hero walks in
  await goto(page, 'salt_guild', 'south');
  await talkTo(page, 'gatekeeper');
  await answer(page, 'Вот взнос');
  await answer(page, 'Пройти');
  await closed(page);
  expect(await W(page, 'roof', 'office')).toBe(1);
  await talkTo(page, 'krupitsa');
  await expect.poll(() => W(page, 'roof', 'office'), { timeout: 20_000 }).toBe(0);
  await page.screenshot({ path: 'test-results/e2e-salt-02-krupitsa.png' });
  await answer(page, 'путь через Соляное море');
  await answer(page, 'Куплю пай');
  await answer(page, 'У вешек');
  await answer(page, 'Отойти');
  await closed(page);
  expect((await state(page)).flags.sea_caravan).toBe('ready');

  // a bout in the pit: own weapons, nobody dies; every roll 31: the rifle lands, the knuckles barely scratch
  await W(page, 'rig', [0.3]);
  await goto(page, 'salt_arena', 'west');
  await talkTo(page, 'barysh');
  await answer(page, 'против Сизого');
  await answer(page, 'В яму');
  await closed(page);
  await expect.poll(() => W<CombatInfo>(page, 'combat'), { timeout: 60_000 }).not.toBeNull();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/e2e-salt-03-bout.png' });
  const me = (c: CombatInfo) => c?.units.find((u) => u.id === 'player');
  for (let i = 0; i < 300 && !(await state(page)).flags.ring_result; i++) {
    const c = await W<CombatInfo>(page, 'combat').catch(() => null);
    if (c?.current === 'player' && !c.outcome) {
      const ap = me(c)!.ap;
      const foe = c.units.find((u) => u.id === 'pit_1' && !u.dead);
      if (foe && ap >= 5) {
        await page.evaluate(
          (id) => (window as unknown as { __world: Ses }).__world.session().send({ t: 'attack', target: id }),
          foe.id,
        );
        // let the shot play out; the room takes no new move while the last batch is still animating: then just retry
        for (let t = 0; t < 12; t++) {
          await page.waitForTimeout(250);
          const n = await W<CombatInfo>(page, 'combat').catch(() => null);
          if (!n || n.current !== 'player' || me(n)!.ap !== ap) break;
        }
      } else await page.keyboard.press(' ');
    }
    await page.waitForTimeout(300);
  }
  expect((await state(page)).flags.ring_result).toBe('won');
  await page.waitForTimeout(800);
  await talkTo(page, 'barysh');
  await answer(page, '…');
  await answer(page, 'Забрать приз');
  await closed(page);
  expect((await state(page)).flags.arena_1).toBe(true);

  // the Guild caravan at the gate: hired on as its guard, a storm over the sea road
  await W(page, 'rig', [0.5]);
  await onRoad(page);
  await trv(page).go(76, 25);
  await expect.poll(async () => (await state(page)).modal, { timeout: 60_000 }).toBe(true);
  expect((await W<Talk>(page, 'dialogue'))!.speaker).toBe('Караван Гильдии');
  await answer(page, 'За караваном от самых ворот');
  await answer(page, 'Идём');
  await closed(page);
  expect((await state(page)).flags.sea_caravan).toBe('go');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/e2e-salt-04-storm.png' });
  // the Trust's hunters step out of the storm: seen coming, they talk, and take money
  await trv(page).party('trust_hunters', 0.3, 0, ['trust_hunter', 'trust_hunter', 'trust_hunter']);
  await expect.poll(async () => (await state(page)).modal, { timeout: 60_000 }).toBe(true);
  expect((await W<Talk>(page, 'dialogue'))!.speaker).toBe('Охотники Треста');
  await answer(page, 'Сколько вам заплатил Трест');
  await answer(page, '…');
  await closed(page);
  const s1 = await state(page);
  expect(s1.flags.ambush_done).toBe('bought');
  expect(s1.items.hunt_order).toBe(1);

  // the reckoning: with the order in hand she owes the hero
  await goto(page, 'salt_guild', 'south');
  await talkTo(page, 'krupitsa');
  await answer(page, 'Вот приказ Треста');
  await answer(page, 'Будешь должна');
  await answer(page, '…');
  await closed(page);
  expect((await state(page)).flags.krupitsa_fate).toBe('debt');

  // the mad captain of «Отрада» sails home in his head and knows the way to Кристалл
  await W(page, 'rig', [0.0]);
  await goto(page, 'sea_wrecks', 'west');
  await talkTo(page, 'baken');
  await answer(page, 'Есть, капитан');
  await page.screenshot({ path: 'test-results/e2e-salt-05-captain.png' });
  await answer(page, '…');
  await closed(page);
  expect((await state(page)).flags.crystal_guide).toBe('captain');

  // to Кристалл: the chapter ends
  await W(page, 'rig', [0.5]);
  await W(page, 'quietRoad', true);
  await onRoad(page);
  await trv(page).to('crystal');
  await expect.poll(async () => (await state(page)).flags.chapter4_done, { timeout: 180_000 }).toBe(true);
  await expect.poll(async () => (await state(page)).modal, { timeout: 30_000 }).toBe(true);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/e2e-salt-06-chapter-end.png' });
  expect(errors).toEqual([]);
});
