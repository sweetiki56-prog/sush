// Chapter VIII in the browser: the gate of ribs opened to one going on the trial, the second half of the key given
// for Верес's diary, the note under red wax on arrival in the ruins, Марта bought back in the cellars, the Printer
// named by a slip of the tongue and the chapter-end screen.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, give, startGame, state, talkTo, type Talk } from './helpers';

test.use(GL);

type Ses = { session(): { send(x: unknown): void; game: { char: { attrs: { end: number } }; state: { caps: number } } } };

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

test('Chapter VIII: the circle, the key, the note, the cellar, the Printer named', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2); // Стрелок
  for (let n = 1; n <= 7; n++) for (const k of [`chapter${n}_seen`, `chapter${n}_done`]) await W(page, 'flag', k, true);
  await W(page, 'flag', 'trust_outcome', 'tax');
  await give(page, 'tube');
  await give(page, 'veres_diary');
  await page.evaluate(() => {
    const g = (window as unknown as { __world: Ses }).__world.session().game;
    g.char.attrs.end = 6;
    g.state.caps = 2000;
  });
  await W(page, 'rig', [0.0]);

  // the gate of ribs, to one going on the dry week
  await goto(page, 'bone_camp', 'south');
  await page.screenshot({ path: 'test-results/e2e-bones-01-gate.png' });
  await talkTo(page, 'bone_guard');
  await answer(page, 'Я иду на сухую неделю');
  await leave(page);
  expect((await state(page)).flags.circle_way).toBe('trial');

  // Мать Трещина gives the key for Верес's word
  await talkTo(page, 'tresh');
  await answer(page, 'Вторая половина ключа');
  await answer(page, 'Вот дневник Вереса');
  await page.screenshot({ path: 'test-results/e2e-bones-02-key.png' });
  await leave(page);
  expect((await state(page)).flags.key_whole).toBe(true);

  // the ruins: the note under red wax; down to the cellars
  await goto(page, 'ruins_streets', 'south');
  await expect.poll(async () => (await state(page)).flags.hostage, { timeout: 20_000 }).toBe('marta');
  await page.screenshot({ path: 'test-results/e2e-bones-03-ruins.png' });
  await goto(page, 'ruins_cellar', 'ladder');
  await talkTo(page, 'pisar_k');
  await page.screenshot({ path: 'test-results/e2e-bones-04-cellar.png' });
  await answer(page, 'Пятьсот капель');
  await answer(page, '…');
  await expect.poll(async () => (await state(page)).flags.chapter8_done, { timeout: 20_000 }).toBe(true);
  expect((await state(page)).flags.printer_way).toBe('scribe');
  await expect.poll(async () => (await state(page)).modal, { timeout: 20_000 }).toBe(true);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/e2e-bones-05-chapter-end.png' });
  await page.mouse.click(485, 594); // ОСТАТЬСЯ В СУШИ
  await closed(page);
  expect(errors).toEqual([]);
});
