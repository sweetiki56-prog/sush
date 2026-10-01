// Chapter VI in the browser: Ирга's word at the camp of «Роса-2», the gate of the Скит opened by it, Кассиан lets
// the hero into the archive, Штемпель's letter on the shelf, the secret of the dew kept, брат Стужа called off by
// the abbot, the choice of the dew and the chapter-end screen; then Ирга joins and walks with the hero.
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

test('Chapter VI: Ирга\'s word, the archive, the letter, Стужа called off, the dew chosen; Ирга joins', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2); // Стрелок
  for (const [k, v] of [['chapter1_seen', true], ['chapter1_done', true], ['trust_outcome', 'tax'], ['chapter2_seen', true], ['chapter2_done', true], ['chapter3_seen', true], ['chapter3_done', true], ['chapter4_seen', true], ['chapter4_done', true], ['chapter5_seen', true], ['chapter5_done', true], ['kassian_kin', true]] as const) await W(page, 'flag', k, v);
  await give(page, 'tube');

  // «Роса-2»: Ирга by her fire gives the word
  await goto(page, 'rosa_surface', 'west');
  await page.screenshot({ path: 'test-results/e2e-skit-01-rosa.png' });
  await talkTo(page, 'irga');
  await answer(page, 'Почему ушла');
  await answer(page, 'ворует паруса');
  await leave(page);
  expect((await state(page)).flags.irga_password).toBe(true);

  // the gate of the Скит opens to the word
  await goto(page, 'skit_yard', 'south');
  await page.screenshot({ path: 'test-results/e2e-skit-02-yard.png' });
  await talkTo(page, 'gate_knight');
  await answer(page, 'Роса собирается ночью');
  await leave(page);
  expect((await state(page)).flags.skit_way).toBe('password');

  // Кассиан opens the archive to a kinsman of Верес
  await goto(page, 'skit_cells', 'south');
  await talkTo(page, 'kassian');
  await answer(page, 'Архив');
  await answer(page, 'Верес Кассианов');
  await page.screenshot({ path: 'test-results/e2e-skit-03-kassian.png' });
  await leave(page);
  expect((await state(page)).flags.archive_ok).toBe(true);

  // Свиток unlocks the grate; Штемпель's letter
  await goto(page, 'skit_archive', 'west');
  await talkTo(page, 'svitok');
  await answer(page, 'Настоятель велел');
  await leave(page);
  await talkTo(page, 'letter_shelf');
  await answer(page, 'Открыть папку');
  await page.screenshot({ path: 'test-results/e2e-skit-04-letter.png' });
  await leave(page);
  expect((await state(page)).items.stempel_letter).toBe(1);

  // the dew kept; Стужа asks for the Mandate; the abbot calls him off; the dew stays with the Order
  await goto(page, 'skit_cells', 'south');
  await talkTo(page, 'kassian');
  await answer(page, 'Росоуловители');
  await answer(page, 'Оставьте тайну себе');
  await leave(page);
  await talkTo(page, 'stuzha');
  await answer(page, 'Спроси настоятеля');
  await leave(page);
  await talkTo(page, 'kassian');
  await answer(page, 'Отмените приказ');
  await leave(page);
  expect((await state(page)).flags.stuzha_way).toBe('revoked');
  await talkTo(page, 'kassian');
  await answer(page, 'Роса останется Ордену');
  await answer(page, '…');
  await expect.poll(async () => (await state(page)).flags.chapter6_done, { timeout: 20_000 }).toBe(true);
  await expect.poll(async () => (await state(page)).modal, { timeout: 20_000 }).toBe(true);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/e2e-skit-05-chapter-end.png' });
  await page.mouse.click(485, 594); // ОСТАТЬСЯ В СУШИ
  await closed(page);

  // Ирга joins on a good word (Обаяние) and walks beside the hero
  await W(page, 'flag', 'met_irga', true);
  await goto(page, 'rosa_surface', 'west');
  await talkTo(page, 'irga');
  await answer(page, 'Пойдём со мной');
  await leave(page);
  expect((await state(page)).flags.with_irga).toBe(true);
  await expect.poll(() => W(page, 'actor', 'comp_irga'), { timeout: 20_000 }).not.toBeNull();
  await page.screenshot({ path: 'test-results/e2e-skit-06-irga.png' });
  expect(errors).toEqual([]);
});
