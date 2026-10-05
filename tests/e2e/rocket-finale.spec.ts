import { test, expect } from '@playwright/test';
import { GL, W, answer, startGame, state, talkTo } from './helpers';

test.use(GL);

type DebugSession = {
  local: { room: { host: { game: { char: { spent: Record<string, number> }; skill(s: string): number } } } };
  send(m: unknown): void;
};

test('Sanctuary archive lowers the skill requirement at the Zaslon service panel', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page, 0);
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(m: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: 'rocket_archive' } }));
  await expect.poll(() => W<string>(page, 'worldMap')).toBe('rocket_archive');
  await expect.poll(() => W<boolean>(page, 'loading')).toBe(false);
  await W(page, 'teleport', 18, 16);
  await talkTo(page, 'rocket_dam_record');
  await answer(page, 'Снять копию');
  expect((await state(page)).flags.rocket_bypass_known).toBe(true);
  await page.keyboard.press('1'); // close the copied-record line
  await page.evaluate(() => {
    const s = (window as unknown as { __world: { session(): DebugSession } }).__world.session();
    const g = s.local.room.host.game;
    while (g.skill('repair') < 55) g.char.spent.repair = (g.char.spent.repair ?? 0) + 1;
    s.send({ t: 'debug', op: { op: 'goto', map: 'dam_machines' } });
  });
  await expect.poll(() => W<string>(page, 'worldMap')).toBe('dam_machines');
  await expect.poll(() => W<boolean>(page, 'loading')).toBe(false);
  await W(page, 'teleport', 33, 23);
  await talkTo(page, 'sentry_panel');
  await answer(page, 'По записи Обители найти');
  expect((await state(page)).flags.sentries_off).toBe(true);
  expect((await state(page)).flags.evidence ?? 0).toBe(0);
  await page.screenshot({ path: 'test-results/e2e-rocket-finale.png' });
  expect(errors).toEqual([]);
});
