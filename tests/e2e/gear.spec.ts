// Stage G in the browser: a night at the campfire brings the caravan; buy in the barter window,
// make the Жнецобой at the workbench, dig scrap and hand in a contract at the board.
import { test, expect } from '@playwright/test';
import { GL, W, answer, closed, give, startGame, state, talkTo } from './helpers';

test.use(GL);

test('a day of work: rest, trade, craft, a contract', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 0); // Механик: Ремонт for the spear
  await talkTo(page, 'campfire');
  await answer(page, 'Отдохнуть');
  await closed(page);
  let s = await state(page);
  expect(s.flags.day).toBe(2);
  expect(s.flags.caravan_here).toBe(true);
  await expect.poll(() => W(page, 'actor', 'birjuk'), { timeout: 30_000 }).toMatchObject({ x: 7, y: 27, moving: false });

  // barter: one crossbow bolt (the fourth of Бирюк's goods: guns first, and those are too dear yet)
  await talkTo(page, 'birjuk');
  await answer(page, 'Покажи товар');
  await page.waitForTimeout(700);
  const caps = s.caps;
  await page.mouse.click(300, 123 + 3 * 30);
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'test-results/e2e-gear-01-barter.png' });
  await page.mouse.click(924, 533); // СДЕЛКА
  await page.waitForTimeout(400);
  s = await state(page);
  expect(s.caps).toBeLessThan(caps);
  expect(s.log.some((l) => l.includes('Сделка с Бирюком'))).toBe(true);
  await page.keyboard.press('Escape');
  await closed(page);

  // workbench: the scorpion-killer spear
  await give(page, 'spear');
  await give(page, 'reaper_sting');
  await talkTo(page, 'workbench');
  await answer(page, 'Поработать');
  await page.waitForTimeout(600);
  await page.mouse.click(190 + 436 + 100, 22 + 540 - 64 + 12 + 20); // СДЕЛАТЬ (the spear is the only thing ready)
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/e2e-gear-02-workbench.png' });
  expect((await state(page)).items.reaper_spear).toBe(1);
  await page.keyboard.press('Escape');
  await closed(page);

  // a contract: take «Металлолом», dig three heaps, hand it in
  await talkTo(page, 'board');
  await answer(page, 'Взять: «Металлолом»');
  await answer(page, 'Ясно');
  await answer(page, 'Отойти');
  await closed(page);
  for (const id of ['scrap_3_33', 'scrap_6_35', 'scrap_14_36']) {
    await talkTo(page, id);
    await answer(page, 'Порыться');
    await closed(page);
  }
  s = await state(page);
  expect(s.items.scrap).toBeGreaterThanOrEqual(5);
  const before = s.caps;
  await talkTo(page, 'board');
  await answer(page, 'Сдать: «Металлолом»');
  await page.screenshot({ path: 'test-results/e2e-gear-03-contract.png' });
  s = await state(page);
  expect(s.caps).toBe(before + 12);
  expect(errors).toEqual([]);
});
