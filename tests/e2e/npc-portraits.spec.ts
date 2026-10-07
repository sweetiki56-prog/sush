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

test('Marta keeps her own portrait in the talk, quest journal and dialogue history', async ({ page }) => {
  await startGame(page);
  await W(page, 'teleport', 14, 25);
  expect(await W<boolean>(page, 'interact', 'marta')).toBe(true);
  await expect.poll(async () => (await state(page)).modal).toBe(true);
  const avatarFrames = () => page.evaluate(() => {
    const scene = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('UI');
    const found: string[] = [];
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      const object = value as { frame?: { name?: string }; list?: unknown[] };
      if (object.frame?.name?.startsWith('portrait_')) found.push(object.frame.name);
      object.list?.forEach(visit);
    };
    scene.children.list.forEach(visit);
    return found;
  });
  expect(await avatarFrames()).toContain('portrait_marta');
  const reply = await W<{ options: string[] }>(page, 'dialogue');
  await page.keyboard.press(String(reply.options.length));
  await expect.poll(async () => (await state(page)).modal).toBe(false);
  await page.evaluate(() => {
    const s = (window as unknown as { __world: { session(): { game: { setStage(quest: string, stage: string): void } } } }).__world.session();
    s.game.setStage('water', 'find_station');
  });
  await page.keyboard.press('j');
  await expect.poll(avatarFrames).toContain('portrait_marta');
  await page.screenshot({ path: 'test-results/e2e-npc-marta-quest.png' });
  await page.mouse.click(600, 86); // dialogue-history tab
  await expect.poll(avatarFrames).toContain('portrait_marta');
});

test('the returned Rzhavchik speaks as the dog, never with Mityay’s portrait', async ({ page }) => {
  await startGame(page);
  await W(page, 'flag', 'rzhavchik', 'home');
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(intent: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: 'three_pillars', entry: 'south' } }));
  await expect.poll(() => W(page, 'worldMap')).toBe('three_pillars');
  await page.waitForFunction(() => !(window as unknown as { __phaser: { scene: { isActive(id: string): boolean } } }).__phaser.scene.isActive('Loading'));
  await W(page, 'teleport', 14, 15);
  expect(await W<boolean>(page, 'interact', 'rzhavchik_home')).toBe(true);
  await expect.poll(async () => (await state(page)).modal).toBe(true);
  const talk = await W<{ speaker: string; options: string[] }>(page, 'dialogue');
  expect(talk.speaker).toBe('Ржавчик');
  const frames = await page.evaluate(() => {
    const ui = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('UI');
    const found: string[] = [];
    const visit = (item: unknown): void => {
      if (!item || typeof item !== 'object') return;
      const object = item as { frame?: { name?: string }; list?: unknown[] };
      if (object.frame?.name?.startsWith('portrait_')) found.push(object.frame.name);
      object.list?.forEach(visit);
    };
    ui.children.list.forEach(visit);
    return found;
  });
  expect(frames).toContain('portrait_npc_rzhavchik');
  expect(frames).not.toContain('portrait_npc_mityay');
  await page.keyboard.press(String(talk.options.length));
  await expect.poll(async () => (await state(page)).modal).toBe(false);
  const history = await page.evaluate(() => (window as unknown as { __world: { session(): { game: { state: { dialogueHistory: { npcId?: string }[] } } } } }).__world.session().game.state.dialogueHistory);
  expect(history.some((entry) => entry.npcId === 'rzhavchik')).toBe(true);
});

test('two Kolyuchka farmers using one dialogue keep separate history IDs', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(intent: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: 'kolyuchka', entry: 'south' } }));
  await expect.poll(() => W(page, 'worldMap')).toBe('kolyuchka');
  await page.waitForFunction(() => !(window as unknown as { __phaser: { scene: { isActive(id: string): boolean } } }).__phaser.scene.isActive('Loading'));
  for (const [id, x, y] of [['farmer_0', 16, 22], ['farmer_1', 20, 26]] as const) {
    await W(page, 'teleport', x, y);
    expect(await W<boolean>(page, 'interact', id)).toBe(true);
    await expect.poll(async () => (await state(page)).modal).toBe(true);
    await page.keyboard.press('1');
    await expect.poll(async () => (await state(page)).modal).toBe(false);
  }
  const history = await page.evaluate(() => (window as unknown as { __world: { session(): { game: { state: { dialogueHistory: { npcId?: string; speaker: string }[] } } } } }).__world.session().game.state.dialogueHistory);
  const farmers = history.filter((entry) => entry.speaker === 'Хуторянин');
  expect(farmers.map((entry) => entry.npcId)).toEqual(['kolyuchka:farmer_0', 'kolyuchka:farmer_1']);
});

test('Галка, who shares a talk with Шнырь, speaks with her own face', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => (window as unknown as { __world: { session(): { send(intent: unknown): void } } }).__world.session().send({ t: 'debug', op: { op: 'goto', map: 'pillars_ruins' } }));
  await expect.poll(() => W(page, 'worldMap')).toBe('pillars_ruins');
  await page.waitForFunction(() => !(window as unknown as { __phaser: { scene: { isActive(id: string): boolean } } }).__phaser.scene.isActive('Loading'));
  await W(page, 'teleport', 9, 19);
  expect(await W<boolean>(page, 'interact', 'galka')).toBe(true);
  await expect.poll(async () => (await state(page)).modal).toBe(true);
  const frames = await page.evaluate(() => {
    const scene = (window as unknown as { __phaser: { scene: { getScene(id: string): { children: { list: unknown[] } } } } }).__phaser.scene.getScene('UI');
    const found: string[] = [];
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      const object = value as { texture?: { key?: string }; frame?: { name?: string }; list?: unknown[] };
      if (object.frame?.name?.startsWith('portrait_')) found.push(`${object.texture?.key}:${object.frame.name}`);
      object.list?.forEach(visit);
    };
    scene.children.list.forEach(visit);
    return found;
  });
  expect(frames).toContain('atlas:portrait_galka');
  expect(frames).not.toContain('npc_portraits:portrait_npc_kids');
  await page.keyboard.press('Enter');
  await page.screenshot({ path: 'test-results/e2e-npc-portrait-galka.png' });
});
