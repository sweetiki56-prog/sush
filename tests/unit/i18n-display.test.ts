import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { CONTENT } from '../../src/content';
import { Game } from '../../src/core/Game';
import type { DialogueMsg } from '../../src/core/room/protocol';
import { contentText, dialogueForDisplay, fillDisplay, historyLineForDisplay, historySpeakerForDisplay, journalLineForDisplay, mapLabelForDisplay } from '../../src/i18n/display';
import { runtimeLineForDisplay } from '../../src/i18n/runtime';
import { room, until } from './rooms';

describe('client-side English display', () => {
  it('uses reviewed content and rejects stale source text', () => {
    expect(contentText('/dialogues/marta/speaker', 'Старейшина Марта', 'en')).toBe('Elder Marta');
    expect(contentText('/dialogues/marta/nodes/dumb/text', CONTENT.dialogues.marta.nodes.dumb.text, 'en'))
      .toContain('Marta squints.');
    expect(contentText('/dialogues/door/nodes/locked/text', CONTENT.dialogues.door.nodes.locked.text, 'en'))
      .toContain('heavy steel door');
    expect(contentText('/dialogues/iva/speaker', CONTENT.dialogues.iva.speaker, 'en'))
      .toBe('Iva');
    expect(contentText('/dialogues/marta/speaker', 'Changed source', 'en')).toBe('Changed source');
    expect(contentText('/dialogues/hank/nodes/tube_stole/text', CONTENT.dialogues.hank.nodes.tube_stole.text, 'en'))
      .toContain('Chairman Zatvor');
    expect(Object.entries(CONTENT.dialogues.hank.nodes).length).toBeGreaterThan(10);
  });

  it('reuses only exact and unambiguous reviewed translations for map labels', () => {
    expect(mapLabelForDisplay('Колючка', 'en')).toBe('Kolyuchka');
    expect(mapLabelForDisplay('Ящик', 'en')).toBe('Crate');
    expect(mapLabelForDisplay('Колючка', 'ru')).toBe('Колючка');
    expect(mapLabelForDisplay('Unknown label', 'en')).toBe('Unknown label');
  });

  it('covers every generated map name, visible label, and blocked-exit message', () => {
    const missing: string[] = [];
    for (const file of readdirSync('public/assets/maps').filter((name) => name.endsWith('.json'))) {
      const map = JSON.parse(readFileSync(`public/assets/maps/${file}`, 'utf8')) as {
        name: string; objects?: { label?: string }[]; actors?: { label?: string }[]; exits?: { label?: string; closed?: string }[];
      };
      const entities: { label?: string; closed?: string }[] = [...(map.objects ?? []), ...(map.actors ?? []), ...(map.exits ?? [])];
      const source = [map.name, ...entities.flatMap((entry) => [entry.label, entry.closed])];
      for (const label of source) if (label && /[А-Яа-яЁё]/.test(mapLabelForDisplay(label, 'en'))) missing.push(`${file}: ${label}`);
    }
    expect(missing).toEqual([]);
  });

  it('covers Russian map arrival and completion logs', () => {
    const missing: string[] = [];
    const visit = (value: unknown, file: string): void => {
      if (typeof value === 'string') {
        if (/[А-Яа-яЁё]/.test(value) && /[А-Яа-яЁё]/.test(mapLabelForDisplay(value, 'en'))) missing.push(`${file}: ${value}`);
      } else if (value && typeof value === 'object') {
        for (const child of Object.values(value)) visit(child, file);
      }
    };
    for (const file of readdirSync('public/assets/maps').filter((name) => name.endsWith('.json')))
      visit(JSON.parse(readFileSync(`public/assets/maps/${file}`, 'utf8')) as unknown, file);
    expect(missing).toEqual([]);
  });

  it('maps visible options back to their original indexes without changing choice order', () => {
    const game = new Game(CONTENT);
    const node = CONTENT.dialogues.marta.nodes.after;
    const message: DialogueMsg = {
      id: 'marta', nodeId: 'after', speaker: CONTENT.dialogues.marta.speaker,
      text: node.text, options: [node.options[2].text, node.options[3].text],
      optionIndices: [2, 3], checks: [null, null],
    };
    const shown = dialogueForDisplay(message, game, 'en');
    expect(shown.speaker).toBe('Elder Marta');
    expect(shown.text).toContain('head north to Three Pillars');
    expect(shown.options).toEqual(['Will that seal stay on the pump for long?', 'Goodbye.']);
    expect(message.options).toEqual([node.options[2].text, node.options[3].text]);
    const legacy = { ...message, nodeId: undefined };
    expect(dialogueForDisplay(legacy, game, 'en').text).toContain('The pump is running.');
    expect(dialogueForDisplay({ ...message, text: 'Different server content' }, game, 'en').text)
      .toBe('Different server content');
  });

  it('keeps the server chance but localizes a skill-check label', () => {
    const game = new Game(CONTENT);
    const node = CONTENT.dialogues.door.nodes.locked;
    const index = node.options.findIndex((option) => option.check?.skill === 'lockpick');
    const source = node.options[index].text;
    const message: DialogueMsg = {
      id: 'door', nodeId: 'locked', speaker: CONTENT.dialogues.door.speaker,
      text: node.text, options: [`[Взлом 40%] ${source}`], optionIndices: [index],
      checks: [{ skill: 'lockpick', chance: 40 }],
    };
    expect(dialogueForDisplay(message, game, 'en').options[0]).toBe('[Lockpicking 40%] Pick the lock.');
  });

  it('translates generated road talks without changing their offered choices', () => {
    const game = new Game(CONTENT);
    const source: DialogueMsg = {
      id: 'road_test', nodeId: 'intro', speaker: 'Водонос',
      text: 'Двое с флягами на ремнях. — Вода. Дешевле, чем у Треста, и никто не пишет в книжку.',
      options: ['Фляга за 4 капли.', '[Красноречие 65%] Где вы берёте воду?'],
      optionIndices: [0, 1], checks: [null, { skill: 'speech', chance: 65 }],
    };
    const shown = dialogueForDisplay(source, game, 'en');
    expect(shown.speaker).toBe('Water Carrier');
    expect(shown.text).toContain('nobody writes your name');
    expect(shown.options).toEqual(['One canteen for four drops.', '[Speech 65%] Where do you get the water?']);
    expect(source.options[0]).toBe('Фляга за 4 капли.');
  });

  it('translates generated contract boards from reviewed job titles and descriptions', () => {
    const game = new Game(CONTENT);
    const board = CONTENT.dialogues.board;
    const first = board.nodes.board.options[0];
    const message: DialogueMsg = {
      id: 'board', nodeId: 'board', speaker: board.speaker, text: board.nodes.board.text,
      options: [first.text], optionIndices: [0], checks: [null],
    };
    const shown = dialogueForDisplay(message, game, 'en');
    expect(shown.speaker).toBe('Well Notice Board');
    expect(shown.text).not.toMatch(/[А-Яа-яЁё]/);
    expect(shown.options[0]).not.toMatch(/[А-Яа-яЁё]/);
    expect(message.options[0]).toBe(first.text);
    const progressNode = board.nodes.job_burrow;
    const progress: DialogueMsg = {
      id: 'board', nodeId: 'job_burrow', speaker: board.speaker,
      text: fillDisplay(progressNode.text, game), options: ['Ясно.'], optionIndices: [0], checks: [null],
    };
    const progressShown = dialogueForDisplay(progress, game, 'en');
    expect(progressShown.text).toContain('Completed: 0 of');
    expect(progressShown.text).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('translates counted road encounters and hired-caravan terms', () => {
    expect(runtimeLineForDisplay('Из-за укрытий выходит шайка «Жажды»: трое с оружием наготове. Главный скалится: — Капли или жизнь, путник. 20 капель — и иди своей дорогой.', 'en'))
      .toContain('Thirst Gang emerge from cover: three armed fighters');
    expect(runtimeLineForDisplay('Нужна охрана до места «Колючка»? (25 капель)', 'en'))
      .toBe('Need a guard as far as Kolyuchka? (25 drops)');
  });

  it('localizes dynamic player logs while preserving numeric values', () => {
    const lines = [
      'В руке 2: Винтовка.',
      '+225 опыта.',
      'Уровень повышен! Теперь уровень 6. Откройте окно персонажа [C].',
      'Вы теряете 3 ОЗ.',
      'Вы перевязываете раны: +12 ОЗ.',
      'Рука 1 свободна.',
    ];
    for (const source of lines) expect(runtimeLineForDisplay(source, 'en')).not.toMatch(/[А-Яа-яЁё]/);
    expect(runtimeLineForDisplay('+225 опыта.', 'en')).toBe('+225 XP.');
    expect(runtimeLineForDisplay('Вы теряете 3 ОЗ.', 'en')).toBe('You lose 3 HP.');
  });

  it('localizes room, road and caravan notices with their live values', () => {
    const lines = [
      'Вы входите: Колючка.',
      'Сюда дорога откроется в главе 5.',
      'Вы крадётесь. Скрытность 47%.',
      'Привал до утра (8 ч). Раны затянулись.',
      'Караван дошёл: Колючка. Караванщик отсчитывает 25 капель.',
      'Ночь у костра. Утро дня 3: раны затянулись.',
      'Контракт «Жала на отвар»: 2 из 4.',
    ];
    for (const source of lines) expect(runtimeLineForDisplay(source, 'en')).not.toMatch(/[А-Яа-яЁё]/);
    expect(runtimeLineForDisplay('Вы входите: Колючка.', 'en')).toBe('You enter Kolyuchka.');
  });

  it('localizes combat rolls, equipment, and status without altering the result', () => {
    const attack = runtimeLineForDisplay('Вы: винтовка, 68%, бросок 42: попадание.', 'en');
    expect(attack).toBe('You: rifle, 68%, roll 42: hit.');
    const thrown = runtimeLineForDisplay('Вы бросаете жестянка, 80%, бросок 12: точно в цель.', 'en');
    expect(thrown).not.toMatch(/[А-Яа-яЁё]/);
    expect(runtimeLineForDisplay('Вы: оглушение, следующий ход −2 ОД.', 'en')).toBe('You: stunned, −2 AP next turn.');
  });

  it('renders new dialogue-history references and reviewed quest text without mutating saved Russian', () => {
    const game = new Game(CONTENT);
    const source = CONTENT.dialogues.marta.nodes.after.text;
    const line = { role: 'npc' as const, text: source, ref: { dialogue: 'marta', node: 'after' } };
    expect(historyLineForDisplay(line, game, 'en')).toContain('The pump is running.');
    expect(historyLineForDisplay({ text: source }, game, 'en')).toContain('The pump is running.');
    expect(historySpeakerForDisplay({ speaker: 'Старейшина Марта', lines: [line] }, game, 'en')).toBe('Elder Marta');
    expect(line.text).toBe(source);
    const journal = CONTENT.quests.mandate.stages[1].journal;
    expect(journalLineForDisplay(game, 'mandate', 1, journal, 'en')).toContain('the Notary in Zapruda');
  });

  it('upgrades a repeated legacy history line with a reference, without duplicating it', () => {
    const game = new Game(CONTENT);
    const text = CONTENT.dialogues.marta.nodes.after.text;
    game.state.dialogueHistory = [{ speaker: 'Старейшина Марта', lines: [{ role: 'npc', text }] }];
    game.recordDialogue('Старейшина Марта', 'npc', text, { dialogue: 'marta', node: 'after' });
    expect(game.state.dialogueHistory[0].lines).toHaveLength(1);
    expect(game.state.dialogueHistory[0].lines[0].ref).toEqual({ dialogue: 'marta', node: 'after' });
  });

  it('sends optional node and original-option references from a real room', () => {
    const { r, clients } = room();
    const [client] = clients;
    client.do({ t: 'debug', op: { op: 'teleport', x: 12, y: 25 } });
    client.do({ t: 'interact', id: 'marta' });
    expect(until(r, () => !!client.last('dialogue'))).toBe(true);
    const message = client.last('dialogue')!;
    expect(message.nodeId).toBeTruthy();
    expect(message.optionIndices).toHaveLength(message.options.length);
    expect(message.checks).toHaveLength(message.options.length);
    const node = CONTENT.dialogues.marta.nodes[message.nodeId!];
    for (const [visible, sourceIndex] of message.optionIndices!.entries())
      expect(message.options[visible]).toContain(fillDisplay(node.options[sourceIndex].text, r.players.get(client.id)!.game));
    expect(r.players.get(client.id)!.game.state.dialogueHistory?.[0].lines[0].ref)
      .toEqual({ dialogue: 'marta', node: message.nodeId });
  });
});
