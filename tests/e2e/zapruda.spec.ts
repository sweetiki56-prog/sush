// Chapter III in the browser: through the gate of Запруда on Зоя's pass, the Notary's office (its roof melts),
// the Upper city and the archive, Шлюз talked round, the copy kept through Лейка, the chapter-end screen.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, give, startGame, state, talkTo } from './helpers';

test.use(GL);

async function goto(page: Page, map: string, entry?: string): Promise<void> {
  await page.evaluate(([m, e]) => (window as unknown as { __world: { session(): { send(x: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: m, entry: e } }), [map, entry] as const);
  await expect.poll(async () => (await state(page)).flags.at, { timeout: 60_000 }).toBe(map);
  await page.waitForFunction(() => (window as unknown as { __world?: { player(): unknown } }).__world?.player(), null, { timeout: 30_000 });
  await page.waitForTimeout(800);
}

test('Chapter III: the gate on a pass, the Notary, the archive, Шлюз in doubt, the copy kept — the chapter ends', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 1); // Говорун: the talk checks
  for (const [k, v] of [['chapter1_seen', true], ['chapter1_done', true], ['trust_outcome', 'tax'], ['chapter2_seen', true], ['chapter2_done', true], ['notary_known', true]] as const) await W(page, 'flag', k, v);
  await give(page, 'tube');
  await give(page, 'guild_pass');
  await page.evaluate(() => {
    const g = (window as unknown as { __world: { session(): { game: { state: { caps: number } } } } }).__world.session().game;
    g.state.caps = 800;
  });
  await W(page, 'rig', [0, 0, 0, 0, 0, 0]);
  await goto(page, 'zap_lower', 'road_s');
  await page.screenshot({ path: 'test-results/e2e-zap-01-gate.png' });

  await talkTo(page, 'gate_col_a');
  await answer(page, 'пропуск Соляной');
  await answer(page, 'Пройти');
  await closed(page);
  expect((await state(page)).flags.gate_way).toBe('pass');

  // the Notary's office on the market: the roof melts as the hero walks in
  await goto(page, 'zap_market', 'south');
  expect(await W(page, 'roof', 'notary')).toBe(1);
  await talkTo(page, 'shtempel');
  await expect.poll(() => W(page, 'roof', 'notary'), { timeout: 20_000 }).toBe(0);
  await answer(page, 'Прочтите');
  await answer(page, '…');
  await page.screenshot({ path: 'test-results/e2e-zap-02-notary.png' });
  await answer(page, 'Триста');
  await answer(page, '…');
  await closed(page);
  expect((await state(page)).flags.mandate_certified).toBe(true);

  // up to the Tower and into the archive
  await talkTo(page, 'upper_guard');
  await answer(page, 'Пятьдесят');
  await answer(page, 'Отойти');
  await closed(page);
  await goto(page, 'zap_upper', 'south');
  await talkTo(page, 'kulik');
  await answer(page, 'Восемьдесят');
  await answer(page, 'Отойти');
  await closed(page);
  await talkTo(page, 'archive_case');
  await answer(page, 'Открыть папку');
  await page.screenshot({ path: 'test-results/e2e-zap-03-archive.png' });
  await answer(page, 'Уйти');
  await closed(page);
  expect((await state(page)).items.forgery_proof).toBe(1);

  // Шлюз on the market reads the copy and lets the hero go
  await goto(page, 'zap_market', 'north');
  await talkTo(page, 'shluz_z');
  await answer(page, 'Прочтите сами');
  await answer(page, '…');
  await closed(page);
  expect((await state(page)).flags.bounty_done).toBe('doubt');

  // Лейка keeps the copy for a court: the chapter ends
  await goto(page, 'zap_lower', 'north');
  await talkTo(page, 'lejka');
  await answer(page, 'Сохраню для суда');
  await answer(page, '…');
  await expect.poll(async () => (await state(page)).flags.chapter3_done, { timeout: 20_000 }).toBe(true);
  await expect.poll(async () => (await state(page)).modal, { timeout: 20_000 }).toBe(true); // the chapter screen
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/e2e-zap-04-chapter-end.png' });
  expect(errors).toEqual([]);
});
