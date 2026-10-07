import { expect, test, type Page } from '@playwright/test';
import { GL, W, clickActor, startGame, type CombatInfo } from './helpers';

test.use(GL);

/** Is a red vehicle outline drawn right now? */
const outlined = (page: Page) => page.evaluate(() => {
  const world = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('World');
  return world.children.list.some((child) => {
    const image = child as { texture?: { key?: string }; visible?: boolean };
    return image.visible && image.texture?.key?.startsWith('hostile_outline_');
  });
});

test('a scorpion covered by the burnt van gets a thin red combat outline', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startGame(page);
  await W(page, 'teleport', 24, 30);
  await W(page, 'startCombat', ['scorp_road']);
  await expect.poll(() => W(page, 'combat')).not.toBeNull();
  await page.evaluate(() => {
    const world = (window as unknown as { __phaser: { scene: { getScene(id: string): { cast: { actor(id: string): { teleport(x: number, y: number): void } } } } } }).__phaser.scene.getScene('World');
    world.cast.actor('scorp_road').teleport(24, 28);
  });
  const outline = () => outlined(page);
  await expect.poll(outline).toBe(true);
  await page.screenshot({ path: 'test-results/e2e-scorpion-vehicle-outline.png' });
  // Stepping out in front of the van, the scorpion is drawn over it: the outline goes away.
  await page.evaluate(() => {
    const world = (window as unknown as { __phaser: { scene: { getScene(id: string): { cast: { actor(id: string): { teleport(x: number, y: number): void } } } } } }).__phaser.scene.getScene('World');
    world.cast.actor('scorp_road').teleport(25, 29);
  });
  await expect.poll(outline).toBe(false);
  expect(errors).toEqual([]);
});

test('a click on the outline picks the hidden scorpion, not the van in front of it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startGame(page);
  await W(page, 'teleport', 21, 27); // beside the van: the line of fire is clear, the picture is not
  await W(page, 'rig', [0.01]);
  await W(page, 'startCombat', ['scorp_road']);
  await expect.poll(async () => (await W<CombatInfo>(page, 'combat'))?.current, { timeout: 60_000 }).toBe('player');
  await page.evaluate(() => {
    const world = (window as unknown as { __phaser: { scene: { getScene(id: string): { cast: { actor(id: string): { teleport(x: number, y: number): void } } } } } }).__phaser.scene.getScene('World');
    world.cast.actor('scorp_road').teleport(24, 27);
  });
  await expect.poll(() => outlined(page)).toBe(true);
  await page.waitForTimeout(1500);
  const me = async () => (await W<CombatInfo>(page, 'combat'))!.units.find((u) => u.id === 'player')!;
  const before = await me();
  expect(await clickActor(page, 'scorp_road')).toBe(true);
  await expect.poll(async () => (await me()).ap, { timeout: 20_000 }).toBeLessThan(before.ap);
  expect(await me()).toMatchObject({ x: before.x, y: before.y }); // it shot, it did not walk
  expect(errors).toEqual([]);
});
