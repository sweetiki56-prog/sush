// Chapter V in the browser: Хэнк walks with the hero and takes an order by a real click, then Кристалл: the gate on
// the guide's word, Кварц at the Wall of names, the tube stolen by the Горькие and taken back from their stash, the
// promise to the Солевики and the chapter-end screen.
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

test('Chapter V: Хэнк follows and takes orders; Кристалл, the Горькие, the promise, the chapter ends', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2); // Стрелок
  for (const [k, v] of [['chapter1_seen', true], ['chapter1_done', true], ['trust_outcome', 'tax'], ['hank_joins', true], ['chapter2_seen', true], ['chapter2_done', true], ['chapter3_seen', true], ['chapter3_done', true], ['chapter4_seen', true], ['chapter4_done', true], ['krupitsa_fate', 'debt'], ['crystal_guide', 'sol']] as const) await W(page, 'flag', k, v);
  await give(page, 'tube');

  // Хэнк joins by himself (he left with the hero in Chapter I) and walks beside the hero
  await goto(page, 'three_pillars');
  expect((await state(page)).flags.with_hank).toBe(true);
  await expect.poll(() => W(page, 'actor', 'comp_hank'), { timeout: 20_000 }).not.toBeNull();
  const me = await W<{ x: number; y: number }>(page, 'player');
  await W(page, 'walkTo', me.x + 6, me.y);
  await expect
    .poll(async () => {
      const [h, p] = await Promise.all([W<{ x: number; y: number }>(page, 'actor', 'comp_hank'), W<{ x: number; y: number }>(page, 'player')]);
      return Math.hypot(h.x - p.x, h.y - p.y) <= 3;
    }, { timeout: 30_000 })
    .toBe(true);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/e2e-crystal-01-hank.png' });
  // a real click on him opens the talk, not an attack
  const at = await W<{ x: number; y: number }>(page, 'screenOfActor', 'comp_hank');
  await page.mouse.click(at.x, at.y);
  await expect.poll(async () => (await state(page)).modal, { timeout: 30_000 }).toBe(true);
  await page.waitForTimeout(300);
  expect((await W<Talk>(page, 'dialogue'))!.speaker).toBe('Хэнк');
  await answer(page, 'Держись позади');
  await answer(page, '…');
  await closed(page);
  expect((await state(page)).flags.stance_hank).toBe('back');

  // Кристалл: the gate on the guide's word
  await W(page, 'rig', [0.0]);
  await goto(page, 'crystal_gate', 'south');
  await page.screenshot({ path: 'test-results/e2e-crystal-02-gate.png' });
  await talkTo(page, 'warden');
  await answer(page, 'Со мной Сол');
  await answer(page, 'Войти');
  await closed(page);
  expect((await state(page)).flags.crystal_way).toBe('guide');

  // Кварц at the Wall of names; the Горькие steal the tube
  await goto(page, 'crystal_council', 'south');
  await talkTo(page, 'kvarts');
  await answer(page, 'Что это за стена');
  await page.screenshot({ path: 'test-results/e2e-crystal-03-wall.png' });
  await answer(page, 'Мандат открывает');
  await answer(page, '…');
  await answer(page, '…');
  await closed(page);
  expect((await state(page)).flags.tube_stolen).toBe(true);

  // back from their stash unseen
  await goto(page, 'crystal_deep', 'east');
  await talkTo(page, 'bitter_stash');
  await answer(page, 'Забрать украденное');
  await answer(page, '…');
  await answer(page, '…');
  await closed(page);
  expect((await state(page)).items.tube).toBe(1);

  // the promise: the chapter ends
  await goto(page, 'crystal_council', 'south');
  await talkTo(page, 'kvarts');
  await answer(page, 'Даю слово');
  await answer(page, '…');
  await expect.poll(async () => (await state(page)).flags.chapter5_done, { timeout: 20_000 }).toBe(true);
  await expect.poll(async () => (await state(page)).modal, { timeout: 20_000 }).toBe(true);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/e2e-crystal-04-chapter-end.png' });
  expect(errors).toEqual([]);
});
