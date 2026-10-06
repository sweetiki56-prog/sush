import { expect, test } from '@playwright/test';
import { startGame, state, W } from './helpers';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

test('Rzhavchik has a pixel avatar in his dialogue', async ({ page }) => {
  await startGame(page, 2);
  await page.waitForFunction(() => !(window as unknown as { __phaser: { scene: { isActive(id: string): boolean } } }).__phaser.scene.isActive('Loading'));
  await W(page, 'teleport', 12, 32);
  expect(await W<boolean>(page, 'interact', 'rzhavchik')).toBe(true);
  await expect.poll(async () => (await state(page)).modal).toBe(true);
  const portraits = await page.evaluate(() => {
    const scene = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('UI');
    const found: { atlas: string; frame: string }[] = [];
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      const object = value as { texture?: { key?: string }; frame?: { name?: string }; list?: unknown[] };
      if (object.texture?.key && object.frame?.name) found.push({ atlas: object.texture.key, frame: object.frame.name });
      object.list?.forEach(visit);
    };
    scene.children.list.forEach(visit);
    return found;
  });
  expect(portraits).toContainEqual({ atlas: 'npc_portraits', frame: 'portrait_npc_rzhavchik' });
  await page.keyboard.press('Enter'); // show the complete line in the visual check
  await page.screenshot({ path: 'test-results/e2e-npc-portrait-rzhavchik.png' });
});
