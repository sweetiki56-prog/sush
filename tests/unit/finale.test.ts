// Chapter I finale in the real room: the Trust walks in after the reward, and every way of seeing it off.
import { describe, it, expect } from 'vitest';
import { CONTENT } from '../../src/content';
import { MissionRoom } from '../../src/core/room/Mission';
import { Client, MAP, room, until } from './rooms';

type R = MissionRoom;

/** Pick the shown answer that contains `text`. */
function say(c: Client, text: string) {
  const d = c.last('dialogue')!;
  const i = d.options.findIndex((o) => o.includes(text));
  expect(i, `"${text}" in ${JSON.stringify(d.options)}`).toBeGreaterThanOrEqual(0);
  c.do({ t: 'choose', i });
}

function talk(r: R, c: Client, id: string, from: [number, number]) {
  const before = c.of('dialogue').length;
  c.do({ t: 'debug', op: { op: 'teleport', x: from[0], y: from[1] } });
  c.do({ t: 'interact', id });
  expect(until(r, () => c.of('dialogue').length > before), `talk to ${id}`).toBe(true);
}

const flags = (r: R) => r.world.flags;

/** The pump works and Marta pays: the Trust walks in from the west road and takes its posts. */
function arrived(players = 1) {
  const { r, clients } = room(players);
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const k of ['quest_accepted', 'valve_taken', 'door_open', 'pump_fixed']) g.setFlag(k);
  g.setStage('water', 'report');
  g.give('tube');
  g.setStage('mandate', 'found');
  talk(r, c, 'marta', [15, 25]);
  say(c, 'Рад был помочь');
  say(c, 'Прощай, Марта');
  expect(until(r, () => ['shluz', 'collector_a', 'collector_b'].every((id) => r.npcs.get(id) && !r.npcs.get(id)!.mover.moving))).toBe(true);
  return { r, clients, c, g };
}

/** Talk the Trust out of the village and wait until they are gone. */
function gone(r: R) {
  expect(until(r, () => !r.npcs.has('shluz') && !r.npcs.has('collector_a') && !r.npcs.has('collector_b'))).toBe(true);
}

describe('Chapter I finale: Inspector Шлюз', () => {
  it('the Trust walks in after the reward, Hank hides, Marta points the way', () => {
    const { r, c, g } = arrived();
    expect(c.of('spawn').filter((m) => m.actor.id === 'shluz')[0].actor).toMatchObject({ x: 0, y: 25, kind: 'npc' });
    expect(r.npcs.get('shluz')!.mover.tile).toEqual({ x: 11, y: 24 });
    expect(r.npcs.has('hank')).toBe(false);
    expect(c.of('despawn').some((m) => m.id === 'hank')).toBe(true);
    expect(g.stage('inspector')).toBe('came');
    expect(flags(r).chapter1_done).toBeUndefined();
    talk(r, c, 'marta', [15, 25]);
    say(c, 'налог');
    expect(c.last('dialogue')!.text).toMatch(/Сорок капель/);
    say(c, 'Ясно');
    say(c, 'Поговорю');
    talk(r, c, 'shack_3', [11, 30]);
    expect(c.last('dialogue')!.text).toMatch(/Хэнк/);
  });

  it('tax: Marta vouches, nobody searches, they leave; the west road ends the chapter', () => {
    const { r, c, g } = arrived();
    g.addCaps(30);
    const caps = g.state.caps;
    c.do({ t: 'debug', op: { op: 'teleport', x: 3, y: 25 } });
    c.do({ t: 'walk', x: 0, y: 25 });
    expect(until(r, () => r.players.get(c.id)!.mover.tile.x === 0)).toBe(true);
    expect(flags(r).chapter1_done).toBeUndefined(); // not before the Trust is dealt with
    talk(r, c, 'shluz', [12, 24]);
    say(c, '(40 капель)');
    say(c, 'Непременно');
    expect(g.state.caps).toBe(caps - 40);
    expect(flags(r)).toMatchObject({ trust_outcome: 'tax', well_taxed: true, trust_left: true });
    expect(g.stage('inspector')).toBe('gone');
    expect(g.journal('inspector').at(-1)!.text).toMatch(/платит налог/);
    expect(g.count('tube')).toBe(1);
    gone(r);
    expect(r.npcs.has('hank')).toBe(true);
    talk(r, c, 'marta', [15, 25]);
    say(c, 'Спасибо');
    expect(g.count('letter')).toBe(1);
    c.do({ t: 'debug', op: { op: 'teleport', x: 2, y: 25 } });
    c.do({ t: 'walk', x: 0, y: 25 });
    expect(until(r, () => !!flags(r).chapter1_done)).toBe(true);
  });

  it('a good lie keeps the tube; the well can still be argued free or sealed', () => {
    const { r, c, g } = arrived();
    g.rng = () => 0; // the Красноречие rolls pass
    talk(r, c, 'shluz', [12, 24]);
    say(c, 'Сгорел он');
    expect(c.last('dialogue')!.text).toMatch(/Пепел не допросишь/);
    say(c, 'Дальше');
    say(c, 'Ставьте свою пломбу');
    say(c, '…');
    expect(flags(r)).toMatchObject({ trust_outcome: 'lie', shluz_lied: true, well_sealed: true });
    expect(g.count('tube')).toBe(1);
    talk(r, c, 'pump', [12, 24]);
    expect(c.last('dialogue')!.text).toMatch(/пломба/);
  });

  it('a bad lie brings the search, and the tube in a bag is found', () => {
    const { r, c, g } = arrived();
    g.rng = () => 0.99;
    talk(r, c, 'shluz', [12, 24]);
    say(c, 'Сгорел он');
    say(c, '…');
    say(c, 'Ждать');
    expect(c.last('dialogue')!.text).toMatch(/Казённое имущество/);
  });

  it('hidden in the well: the search comes up empty, the tube waits in the cache', () => {
    const { r, c, g } = arrived();
    talk(r, c, 'pump', [12, 24]);
    say(c, 'Опустить тубус');
    expect(g.count('tube')).toBe(0);
    talk(r, c, 'shluz', [12, 24]);
    say(c, 'Обыскивайте');
    say(c, 'Ждать');
    expect(c.last('dialogue')!.text).toMatch(/Чисто/);
    say(c, 'Дальше');
    g.rng = () => 0; // argue the pump free
    say(c, 'пока ничья');
    say(c, 'Прощайте');
    expect(flags(r)).toMatchObject({ trust_outcome: 'hidden', tube_well: true });
    expect(flags(r).well_sealed).toBeUndefined();
    talk(r, c, 'pump', [12, 24]);
    say(c, 'Вытянуть тубус');
    expect(g.count('tube')).toBe(1);
  });

  it("Hank's bag is the worst cache: the tube is found and giving it up costs Hank", () => {
    const { r, c, g } = arrived();
    talk(r, c, 'hank_bag', [17, 29]);
    say(c, 'мешка Хэнка');
    talk(r, c, 'shluz', [12, 24]);
    say(c, 'Обыскивайте');
    say(c, 'Ждать');
    expect(c.last('dialogue')!.text).toMatch(/Мешок беглеца/);
    g.rng = () => 0.99; // «не трогайте бродягу» fails
    say(c, 'бродягу не трогайте');
    say(c, '…');
    expect(c.last('dialogue')!.options.some((o) => o.includes('заколоченной'))).toBe(false); // Hank is already taken
    say(c, 'Прощайте');
    expect(flags(r)).toMatchObject({ trust_outcome: 'surrender', hank_taken: true, paper_dog: true, tube_bag: false });
    expect(g.count('trust_pass')).toBe(1);
    gone(r);
    expect(r.npcs.has('hank')).toBe(false);
    talk(r, c, 'marta', [15, 25]);
    expect(c.last('dialogue')!.text).toMatch(/Тубус уехал/);
  });

  it('handing the tube over pays, and betraying Hank pays more', () => {
    const { r, c, g } = arrived();
    const caps = g.state.caps;
    talk(r, c, 'shluz', [12, 24]);
    say(c, 'Вот ваш тубус');
    say(c, 'заколоченной хижине');
    say(c, '…');
    expect(g.count('tube')).toBe(0);
    expect(g.state.caps).toBe(caps + 30 + 20);
    expect(flags(r)).toMatchObject({ trust_outcome: 'surrender', hank_taken: true });
    expect(flags(r).karma).toBe(-3);
  });

  it('the law: «выдан предъявителю» makes the inspector hand the tube back', () => {
    const { r, c, g } = arrived();
    g.setFlag('hank_confessed');
    g.rng = () => 0;
    talk(r, c, 'shluz', [12, 24]);
    say(c, 'Обыскивайте');
    say(c, 'Ждать');
    say(c, 'предъявителю');
    expect(c.last('dialogue')!.text).toMatch(/закон, а не грабёж/);
    say(c, 'Спасибо');
    say(c, 'Ставьте');
    say(c, '…');
    expect(flags(r)).toMatchObject({ trust_outcome: 'law', shluz_doubts: true });
    expect(g.count('tube')).toBe(1);
  });

  it('a threat turns the Trust hostile; the inspector leaves wounded instead of dying', () => {
    const { r, c, g } = arrived();
    talk(r, c, 'shluz', [12, 24]);
    say(c, 'Уходите');
    say(c, 'Да');
    expect(r.fight).toBeNull(); // the fight waits for the talk to end
    say(c, '…');
    expect(r.fight).not.toBeNull();
    expect(r.npcs.has('shluz')).toBe(false);
    expect(r.hostiles.group('trust').map((h) => h.id).sort()).toEqual(['collector_a', 'collector_b', 'shluz']);
    const combat = r.fight!.combat;
    expect(combat.unit('collector_a')!.weapons).toEqual(['nailgun']);
    const me = combat.unit(c.id)!;
    for (const u of combat.units) u.fleeAt = 0; // nobody runs off into a corner: the inspector still leaves on the last blow
    g.rng = () => 0.5;
    for (let n = 0; n < 300 && r.fight; n++) {
      const last = c.last('combat')!;
      if (last.sync.busy || last.sync.units[last.sync.idx].id !== c.id) {
        c.ack();
        continue;
      }
      // a steady hand: every shot lands, every foe is one hit from the end
      me.skills.guns = 95;
      g.give('ammo', 5);
      const foe = combat.units.find((u) => u.side === 'hostile' && !u.dead && !u.fled);
      if (foe) foe.hp = 1;
      if (foe && me.ap >= 5) c.do({ t: 'attack', target: foe.id });
      else c.do({ t: 'endTurn' });
    }
    expect(r.fight).toBeNull();
    expect(c.last('combatEnd')!.outcome).toBe('victory');
    expect(flags(r)).toMatchObject({ trust_outcome: 'fight', fled_shluz: true, dead_collector_a: true, dead_collector_b: true, hank_hid: false });
    expect(g.state.log.some((l) => l.includes('уходит в марево, зажимая рану'))).toBe(true);
    expect(g.stage('inspector')).toBe('gone');
    expect(r.npcs.has('hank')).toBe(true);
    // the dead stay by the road after a reload; the inspector does not come back
    const again = new MissionRoom({ mode: 'solo', code: 'T2', content: CONTENT, map: MAP }, r.world);
    expect(again.hostiles.list.map((h) => [h.id, h.dead])).toEqual(expect.arrayContaining([['collector_a', true], ['collector_b', true]]));
    expect(again.hostiles.byId('shluz')).toBeUndefined();
    expect(again.npcs.has('shluz')).toBe(false);
  });

  it('co-op: the search finds the tube in a friend’s bag and takes it from there', () => {
    const { r, clients, g } = arrived(2);
    const [a, b] = clients;
    const g2 = r.players.get(b.id)!.game;
    g.take('tube');
    g2.give('tube');
    talk(r, a, 'shluz', [12, 24]);
    say(a, 'Обыскивайте');
    say(a, 'Ждать');
    say(a, 'Забирайте');
    say(a, '…');
    expect(g2.count('tube')).toBe(0);
    expect(g.count('trust_pass')).toBe(1);
  });

  it('an old save past the reward finds the Trust already at the pump', () => {
    const { r } = room();
    r.world.flags.quest_complete = true;
    const loaded = new MissionRoom({ mode: 'solo', code: 'T3', content: CONTENT, map: MAP }, r.world);
    expect(loaded.npcs.get('shluz')!.mover.tile).toEqual({ x: 11, y: 24 });
  });
});
