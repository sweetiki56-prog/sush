// S15a in the browser: the last courier, Literny's twelfth mark and the hidden Sealwax chamber.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, startGame, state, talkTo, type Talk } from './helpers';

test.use(GL);
type Ses = { session(): { send(x: unknown): void } };

async function goto(page: Page, map: string, entry?: string): Promise<void> {
  await page.evaluate(([m, e]) => (window as unknown as { __world: Ses }).__world.session().send({ t: 'debug', op: { op: 'goto', map: m, entry: e } }), [map, entry] as const);
  await page.waitForTimeout(1500);
  await page.waitForFunction((m) => {
    const w = (window as unknown as { __world?: { player(): unknown; session(): { game: { state: { flags: Record<string, unknown> } } } } }).__world;
    return !!w?.player() && w.session().game.state.flags.at === m;
  }, map, { timeout: 60_000 });
  await page.waitForTimeout(500);
}

async function leave(page: Page): Promise<void> {
  for (let i = 0; i < 8 && (await state(page)).modal; i++) {
    const d = await W<Talk>(page, 'dialogue');
    if (!d) break;
    await page.keyboard.press(String(d.options.length));
    await page.waitForTimeout(250);
  }
  await closed(page);
}

test('S15a: courier letter, Literny and the Chamber of Seals', async ({ page }) => {
  test.setTimeout(300_000);
  await startGame(page, 0);
  await W(page, 'flag', 'chapter1_seen', true);
  await W(page, 'flag', 'chapter1_done', true);
  await W(page, 'flag', 'navigator', 'sailed');

  await goto(page, 'post_station', 'south');
  await page.screenshot({ path: 'test-results/e2e-secrets-01-courier.png' });
  await talkTo(page, 'courier_mummy');
  await answer(page, 'Рассмотреть завал');
  await answer(page, 'Забрать письмо');
  await leave(page);
  expect((await state(page)).flags.courier_letter).toBe('kept');

  await W(page, 'flag', 'literny_known', true);
  await W(page, 'flag', 'literny_pass', 'key');
  await goto(page, 'literny_train', 'west');
  await page.screenshot({ path: 'test-results/e2e-secrets-02-literny.png' });
  await talkTo(page, 'seal_mark_12');
  await answer(page, 'Сложить план');
  await leave(page);
  await talkTo(page, 'drop_stamp_safe');
  await answer(page, 'Забрать штампы');
  await leave(page);
  expect((await state(page)).flags.seal_mark_12).toBe(true);

  for (let n = 1; n <= 12; n++) await W(page, 'flag', `seal_mark_${n}`, true);
  await goto(page, 'ruins_streets', 'chamber');
  await talkTo(page, 'chamber_door');
  await answer(page, 'Сложить двенадцать');
  await answer(page, 'Спуститься');
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => {
    const w = (window as unknown as { __world?: { player(): unknown; session(): { game: { state: { flags: Record<string, unknown> } } } } }).__world;
    return !!w?.player() && w.session().game.state.flags.at === 'seal_chamber';
  }, null, { timeout: 60_000 });
  await page.screenshot({ path: 'test-results/e2e-secrets-03-chamber.png' });
});
