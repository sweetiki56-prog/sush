import { expect, test } from '@playwright/test';
import { GL, W, startGame } from './helpers';

test.use(GL);

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
  const outline = () => page.evaluate(() => {
    const world = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('World');
    return world.children.list.some((child) => {
      const image = child as { texture?: { key?: string }; visible?: boolean };
      return image.visible && image.texture?.key?.startsWith('hostile_outline_');
    });
  });
  await expect.poll(outline).toBe(true);
  await page.screenshot({ path: 'test-results/e2e-scorpion-vehicle-outline.png' });
  expect(errors).toEqual([]);
});
