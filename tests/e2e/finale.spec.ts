// Chapter I finale in the browser: the Trust walks in after the reward; talk them off or fight, then leave west.
import { test, expect, type Page } from '@playwright/test';
import { GL, W, answer, closed, startGame, state, talkTo, type Talk } from './helpers';

test.use(GL);


/** The pump works and the tube is in the bag (the mission itself is covered by mission.spec). */
async function pumpFixed(page: Page): Promise<void> {
  await page.evaluate(() => {
    const g = (window as unknown as { __world: { session(): { game: { setFlag(k: string): void; setStage(q: string, s: string): void; give(i: string): void } } } }).__world.session().game;
    for (const k of ['quest_accepted', 'valve_taken', 'door_open', 'pump_fixed']) g.setFlag(k);
    g.setStage('water', 'report');
    g.give('tube');
    g.setStage('mandate', 'found');
  });
}

async function reward(page: Page): Promise<void> {
  await talkTo(page, 'marta');
  await answer(page, 'Было приятно помочь.');
  await answer(page, 'Прощай, Марта');
  await closed(page);
  await expect.poll(() => W(page, 'actor', 'shluz'), { timeout: 30_000 }).toEqual({ x: 11, y: 24, moving: false });
}

test('talk the inspector off with a lie, take Hank along, leave west: the chapter ends', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 1); // Говорун
  await pumpFixed(page);

  // Hank sees the tube and tells the story
  await talkTo(page, 'hank');
  await answer(page, 'Выкладывай');
  await answer(page, 'Зачем Тресту');
  await answer(page, 'Что мне с ним делать');
  await answer(page, 'Пойдём со мной');
  await answer(page, 'Спрошу');
  await closed(page);

  await reward(page);
  expect(await W(page, 'actor', 'hank')).toBeNull(); // hiding
  let s = await state(page);
  expect(s.quests.inspector).toBe('came');
  await page.screenshot({ path: 'test-results/e2e-finale-01-trust.png' });

  await W(page, 'rig', [0.0]); // the lie holds
  await talkTo(page, 'shluz');
  expect((await W<Talk>(page, 'dialogue'))!.speaker).toBe('Инспектор Шлюз');
  await answer(page, 'Сгорел он');
  expect((await W<Talk>(page, 'dialogue'))!.text).toMatch(/Пепел/);
  await page.screenshot({ path: 'test-results/e2e-finale-02-lie.png' });
  await answer(page, 'Дальше');
  await answer(page, 'Ставьте свою пломбу');
  await answer(page, '…');
  await closed(page);
  await expect.poll(() => W(page, 'actor', 'shluz'), { timeout: 30_000 }).toBeNull();
  expect(await W(page, 'actor', 'hank')).not.toBeNull();

  await talkTo(page, 'marta');
  await answer(page, 'Спасибо, Марта');
  await closed(page);
  await talkTo(page, 'hank');
  await answer(page, 'Пойдём со мной');
  await answer(page, 'По рукам');
  await closed(page);
  s = await state(page);
  expect(s.items.letter).toBe(1);
  expect(s.flags).toMatchObject({ trust_outcome: 'lie', well_sealed: true, hank_joins: true });

  await W(page, 'teleport', 3, 25);
  await W(page, 'walkTo', 0, 25);
  await expect.poll(async () => (await state(page)).flags.chapter1_done, { timeout: 20_000 }).toBe(true);
  await expect.poll(async () => (await state(page)).modal).toBe(true);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/e2e-finale-03-chapter-end.png' });
  expect((await state(page)).flags.chapter1_seen).toBe(true);
  expect(errors).toEqual([]);
});

test('threaten the inspector: the Trust turns hostile where it stands and the fight starts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 2); // Стрелок
  await pumpFixed(page);
  await reward(page);
  await talkTo(page, 'shluz');
  await answer(page, 'Уходите');
  await answer(page, 'Да');
  await answer(page, '…');
  await expect.poll(async () => (await W<{ units: { id: string }[] } | null>(page, 'combat'))?.units.map((u) => u.id).sort(), { timeout: 20_000 }).toEqual(
    expect.arrayContaining(['collector_a', 'collector_b', 'shluz']),
  );
  expect((await W<{ id: string }[]>(page, 'hostiles')).map((h) => h.id)).toEqual(expect.arrayContaining(['shluz', 'collector_a', 'collector_b']));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/e2e-finale-04-fight.png' });
  expect(errors).toEqual([]);
});
