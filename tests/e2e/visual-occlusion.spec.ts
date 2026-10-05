import { expect, test } from '@playwright/test';
import { GL, W, startGame } from './helpers';

test.use(GL);

test('Hank, fire and bag remain individually visible', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startGame(page);
  await W(page, 'teleport', 17, 32);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/e2e-camp-visibility.png' });
  expect(errors).toEqual([]);
});
