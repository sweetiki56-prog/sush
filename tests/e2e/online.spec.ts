// Online play with two browsers against the test game server: co-op by room code, and an arena round.
import { test, expect, type Browser, type Page } from '@playwright/test';
import { GL, W, clickActor, type CombatInfo } from './helpers';

test.use(GL);

async function player(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); // own storage = own player token
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForFunction(() => !!(window as unknown as { __menu?: unknown }).__menu);
  return page;
}

type Lobby = { create(): void; join(c: string): void; premade(i: number): void; status(): string };
const premade = (p: Page, i: number) => p.evaluate((i) => (window as unknown as { __lobby: Lobby }).__lobby.premade(i), i);
const create = (p: Page) => p.evaluate(() => (window as unknown as { __lobby: Lobby }).__lobby.create());
const join = (p: Page, code: string) => p.evaluate((c) => (window as unknown as { __lobby: Lobby }).__lobby.join(c), code);

async function openLobby(page: Page, mode: 'coop' | 'arena'): Promise<void> {
  await page.evaluate((m) => (window as unknown as { __menu: { lobby(m: string): void } }).__menu.lobby(m), mode);
  await page.waitForFunction(() => (window as unknown as { __lobby?: Lobby }).__lobby?.status() === 'open', null, { timeout: 15_000 });
}

async function inWorld(page: Page): Promise<void> {
  await page.waitForFunction(() => !!(window as unknown as { __world?: { session(): { started: boolean } } }).__world?.session().started, null, { timeout: 30_000 });
  await W(page, 'pace', 0.05);
}

const net = (page: Page) =>
  page.evaluate(() => {
    const n = (window as unknown as { __world: { session(): { net: { code: string; you: string; players: { id: string; name: string }[] } } } }).__world.session().net;
    return { code: n.code, you: n.you, players: n.players.map((p) => p.name) };
  });

const log = (page: Page) => page.evaluate(() => (window as unknown as { __world: { session(): { game: { state: { log: string[] } } } } }).__world.session().game.state.log);

/** Both clients take turns: on your turn, click the target if it is on screen, else walk toward it; then end the turn. */
async function fightOut(pages: Page[], pick: (me: string, c: NonNullable<CombatInfo>) => string | null, rounds = 80): Promise<void> {
  const onScreen = (p: { x: number; y: number } | null) => !!p && p.x > 20 && p.x < 1260 && p.y > 60 && p.y < 590;
  for (let i = 0; i < rounds; i++) {
    const c = await W<CombatInfo>(pages[0], 'combat');
    if (!c) return;
    for (const p of pages) {
      const me = (await net(p)).you;
      const cur = await W<CombatInfo>(p, 'combat');
      if (!cur || cur.current !== me) continue;
      const target = pick(me, cur);
      if (target) {
        const pos = await W<{ x: number; y: number } | null>(p, 'screenOfActor', target);
        if (onScreen(pos)) await clickActor(p, target);
        else {
          // too far to see: take a few steps toward it
          const a = cur.units.find((u) => u.id === me)!;
          const t = cur.units.find((u) => u.id === target)!;
          const step = (d: number) => Math.sign(d) * Math.min(3, Math.abs(d));
          const tile = await W<{ x: number; y: number }>(p, 'screenOfTile', a.x + step(t.x - a.x), a.y + step(t.y - a.y));
          await p.mouse.click(tile.x, tile.y);
        }
        await p.waitForTimeout(400);
      }
      const again = await W<CombatInfo>(p, 'combat');
      if (again?.current === me) await p.keyboard.press(' ');
    }
    await pages[0].waitForTimeout(250);
  }
}

test('co-op: a friend joins by code, sees you, waits for a busy NPC, and you fight side by side', async ({ browser }) => {
  const errors: string[] = [];
  const a = await player(browser);
  const b = await player(browser);
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));

  await openLobby(a, 'coop');
  await premade(a, 2); // Стрелок
  await create(a);
  await inWorld(a);
  const { code } = await net(a);
  expect(code).toMatch(/^[A-Z0-9]{5}$/);

  await openLobby(b, 'coop');
  await premade(b, 0); // Механик
  await join(b, code);
  await inWorld(b);
  await expect.poll(async () => (await net(a)).players.length).toBe(2);
  expect((await net(b)).you).toBe('p2');

  // B watches A walk
  await W(a, 'teleport', 10, 26);
  expect(await W(a, 'walkTo', 12, 27)).toBe(true);
  await expect.poll(() => W(b, 'actor', 'player'), { timeout: 20_000 }).toEqual({ x: 12, y: 27, moving: false });

  // Marta talks to one at a time
  await W(a, 'teleport', 12, 25);
  await W(b, 'teleport', 16, 25);
  expect(await W(a, 'interact', 'marta')).toBe(true);
  await expect.poll(() => a.evaluate(() => (window as unknown as { __world: { session(): { modal: boolean } } }).__world.session().modal)).toBe(true);
  expect(await W(b, 'interact', 'marta')).toBe(true);
  await expect.poll(async () => (await log(b)).at(-1) ?? '').toMatch(/занят разговором/);
  await a.keyboard.press('5'); // "Мне пора."
  await expect.poll(() => a.evaluate(() => (window as unknown as { __world: { session(): { modal: boolean } } }).__world.session().modal)).toBe(false);

  // a fight: the road scorpion against both of us; every roll hits
  await W(a, 'teleport', 22, 27);
  await W(b, 'teleport', 22, 26);
  await W(a, 'rig', [0.05]);
  await W(a, 'startCombat', ['scorp_road']);
  await expect.poll(() => W<CombatInfo>(b, 'combat'), { timeout: 30_000 }).not.toBeNull();
  const units = (await W<CombatInfo>(b, 'combat'))!.units.map((u) => u.id);
  expect(units).toEqual(expect.arrayContaining(['player', 'p2', 'scorp_road']));
  await fightOut([a, b], (_me, c) => (c.units.find((u) => u.id === 'scorp_road' && !u.dead) ? 'scorp_road' : null));
  await expect.poll(() => W<CombatInfo>(b, 'combat'), { timeout: 30_000 }).toBeNull();
  await expect.poll(async () => (await log(b)).join('\n')).toMatch(/Скорпион-мутант мёртв/);
  await a.screenshot({ path: 'test-results/e2e-online-coop.png' });
  expect(errors).toEqual([]);
});

test('arena: two builds ready up and fight a round to the finish', async ({ browser }) => {
  const errors: string[] = [];
  const a = await player(browser);
  const b = await player(browser);
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));

  await openLobby(a, 'arena');
  await create(a);
  await inWorld(a);
  const { code } = await net(a);
  await openLobby(b, 'arena');
  await join(b, code);
  await inWorld(b);

  for (const p of [a, b]) await p.evaluate(() => (window as unknown as { __world: { session(): { send(i: object): void } } }).__world.session().send({ t: 'ready', on: true }));
  await expect.poll(() => W<CombatInfo>(a, 'combat'), { timeout: 20_000 }).not.toBeNull();
  await W(a, 'rig', [0.02]); // hits and crits all round
  await a.screenshot({ path: 'test-results/e2e-online-arena.png' });
  await fightOut([a, b], (me, c) => c.units.find((u) => (u.id === 'player' || u.id === 'p2') && u.id !== me && !u.dead)?.id ?? null, 120);
  await expect.poll(async () => (await log(a)).join('\n'), { timeout: 30_000 }).toMatch(/Раунд 1: (побеждает|ничья)/);
  expect(errors).toEqual([]);
});

test('co-op road: the party leaves town together after a countdown, and a gang met by one is fought by both', async ({ browser }) => {
  const errors: string[] = [];
  const a = await player(browser);
  const b = await player(browser);
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));
  await openLobby(a, 'coop');
  await premade(a, 2);
  await create(a);
  await inWorld(a);
  const { code } = await net(a);
  await openLobby(b, 'coop');
  await premade(b, 0);
  await join(b, code);
  await inWorld(b);
  await expect.poll(async () => (await net(a)).players.length).toBe(2);
  for (const [k, v] of [['chapter1_seen', true], ['chapter1_done', true], ['trust_outcome', 'tax']] as const) await W(a, 'flag', k, v);

  // A steps onto the west road: B sees the countdown, then both are on the world map
  await W(a, 'teleport', 3, 25);
  await W(a, 'walkTo', 0, 25);
  await expect.poll(async () => (await log(b)).join('\n'), { timeout: 20_000 }).toMatch(/зовёт отряд в путь/);
  await b.waitForTimeout(300);
  await b.screenshot({ path: 'test-results/e2e-online-depart.png' });
  for (const p of [a, b]) await p.waitForFunction(() => !!(window as unknown as { __travel?: unknown }).__travel, null, { timeout: 30_000 });

  // a gang beside the party: A walks into it and talks; the fight takes both
  type TravelHook = { state(): { x: number; y: number }; go(x: number, y: number): void; party(tpl: string, dx: number, dy: number, m?: string[]): void };
  const at = await a.evaluate(() => (window as unknown as { __travel: TravelHook }).__travel.state());
  await a.evaluate(() => (window as unknown as { __travel: TravelHook }).__travel.party('gang', 1, 0, ['raider']));
  await a.evaluate(([x, y]) => (window as unknown as { __travel: TravelHook }).__travel.go(x, y), [Math.floor(at.x) + 1, Math.floor(at.y)]);
  await expect.poll(() => W(a, 'dialogue'), { timeout: 30_000 }).not.toBeNull();
  await expect.poll(async () => (await log(b)).join('\n')).toMatch(/Вы натыкаетесь на отряд/);
  const pick = async (text: string) => {
    const d = (await W<{ options: string[] }>(a, 'dialogue'))!;
    await a.keyboard.press(String(d.options.findIndex((o) => o.includes(text)) + 1));
    await a.waitForTimeout(300);
  };
  await pick('Напасть');
  await pick('…');
  for (const p of [a, b]) await expect.poll(() => W<CombatInfo>(p, 'combat'), { timeout: 60_000 }).not.toBeNull();
  const units = (await W<CombatInfo>(b, 'combat'))!.units.map((u) => u.id);
  expect(units).toEqual(expect.arrayContaining(['player', 'p2', 'enc_0']));
  await b.waitForTimeout(600);
  await b.screenshot({ path: 'test-results/e2e-online-road-fight.png' });
  expect(errors).toEqual([]);
});
