// Chapter VII in the browser: the chart grown north to the Верховья, the Депо and its archive opened for spare-part
// money, the plate read, Лёля joins, the relay «Шептун» started by her and the voice that names the hero, the
// record sent to the Circle and the chapter-end screen.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, give, startGame, state, talkTo, type Talk } from './helpers';

test.use(GL);

type Ses = { session(): { send(x: unknown): void } };

async function goto(page: Page, map: string, entry?: string): Promise<void> {
  await page.evaluate(([m, e]) => (window as unknown as { __world: Ses }).__world.session().send({ t: 'debug', op: { op: 'goto', map: m, entry: e } }), [map, entry] as const);
  await expect.poll(async () => (await state(page)).flags.at, { timeout: 60_000 }).toBe(map);
  await page.waitForFunction(() => (window as unknown as { __world?: { player(): unknown } }).__world?.player(), null, { timeout: 30_000 });
  await page.waitForTimeout(800);
}

/** Take the last answer (the way out) until the talk closes. */
async function leave(page: Page): Promise<void> {
  for (let i = 0; i < 6 && (await state(page)).modal; i++) {
    const d = await W<Talk>(page, 'dialogue');
    if (!d) break;
    await page.keyboard.press(String(d.options.length));
    await page.waitForTimeout(300);
  }
  await closed(page);
}

test('Chapter VII: the Депо, the plate, Лёля, the relay and the voice; the record goes to the Circle', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2); // Стрелок
  for (const k of ['chapter1_seen', 'chapter1_done', 'chapter2_seen', 'chapter2_done', 'chapter3_seen', 'chapter3_done', 'chapter4_seen', 'chapter4_done', 'chapter5_seen', 'chapter5_done', 'chapter6_seen', 'chapter6_done']) await W(page, 'flag', k, true);
  await W(page, 'flag', 'trust_outcome', 'tax');
  await give(page, 'tube');
  await page.evaluate(() => {
    const g = (window as unknown as { __world: { session(): { game: { state: { caps: number } } } } }).__world.session().game;
    g.state.caps = 2000;
  });

  // the Депо: the archive for spare-part money
  await goto(page, 'depot_yard', 'south');
  await page.screenshot({ path: 'test-results/e2e-upper-01-depot.png' });
  await talkTo(page, 'sverlo');
  await answer(page, 'Мне нужен архив');
  await answer(page, '…');
  await answer(page, 'Вот 500 капель');
  await leave(page);
  expect((await state(page)).flags.depot_way).toBe('paid');

  // the plate read in the archive
  await goto(page, 'depot_archive', 'west');
  await talkTo(page, 'plate_table');
  await page.screenshot({ path: 'test-results/e2e-upper-02-plate.png' });
  await leave(page);
  expect((await state(page)).flags.plate_read).toBe(true);

  // Лёля joins in the workshops and walks with the hero
  await goto(page, 'depot_shops', 'south');
  await talkTo(page, 'lelya');
  await answer(page, 'Пойдёшь со мной');
  await leave(page);
  expect((await state(page)).flags.with_lelya).toBe(true);
  await expect.poll(() => W(page, 'actor', 'comp_lelya'), { timeout: 20_000 }).not.toBeNull();

  // the relay: Лёля starts it; the voice says the hero's name; the record goes to the Circle
  await goto(page, 'whisper_tower', 'south');
  await page.screenshot({ path: 'test-results/e2e-upper-03-tower.png' });
  await talkTo(page, 'relay_console');
  await answer(page, 'Лёля, справишься');
  await answer(page, '…');
  const voice = (await W<Talk>(page, 'dialogue'))!;
  expect(voice.text).toContain('Не отдавай её');
  await page.screenshot({ path: 'test-results/e2e-upper-04-voice.png' });
  await answer(page, '…');
  await answer(page, 'частоте Круга');
  await answer(page, '…');
  await expect.poll(async () => (await state(page)).flags.chapter7_done, { timeout: 20_000 }).toBe(true);
  await expect.poll(async () => (await state(page)).modal, { timeout: 20_000 }).toBe(true);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/e2e-upper-05-chapter-end.png' });
  await page.mouse.click(485, 594); // ОСТАТЬСЯ В СУШИ
  await closed(page);

  // out on the chart: the Верховья above the old land
  await goto(page, 'whisper_slope', 'south');
  await W(page, 'teleport', 19, 34);
  await W(page, 'walkTo', 19, 35);
  await expect.poll(async () => (await state(page)).flags.at, { timeout: 30_000 }).toBe('world');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/e2e-upper-06-chart.png' });
  expect(errors).toEqual([]);
});
