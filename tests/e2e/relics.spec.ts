// Stage R in the browser: «Ружьё на стене» from the wall to the reunion — the shack, the photo, Марта, Бирюк.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, startGame, state, talkTo } from './helpers';

test.use(GL);

const send = (page: Page, op: unknown) =>
  page.evaluate((o) => (window as unknown as { __world: { session(): { send(m: unknown): void } } }).__world.session().send({ t: 'debug', op: o }), op);

/** Walk into the map again (the caravan's day brings Бирюк) and wait until the hero stands in it. */
async function reenter(page: Page, map: string): Promise<void> {
  await send(page, { op: 'goto', map });
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => (window as unknown as { __world?: { player(): unknown } }).__world?.player(), null, { timeout: 30_000 });
  await page.waitForTimeout(800);
}

test('«Ружьё на стене»: the photo behind the strap, Бирюк is Семён, the reunion, «Скоба» in the bag', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2); // Стрелок: Восприятие 7
  for (const [k, v] of [['chapter1_seen', true], ['trust_outcome', 'tax'], ['quest_complete', true], ['marta_letter', true], ['chapter1_done', true]] as const) await W(page, 'flag', k, v);
  await W(page, 'rig', [0.0, 0.0, 0.0]); // the talk checks land

  await talkTo(page, 'shack_marta');
  await answer(page, 'За ремнём');
  await page.screenshot({ path: 'test-results/e2e-relics-01-photo.png' });
  await answer(page, 'Выйти');
  await closed(page);
  expect((await state(page)).items.old_photo).toBe(1);

  await talkTo(page, 'marta');
  await answer(page, 'Ружьё у тебя на стене');
  await answer(page, 'Ничего');
  await closed(page);

  await W(page, 'flag', 'caravan_here', true);
  await reenter(page, 'rusty_well');
  await expect.poll(() => W(page, 'actor', 'birjuk'), { timeout: 30_000 }).not.toBeNull();
  await talkTo(page, 'birjuk');
  await answer(page, 'старую фотографию');
  await page.screenshot({ path: 'test-results/e2e-relics-02-birjuk.png' });
  await answer(page, '…');
  await answer(page, 'Двадцать лет — хватит');
  await answer(page, 'Скажу');
  await answer(page, 'Прощай');
  await closed(page);

  await talkTo(page, 'marta');
  await answer(page, 'Про ружьё');
  await answer(page, 'Семён жив');
  await answer(page, 'Он придёт, если ты выйдешь');
  await page.screenshot({ path: 'test-results/e2e-relics-03-reunion.png' });
  await answer(page, 'Спасибо, Марта');
  await closed(page);

  const s = await state(page);
  expect(s.flags.semyon).toBe('reunited');
  expect(s.items.skoba).toBe(1);
  expect(s.quests.wall_rifle).toBe('done');
  expect(errors).toEqual([]);
});
