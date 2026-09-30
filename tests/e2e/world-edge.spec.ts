// The camera may reach every corner of the ground image; no void (page background) may show.
import { test, expect } from '@playwright/test';
import { loadImage, createCanvas } from '@napi-rs/canvas';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

const WORLD_H = 720 - 116; // above the HUD console

test('map edges show wasteland, not void, at zoom 1', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __menu?: unknown }).__menu);
  await page.evaluate(() => (window as unknown as { __menu: { quickStart(i: number): void } }).__menu.quickStart(0));
  await page.waitForFunction(() => !!(window as unknown as { __world?: unknown }).__world);
  const spots: [number, number][] = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]];
  for (const [fx, fy] of spots) {
    await page.evaluate(
      ([fx, fy]) => {
        const g = (window as unknown as { __phaser: Phaser.Game }).__phaser;
        const cam = g.scene.getScene('World').cameras.main;
        cam.stopFollow();
        cam.setZoom(1);
        const b = cam.getBounds();
        cam.centerOn(b.x + b.width * fx, b.y + b.height * fy);
      },
      [fx, fy],
    );
    await page.waitForTimeout(400);
    const img = await loadImage(await page.screenshot());
    const cv = createCanvas(img.width, img.height);
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, WORLD_H).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.max(d[i], d[i + 1], d[i + 2]) < 16) dark++;
    expect(dark / (d.length / 4), `void at ${fx},${fy}`).toBeLessThan(0.05);
  }
});
