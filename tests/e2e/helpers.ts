// Shared Playwright helpers: start through the menu hook, poke the world, talk via number keys.
import { expect, type Page } from '@playwright/test';

export const GL = { launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } };

type Any = Record<string, (...a: unknown[]) => unknown>;

/** Call a __world debug hook. */
export function W<T = unknown>(page: Page, fn: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(([f, a]) => (window as unknown as { __world: Any }).__world[f as string](...(a as unknown[])) as T, [fn, args] as const);
}

export type State = { modal: boolean; flags: Record<string, unknown>; items: Record<string, number>; caps: number; hp: number; quests: Record<string, string>; stats: Record<string, number>; log: string[] };

export function state(page: Page): Promise<State> {
  return page.evaluate(() => {
    const s = (window as unknown as { __world: { session(): { modal: boolean; game: { state: object } } } }).__world.session();
    return { modal: s.modal, ...JSON.parse(JSON.stringify(s.game.state)) };
  });
}

/** Fresh game with a premade (0 Механик, 1 Говорун, 2 Стрелок), fast combat animations. */
export async function startGame(page: Page, premade = 0): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __menu?: unknown }).__menu);
  await page.evaluate((i) => (window as unknown as { __menu: { quickStart(i: number): void } }).__menu.quickStart(i), premade);
  await page.waitForFunction(() => {
    const w = (window as unknown as { __world?: { session(): { started: boolean } } }).__world;
    return !!w && w.session().started;
  });
  await W(page, 'pace', 0.05);
}

export async function talkTo(page: Page, id: string): Promise<void> {
  expect(await W<boolean>(page, 'interact', id), `interact ${id}`).toBe(true);
  await expect.poll(async () => (await state(page)).modal, { timeout: 120_000 }).toBe(true);
  await page.waitForTimeout(250);
}

export async function say(page: Page, ...keys: number[]): Promise<void> {
  for (const k of keys) {
    await page.keyboard.press(String(k));
    await page.waitForTimeout(200);
  }
}

export async function closed(page: Page): Promise<void> {
  await expect.poll(async () => (await state(page)).modal, { timeout: 60_000 }).toBe(false);
}

export async function give(page: Page, item: string, qty = 1): Promise<void> {
  await page.evaluate(([i, q]) => (window as unknown as { __world: { session(): { game: { give(i: string, q: number): void } } } }).__world.session().game.give(i as string, q as number), [item, qty] as const);
}

export type CombatInfo = { current: string; outcome: string | null; units: { id: string; hp: number; ap: number; dead: boolean; x: number; y: number }[] } | null;

/** Click an actor once the camera has stopped moving (it pans between turns; a stale spot would miss). */
export async function clickActor(page: Page, id: string): Promise<boolean> {
  let prev: { x: number; y: number } | null = null;
  for (let i = 0; i < 20; i++) {
    const pos = await W<{ x: number; y: number } | null>(page, 'screenOfActor', id);
    if (!pos) return false;
    if (prev && Math.abs(prev.x - pos.x) < 2 && Math.abs(prev.y - pos.y) < 2) {
      await page.mouse.click(pos.x, pos.y);
      return true;
    }
    prev = pos;
    await page.waitForTimeout(150);
  }
  return false;
}

export type Talk = { speaker: string; text: string; options: string[] } | null;

/** Press the number key of the answer that contains `text`. */
export async function answer(page: Page, text: string): Promise<void> {
  const d = await W<Talk>(page, 'dialogue');
  const i = d?.options.findIndex((o) => o.includes(text)) ?? -1;
  expect(i, `"${text}" in ${JSON.stringify(d?.options)}`).toBeGreaterThanOrEqual(0);
  await page.keyboard.press(String(i + 1));
  await page.waitForTimeout(200);
}
