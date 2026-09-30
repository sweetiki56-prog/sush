// Turn-based combat and the ways around it, in a real browser.
import { test, expect } from '@playwright/test';
import { GL, W, clickActor, closed, give, say, startGame, state, talkTo, type CombatInfo } from './helpers';

test.use(GL);

test('Стрелок clears the nest in a fight, then finishes the mission', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2);
  await talkTo(page, 'marta');
  await say(page, 2, 1, 1, 1); // help -> agree -> manual -> thanks
  await closed(page);

  await W(page, 'teleport', 31, 21);
  await W(page, 'rig', [0.3]); // every roll 31: player hits (61%), stings are shrugged off
  await W(page, 'walkTo', 31, 15);
  await expect.poll(() => W<CombatInfo>(page, 'combat'), { timeout: 60_000 }).not.toBeNull();
  await page.screenshot({ path: 'test-results/e2e-09-nest-fight.png' });
  for (let i = 0; i < 200; i++) {
    const c = await W<CombatInfo>(page, 'combat');
    if (!c) break;
    if (c.current === 'player') {
      const me = c.units.find((u) => u.id === 'player')!;
      const foe = c.units.filter((u) => u.id.startsWith('scorp') && !u.dead).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
      if (foe) {
        await clickActor(page, foe.id);
        await page.waitForTimeout(400);
      }
      const again = await W<CombatInfo>(page, 'combat');
      if (again?.current === 'player') await page.keyboard.press(' ');
    }
    await page.waitForTimeout(300);
  }
  let s = await state(page);
  expect(s.flags.nest_cleared).toBe(true);
  expect(s.quests.nest).toBe('cleared');
  expect(s.stats.kills).toBe(3);
  expect(s.items.stinger).toBe(3);

  await W(page, 'teleport', 32, 21);
  await talkTo(page, 'car_pickup');
  await say(page, 1, 1);
  await closed(page);
  await talkTo(page, 'door');
  await say(page, 1); // [Монтировка]
  await closed(page);
  expect((await W<CombatInfo>(page, 'combat'))).toBeNull(); // nobody left to wake
  await talkTo(page, 'crate_valve');
  await say(page, 1);
  await closed(page);
  await W(page, 'teleport', 14, 26);
  await talkTo(page, 'pump');
  await say(page, 1, 1);
  await closed(page);
  await talkTo(page, 'marta');
  await say(page, 1, 1, 1); // nest bounty -> reward -> farewell
  await page.waitForTimeout(400);
  s = await state(page);
  expect(s.flags.quest_complete).toBe(true);
  expect(s.caps).toBe(42 + 10 + 15);
  await page.screenshot({ path: 'test-results/e2e-10-complete.png' });
  expect(errors).toEqual([]);
});

test('Говорун slips past the nest with bait and a haggled key, no fight at all', async ({ page }) => {
  await startGame(page, 1);
  await talkTo(page, 'marta');
  await say(page, 2, 1, 1, 1);
  await closed(page);
  await talkTo(page, 'hank');
  await say(page, 1, 1, 1); // key -> "три" (Торговля 71) -> bye
  await closed(page);
  await talkTo(page, 'hank');
  await say(page, 1, 1); // trade -> show the goods: the barter window
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await closed(page);
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(m: object): void } } }).__world.session().send({ t: 'trade', trader: 'hank', buy: { lizard: 1 }, sell: {} }));
  let s = await state(page);
  expect(s.items.key).toBe(1);
  expect(s.items.lizard).toBe(1);
  expect(s.caps).toBe(12 - 3 - 2);

  await W(page, 'teleport', 31, 23);
  await W(page, 'rig', [0.0]);
  await W(page, 'useItem', 'lizard');
  await expect.poll(async () => (await W<{ lured: boolean; id: string }[]>(page, 'hostiles')).filter((h) => h.lured).length).toBe(3);
  await talkTo(page, 'door');
  await say(page, 1); // [Ключ]
  await closed(page);
  await talkTo(page, 'crate_valve');
  await say(page, 1);
  await closed(page);
  await W(page, 'teleport', 14, 26);
  await talkTo(page, 'pump');
  await say(page, 1, 1);
  await closed(page);
  await talkTo(page, 'marta');
  await say(page, 1, 1);
  await page.waitForTimeout(400);
  s = await state(page);
  expect(s.flags.quest_complete).toBe(true);
  expect(s.quests.nest).toBe('avoided');
  expect(s.stats.kills).toBe(0);
  expect(s.log.some((l) => l.startsWith('Бой!'))).toBe(false);
});

test('death in combat: game over screen, then the pre-combat autosave', async ({ page }) => {
  await startGame(page, 1);
  await W(page, 'teleport', 31, 21);
  await W(page, 'rig', [0.0]); // every sting lands and crits
  await W(page, 'walkTo', 31, 15);
  await expect.poll(() => W<CombatInfo>(page, 'combat'), { timeout: 60_000 }).not.toBeNull();
  const start = (await W<CombatInfo>(page, 'combat'))!.units.find((u) => u.id === 'player')!;
  for (let i = 0; i < 60; i++) {
    const c = await W<CombatInfo>(page, 'combat');
    if (!c) break;
    if (c.current === 'player') await page.keyboard.press(' ');
    await page.waitForTimeout(250);
  }
  await expect.poll(async () => (await state(page)).log.at(-1)).toBe('Пустошь забирает вас.');
  await page.screenshot({ path: 'test-results/e2e-11-game-over.png' });
  await page.mouse.click(640, 348); // ЗАГРУЗИТЬ АВТОСЕЙВ
  await expect.poll(async () => (await state(page)).hp, { timeout: 30_000 }).toBe(27);
  await page.waitForFunction(() => {
    const w = (window as unknown as { __world?: { session(): { started: boolean; modal: boolean } } }).__world;
    return !!w && w.session().started && !w.session().modal;
  });
  expect(await W(page, 'player')).toMatchObject({ x: start.x, y: start.y });
});

test('the crowbar screech wakes the nest once the door dialogue closes', async ({ page }) => {
  await startGame(page, 0);
  await give(page, 'crowbar');
  await W(page, 'teleport', 32, 15);
  await W(page, 'sneak', true);
  await talkTo(page, 'door');
  await say(page, 1); // [Монтировка]
  await closed(page);
  await expect.poll(() => W<CombatInfo>(page, 'combat'), { timeout: 30_000 }).not.toBeNull();
  const c = (await W<CombatInfo>(page, 'combat'))!;
  expect(c.units.map((u) => u.id)).toEqual(expect.arrayContaining(['scorp_big', 'scorp_a', 'scorp_b']));
  expect((await state(page)).log).toContain('Скрежет будит скорпионов!');
});
