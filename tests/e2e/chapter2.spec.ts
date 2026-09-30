// Chapter II in the browser: Три столба (rumors, the Писарь), Колючка (the letter, traps, the raid), the gates of Запруда.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, give, startGame, state, talkTo } from './helpers';

test.use(GL);

type TravelHook = { to(id: string): void };
const travelTo = (page: Page, id: string) => page.evaluate((i) => (window as unknown as { __travel: TravelHook }).__travel.to(i), id);
const setFlag = (page: Page, k: string, v: unknown = true) =>
  page.evaluate(([key, val]) => (window as unknown as { __world: { session(): { game: { setFlag(k: string, v: unknown): void } } } }).__world.session().game.setFlag(key as string, val), [k, v] as const);

async function onRoad(page: Page): Promise<void> {
  await page.waitForFunction(() => !!(window as unknown as { __travel?: unknown }).__travel, null, { timeout: 30_000 });
  await expect.poll(async () => (await state(page)).flags.at, { timeout: 30_000 }).toBe('world');
}

async function enter(page: Page, id: string): Promise<void> {
  await travelTo(page, id);
  await expect.poll(async () => (await state(page)).flags.at, { timeout: 120_000 }).toBe(id);
  await page.waitForFunction(() => (window as unknown as { __world?: { player(): unknown } }).__world?.player(), null, { timeout: 30_000 });
  await page.waitForTimeout(800);
}

test('Chapter II: rumors, the Писарь unmasked, Прокоп, traps against the raid, the chapter ends at Запруда', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 1); // Говорун
  for (const [k, v] of [['chapter1_seen', true], ['chapter1_done', true], ['trust_outcome', 'tax']] as const) await setFlag(page, k, v);
  await give(page, 'letter');
  await give(page, 'tube');
  await give(page, 'flask', 3);
  await W(page, 'quietRoad', true); // this is about the towns, not about meetings on the way
  await W(page, 'teleport', 3, 25);
  await W(page, 'walkTo', 0, 25);
  await onRoad(page);

  // Три столба
  await enter(page, 'three_pillars');
  await page.screenshot({ path: 'test-results/e2e-ch2-01-pillars.png' });
  expect((await state(page)).quests.tract).toBe('rumors');
  await talkTo(page, 'zoya');
  await answer(page, '…');
  await answer(page, 'Что говорят');
  await answer(page, 'Держи пять капель');
  await page.screenshot({ path: 'test-results/e2e-ch2-02-zoya.png' });
  await answer(page, 'Спасибо');
  await answer(page, 'Прощай');
  await closed(page);
  await W(page, 'rig', [0.0]); // the Говорун's questions land
  await talkTo(page, 'pisar');
  await answer(page, 'Кто тебя послал');
  await page.screenshot({ path: 'test-results/e2e-ch2-03-scribe.png' });
  await answer(page, '…');
  await closed(page);
  let s = await state(page);
  expect(s.flags.scribe_outcome).toBe('exposed');
  expect(s.flags.notary_known).toBe(true);

  // Колючка
  await W(page, 'walkTo', 21, 1);
  await W(page, 'walkTo', 21, 0);
  await onRoad(page);
  await enter(page, 'kolyuchka');
  await page.screenshot({ path: 'test-results/e2e-ch2-04-kolyuchka.png' });
  await talkTo(page, 'prokop');
  await answer(page, 'Письмо от Марты');
  await answer(page, '…');
  await answer(page, 'колючие ловушки');
  await answer(page, '…');
  await answer(page, 'Прощай');
  await closed(page);
  await give(page, 'thorn_traps');
  await talkTo(page, 'trail');
  await answer(page, 'Разложить');
  await answer(page, '…');
  await closed(page);
  // the night before the raid at the farm's fire
  s = await state(page);
  await setFlag(page, 'day', Number(s.flags.raid_day) - 1);
  await talkTo(page, 'campfire');
  await answer(page, 'Отдохнуть');
  await closed(page);
  await expect.poll(async () => (await state(page)).flags.raid_now, { timeout: 30_000 }).toBe(true);
  await expect.poll(() => W(page, 'actor', 'kremen'), { timeout: 60_000 }).toMatchObject({ moving: false });
  await talkTo(page, 'kremen');
  await page.screenshot({ path: 'test-results/e2e-ch2-05-kremen.png' });
  await answer(page, 'Тропа за твоей спиной');
  await answer(page, '…');
  await closed(page);
  expect((await state(page)).flags.raid_outcome).toBe('trapped');
  await talkTo(page, 'prokop');
  await answer(page, '…');
  await answer(page, '…');
  await answer(page, 'Спасибо, Прокоп');
  await closed(page);
  expect((await state(page)).quests.tract).toBe('notary');

  // the gates of Запруда
  await W(page, 'walkTo', 17, 1);
  await W(page, 'walkTo', 17, 0);
  await onRoad(page);
  await travelTo(page, 'zapruda');
  await expect.poll(async () => (await state(page)).flags.chapter2_done, { timeout: 120_000 }).toBe(true);
  await expect.poll(async () => (await state(page)).modal, { timeout: 30_000 }).toBe(true);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/e2e-ch2-06-end.png' });
  await expect.poll(async () => (await state(page)).flags.chapter2_seen).toBe(true);
  expect(errors).toEqual([]);
});
