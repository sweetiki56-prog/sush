// The rest of Низовье in the browser: Тимофей asks for the lead flower, the flowers bought at Свинцовый, Тимофей
// joins and walks along; the stolen water truck at the Elevator; the radio on the Ark and its prophet exposed.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, startGame, state, talkTo, type Talk } from './helpers';

test.use(GL);

type Ses = { session(): { send(x: unknown): void; game: { state: { caps: number } } } };

async function goto(page: Page, map: string, entry?: string): Promise<void> {
  await page.evaluate(([m, e]) => (window as unknown as { __world: Ses }).__world.session().send({ t: 'debug', op: { op: 'goto', map: m, entry: e } }), [map, entry] as const);
  await expect.poll(async () => (await state(page)).flags.at, { timeout: 60_000 }).toBe(map);
  await expect.poll(() => W(page, 'worldMap'), { timeout: 60_000 }).toBe(map);
  await page.waitForFunction(() => (window as unknown as { __world?: { player(): unknown } }).__world?.player(), null, { timeout: 30_000 });
  await expect.poll(() => W(page, 'loading'), { timeout: 30_000 }).toBe(false);
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

test('Низовье: the lead flower and Тимофей, the water truck, the Ark', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2); // Стрелок
  for (const k of ['chapter1_seen', 'chapter1_done']) await W(page, 'flag', k, true);
  await W(page, 'flag', 'trust_outcome', 'tax');
  await page.evaluate(() => {
    (window as unknown as { __world: Ses }).__world.session().game.state.caps = 1000;
  });

  // the shelter: Тимофей asks for the flower
  await goto(page, 'silence_house', 'south');
  await page.screenshot({ path: 'test-results/e2e-lowland-01-silence.png' });
  await talkTo(page, 'timofey');
  await answer(page, 'Какие цветы');
  await leave(page);

  // the Dead fields: the flowers bought from Гвоздарь
  await goto(page, 'dead_fields', 'south');
  await page.screenshot({ path: 'test-results/e2e-lowland-02-fields.png' });
  await talkTo(page, 'gvozdar');
  await answer(page, 'Мне нужны свинцовые цветы');
  await answer(page, 'Сто пятьдесят капель');
  await leave(page);
  expect((await state(page)).flags.lead_flower).toBe('bought');

  // Тимофей joins and walks along
  await goto(page, 'silence_house', 'south');
  await talkTo(page, 'timofey');
  await answer(page, 'Пойдём');
  await leave(page);
  expect((await state(page)).flags.with_timofey).toBe(true);
  await expect.poll(() => W(page, 'actor', 'comp_timofey'), { timeout: 20_000 }).not.toBeNull();

  // the Elevator: the truck to the Circle
  await goto(page, 'elevator_yard', 'south');
  await W(page, 'teleport', 29, 20); // the chapter test checks the talk, not the long path across the yard
  await expect.poll(async () => (await W<{ x: number; y: number }>(page, 'player')).x).toBe(29);
  await page.screenshot({ path: 'test-results/e2e-lowland-03-elevator.png' });
  await talkTo(page, 'stolen_truck');
  await answer(page, 'Отвести воду Кругу');
  await leave(page);
  expect((await state(page)).flags.stolen_truck).toBe('circle');

  // the Ark: the radio, the prophet left in peace
  await goto(page, 'ark_ship', 'south');
  await talkTo(page, 'ark_radio');
  await leave(page);
  await talkTo(page, 'oblako');
  await answer(page, 'Приёмник в каюте');
  await page.screenshot({ path: 'test-results/e2e-lowland-04-ark.png' });
  await answer(page, 'Оставлю как есть');
  await leave(page);
  expect((await state(page)).flags.ark).toBe('left');
  expect(errors).toEqual([]);
});
