// A phone held sideways: the whole start of the game by touch alone — the menu, a name typed on the phone's own
// keyboard, the prologue, walking, a talk, the journal scrolled by a finger, a fight where one tap aims and a second
// acts. Held upright, the game asks to be turned.
import { test, expect, devices, type Page } from '@playwright/test';
import { W, state } from './helpers';

const phone = devices['iPhone 13 landscape'];
test.use({ ...phone, defaultBrowserType: 'chromium', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

/** Tap a point given in game pixels (1280×720), wherever the canvas sits on the phone. */
async function tap(page: Page, x: number, y: number): Promise<void> {
  const box = (await page.locator('canvas').boundingBox())!;
  const k = box.width / 1280;
  await page.touchscreen.tap(box.x + x * k, box.y + y * k);
  await page.waitForTimeout(350);
}

test('by touch alone: menu, name, prologue, a walk, a talk, the journal, a fight', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // upright: the game asks to be turned
  await page.setViewportSize({ width: phone.viewport.height, height: phone.viewport.width });
  await page.goto('/');
  await expect(page.locator('#turn')).toBeVisible();
  await page.screenshot({ path: 'test-results/e2e-mobile-01-upright.png' });
  await page.setViewportSize(phone.viewport);
  await expect(page.locator('#turn')).toBeHidden();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __menu?: unknown }).__menu);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/e2e-mobile-02-menu.png' });

  // the menu by a tap; the dossier: the name typed through a real field (the phone's keyboard)
  await tap(page, 640, 292); // НОВАЯ ИГРА
  await page.waitForFunction(() => !!(window as unknown as { __create?: unknown }).__create);
  const field = page.locator('input[type=text]');
  await expect(field).toHaveCount(1);
  await tap(page, 318, 364); // the Стрелок template
  await field.tap();
  await field.fill('');
  await page.keyboard.type('Ива');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __create: { draft: { name: string } } }).__create.draft.name)).toBe('Ива');
  await page.screenshot({ path: 'test-results/e2e-mobile-03-dossier.png' });
  await tap(page, 1166, 682); // ГОТОВО
  await expect(field).toHaveCount(0); // the field goes with the dossier
  // the prologue: tap through
  await tap(page, 640, 360);
  await tap(page, 640, 360);
  await page.waitForFunction(() => {
    const w = (window as unknown as { __world?: { session(): { started: boolean } } }).__world;
    return !!w && w.session().started;
  }, null, { timeout: 60_000 });
  await W(page, 'pace', 0.05);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/e2e-mobile-04-world.png' });
  expect((await state(page)).flags).toBeDefined();

  // a walk by a tap on the ground
  const before = await W<{ x: number; y: number }>(page, 'player');
  const spot = await W<{ x: number; y: number }>(page, 'screenOfTile', before.x + 2, before.y);
  await tap(page, spot.x, spot.y);
  await expect.poll(async () => { const p = await W<{ x: number; y: number }>(page, 'player'); return p.x !== before.x || p.y !== before.y; }, { timeout: 20_000 }).toBe(true);

  // a talk by a tap on Марта, an answer by a tap
  await W(page, 'teleport', 16, 26);
  // the camera glides after the hero: tap where Марта is once it has stopped
  let marta = { x: 0, y: 0 };
  for (let i = 0, prev = { x: -1, y: -1 }; i < 30; i++, prev = marta) {
    await page.waitForTimeout(200);
    marta = await W<{ x: number; y: number }>(page, 'screenOfActor', 'marta');
    if (Math.abs(marta.x - prev.x) < 1 && Math.abs(marta.y - prev.y) < 1) break;
  }
  await tap(page, marta.x, marta.y);
  await expect.poll(async () => (await state(page)).modal, { timeout: 30_000 }).toBe(true);
  await page.waitForTimeout(600);
  await tap(page, 640, 320); // skip the typing
  await page.screenshot({ path: 'test-results/e2e-mobile-05-talk.png' });
  await tap(page, 300, 330); // the first answer
  await page.waitForTimeout(800);

  // out of the talk: tap the last answer (the way out) until it closes, reading where the answers stand
  for (let i = 0; i < 10 && (await state(page)).modal; i++) {
    const d = await W<{ options: string[] } | null>(page, 'dialogue');
    if (!d) break;
    await tap(page, 640, 330 + (d.options.length - 1) * 37); // rows are full width and spaced for a finger
    await page.waitForTimeout(500);
  }
  // the journal: opened by its button, scrolled by a finger
  await W(page, 'flag', 'chapter1_seen', true);
  await page.evaluate(() => {
    const g = (window as unknown as { __world: { session(): { game: { setStage(q: string, s: string): void; content: { quests: Record<string, { stages: { id: string }[] }> } } } } }).__world.session().game;
    for (const [id, q] of Object.entries(g.content.quests)) g.setStage(id, q.stages[Math.min(1, q.stages.length - 1)].id);
  });
  await expect.poll(async () => (await state(page)).modal, { timeout: 20_000 }).toBe(false);
  await tap(page, 1032, 662); // ЖУРНАЛ
  await expect.poll(async () => (await state(page)).modal, { timeout: 10_000 }).toBe(true);
  await page.screenshot({ path: 'test-results/e2e-mobile-06-journal.png' });
  const history = (await state(page) as Awaited<ReturnType<typeof state>> & { dialogueHistory: { speaker: string; lines: { text: string }[] }[] }).dialogueHistory;
  expect(history.find((entry) => entry.speaker === 'Старейшина Марта')?.lines.length).toBeGreaterThan(1);
  await tap(page, 632, 121); // ДИАЛОГИ
  await tap(page, 450, 188); // раскрыть Марту
  await page.screenshot({ path: 'test-results/e2e-mobile-06-dialogues.png' });
  expect((await state(page)).modal).toBe(true);
  await tap(page, 400, 121); // ЗАДАНИЯ
  const box = (await page.locator('canvas').boundingBox())!;
  const k = box.width / 1280;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: box.x + x * k, y: box.y + y * k }] });
  await touch('touchStart', 640, 480);
  for (let y = 480; y >= 180; y -= 20) await touch('touchMove', 640, y);
  await touch('touchEnd', 640, 180);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/e2e-mobile-07-journal-scrolled.png' });
  expect((await state(page)).modal).toBe(true); // scrolling inside the journal does not close it
  await tap(page, 1100, 76); // ЗАКРЫТЬ
  await expect.poll(async () => (await state(page)).modal, { timeout: 10_000 }).toBe(false);

  // Inventory actions are touch targets too: drink from a flask even at full health.
  await page.evaluate(() => {
    const g = (window as unknown as { __world: { session(): { game: { give(id: string): void; body: { thirsty?: boolean } } } } }).__world.session().game;
    g.give('flask');
    g.body.thirsty = true;
  });
  await tap(page, 1032, 630); // ИНВЕНТАРЬ
  await expect.poll(async () => (await state(page)).modal, { timeout: 10_000 }).toBe(true);
  await tap(page, 780, 98); // ХИМИЯ
  await tap(page, 558, 160); // Полная фляга (после бинтов)
  await page.screenshot({ path: 'test-results/e2e-mobile-08-use-item.png' });
  await tap(page, 700, 150); // ВЫПИТЬ
  await expect.poll(async () => (await state(page)).modal, { timeout: 10_000 }).toBe(false);
  expect(((await state(page)) as Awaited<ReturnType<typeof state>> & { body: { thirsty?: boolean } }).body.thirsty).toBe(false);

  // a fight: one tap on the foe aims (nothing spent), a second tap shoots
  const foe = (await W<{ id: string; dead: boolean; x: number; y: number }[]>(page, 'hostiles')).find((h) => !h.dead)!;
  await W(page, 'teleport', foe.x - 5, foe.y); // in sight and on screen
  await page.waitForTimeout(1500);
  await W(page, 'rig', [0.01]);
  await W(page, 'startCombat', [foe.id]);
  type C = { current: string; units: { id: string; ap: number; x: number; y: number }[] } | null;
  await expect.poll(async () => (await W<C>(page, 'combat'))?.current, { timeout: 60_000 }).toBe('player');
  await page.waitForTimeout(1500);
  const c0 = (await W<C>(page, 'combat'))!;
  const ap0 = c0.units.find((u) => u.id === 'player')!.ap;
  const at = await W<{ x: number; y: number }>(page, 'screenOfActor', foe.id);
  await tap(page, at.x, at.y);
  await page.waitForTimeout(600);
  expect((await W<C>(page, 'combat'))!.units.find((u) => u.id === 'player')!.ap).toBe(ap0); // aimed, not fired
  await page.screenshot({ path: 'test-results/e2e-mobile-08-aim.png' });
  await tap(page, at.x, at.y);
  await expect.poll(async () => { const c = await W<C>(page, 'combat'); return !c || c.units.find((u) => u.id === 'player')!.ap < ap0 || c.current !== 'player'; }, { timeout: 20_000 }).toBe(true);

  expect(errors).toEqual([]);
});
