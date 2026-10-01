// Chapter IX in the browser: the boom lifted by Лукич's pass, Шлюз opening the crest, the sentries stood down, three
// pieces of evidence and the trial, the Mandate to the Circle at the console; then the slides of the ending, turned
// by the wide «ДАЛЕЕ» to the last card and its way out.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, give, startGame, state, talkTo, type Talk } from './helpers';

test.use(GL);

type Ses = { session(): { send(x: unknown): void; game: { char: { spent: Record<string, number> }; state: { caps: number } } } };
type Ending = { index: number; total: number; id: string } | undefined;

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

const ending = (page: Page) => page.evaluate(() => (window as unknown as { __ending?: Ending }).__ending);

test('Chapter IX: the pass, the crest, the hall, the trial, the console and the slides of the ending', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2); // Стрелок
  for (let n = 1; n <= 8; n++) for (const k of [`chapter${n}_seen`, `chapter${n}_done`]) await W(page, 'flag', k, true);
  for (const [k, v] of [['trust_outcome', 'tax'], ['key_whole', true], ['shluz_doubts', true], ['threat_told', 'circle']] as const) await W(page, 'flag', k, v);
  for (const it of ['tube', 'gates_pass', 'stempel_letter', 'veres_diary', 'land_books']) await give(page, it);
  await page.evaluate(() => {
    const g = (window as unknown as { __world: Ses }).__world.session().game;
    g.char.spent.repair = 100;
  });

  // the boom of «Ворота»
  await goto(page, 'gates_post', 'south');
  await talkTo(page, 'boom_b');
  await answer(page, 'Пропуск Лукича');
  await leave(page);
  expect((await state(page)).flags.boom_up).toBe(true);

  // the siege and the crest: Шлюз opens the gate
  await goto(page, 'dam_approach', 'gates');
  await page.screenshot({ path: 'test-results/e2e-dam-01-siege.png' });
  await goto(page, 'dam_crest', 'south');
  await talkTo(page, 'shluz_dam');
  await answer(page, 'Ты усомнился в приказе');
  await answer(page, '…');
  await closed(page);
  expect((await state(page)).flags.dam_way).toBe('parley');

  // the machine hall: the sentries stood down
  await goto(page, 'dam_machines', 'south');
  await W(page, 'teleport', 33, 24);
  await talkTo(page, 'sentry_panel');
  await answer(page, 'Разомкнуть цепь');
  await leave(page);
  expect((await state(page)).flags.machines_way).toBe('off');

  // the trial: three pieces of evidence
  await goto(page, 'dam_control', 'ladder');
  await page.screenshot({ path: 'test-results/e2e-dam-02-control.png' });
  await talkTo(page, 'zatvor_dam');
  for (const ev of ['Письмо Первого Печатника', 'Дневник Вереса', 'Земельные книги']) {
    await answer(page, ev);
    await answer(page, '…');
  }
  await answer(page, 'Суд окончен');
  await answer(page, '…');
  await closed(page);
  expect((await state(page)).flags.trial_way).toBe('judged');

  // the console: the Mandate to the Circle
  await talkTo(page, 'dam_console');
  await answer(page, 'Кругу колодцев');
  await answer(page, '…');
  await expect.poll(async () => (await state(page)).flags.chapter9_done, { timeout: 20_000 }).toBe(true);

  // the slides: turned by the wide «ДАЛЕЕ» under the card
  await expect.poll(() => ending(page), { timeout: 20_000 }).toBeTruthy();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/e2e-dam-03-slide-first.png' });
  const first = (await ending(page))!;
  expect(first.id).toBe('choice');
  for (let i = 0; i < first.total - 1; i++) {
    await page.mouse.click(640, 554); // ДАЛЕЕ
    await page.waitForTimeout(150);
  }
  await expect.poll(async () => (await ending(page))!.index).toBe(first.total - 1);
  expect((await ending(page))!.id).toBe('name');
  await page.screenshot({ path: 'test-results/e2e-dam-04-slide-last.png' });
  await page.mouse.click(400, 554); // ОСТАТЬСЯ В СУШИ
  await closed(page);
  expect(errors).toEqual([]);
});
