// Chapter II «Тракт» in the real room: Три столба and Колючка, the Писарь, the raid, the side quests of the crossroads.
import { describe, it, expect } from 'vitest';
import { CONTENT } from '../../src/content';
import type { PartyState } from '../../src/core/travel/Parties';
import { room, until, untilAlone } from './rooms';
import { say, talk, winFight } from './story';

/** Chapter I is behind: the party stands in Три столба with Marta's letter and the tube; every roll succeeds. */
function inPillars(patch: (g: ReturnType<typeof setup>['g']) => void = () => {}) {
  const s = setup();
  patch(s.g);
  s.r.goTo('three_pillars');
  return s;
}
function setup() {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const [k, v] of [['trust_outcome', 'tax'], ['chapter1_done', true], ['chapter1_seen', true], ['day', 3]] as const) g.setFlag(k, v);
  g.give('letter');
  g.give('tube');
  g.state.caps = 300;
  g.rng = () => 0.01;
  return { r, c, g };
}

describe('Chapter II: the main line', () => {
  it('rumors, the Писарь unmasked, Прокоп and the letter, traps on the trail, the Notary, the gates of Запруда', () => {
    const { r, c, g } = inPillars();
    expect(g.stage('tract')).toBe('rumors');
    talk(r, c, 'zoya', [7, 27]);
    say(c, '…');
    say(c, 'Что говорят');
    say(c, 'Держи пять капель');
    expect(g.stage('tract')).toBe('scribe');
    say(c, 'Спасибо');
    say(c, 'Прощай');
    talk(r, c, 'pisar', [25, 22]);
    say(c, 'Кто тебя послал');
    say(c, '…');
    expect(g.flag('scribe_outcome')).toBe('exposed');
    expect(g.flag('notary_known')).toBe(true);
    expect(g.stage('tract')).toBe('prokop');
    expect(until(r, () => !r.npcs.has('pisar'), 60_000)).toBe(true);

    r.goTo('kolyuchka');
    talk(r, c, 'prokop', [11, 15]);
    say(c, 'Письмо от Марты');
    say(c, '…');
    expect(g.stage('tract')).toBe('raid');
    expect(g.flag('raid_day')).toBe(6);
    say(c, 'колючие ловушки');
    say(c, '…');
    say(c, 'Прощай');
    g.give('thorn_traps');
    talk(r, c, 'trail', [5, 6]);
    say(c, 'Разложить');
    say(c, '…');
    expect(g.flag('raid_traps')).toBe(true);
    // two nights at the fire: on the raid morning Кремень comes down the trail
    for (const day of [4, 5]) {
      g.setFlag('day', day);
      g.apply([{ type: 'rest' }]);
    }
    expect(g.flag('raid_now')).toBe(true);
    expect(until(r, () => !!r.npcs.get('kremen') && !r.npcs.get('kremen')!.mover.moving, 60_000)).toBe(true);
    talk(r, c, 'kremen', [8, 7]);
    expect(c.last('dialogue')!.text).toMatch(/половину, что ушла с гонцом/);
    say(c, 'Тропа за твоей спиной');
    say(c, '…');
    expect(g.flag('raid_outcome')).toBe('trapped');
    expect(g.flag('laska')).toBe('hidden');
    talk(r, c, 'prokop', [11, 15]);
    say(c, '…');
    say(c, '…');
    say(c, 'Спасибо, Прокоп');
    expect(g.stage('tract')).toBe('notary');
    r.runHooks(r.host!, CONTENT.locations.zapruda.reach);
    expect(g.flag('chapter2_done')).toBe(true);
    expect(g.stage('tract')).toBe('done');
  });

  it('the Писарь «certifies» the tube: a copy comes back', () => {
    const { r, c, g } = inPillars();
    talk(r, c, 'pisar', [25, 22]);
    say(c, 'заверяй');
    say(c, '…');
    expect(g.count('tube')).toBe(0);
    expect(g.count('tube_copy')).toBe(1);
    expect(g.flag('mandate_copy')).toBe(true);
    expect(g.state.items.tube_copy).toBe(1);
  });

  it('the tube went to the Trust: the Писарь buys Hank instead', () => {
    const { r, c, g } = inPillars((g) => {
      g.setFlag('trust_outcome', 'surrender');
      g.take('tube');
    });
    talk(r, c, 'pisar', [25, 22]);
    expect(c.last('dialogue')!.text).toMatch(/Хэнк/);
    const caps = g.state.caps;
    say(c, 'Плати');
    say(c, '…');
    expect(g.state.caps).toBe(caps + 40);
    expect(g.flag('hank_sold')).toBe(true);
    expect(g.flag('notary_known')).toBe(true);
  });

  it('followed to his cache: the report names the Notary', () => {
    const { r, c, g } = inPillars();
    talk(r, c, 'pisar', [25, 22]);
    say(c, 'Подумаю');
    say(c, 'проследить');
    say(c, '…');
    expect(g.flag('scribe_outcome')).toBe('followed');
    talk(r, c, 'scribe_cache', [35, 35]);
    say(c, 'Забрать донесение');
    expect(g.count('scribe_report')).toBe(1);
    expect(g.flag('notary_known')).toBe(true);
  });

  it('killed: his note under red wax gives the Notary’s address', () => {
    const { r, c, g } = inPillars();
    talk(r, c, 'pisar', [25, 22]);
    say(c, 'Проваливай');
    say(c, 'Напасть');
    expect(r.fight).not.toBeNull();
    winFight(r, c);
    expect(g.flag('scribe_outcome')).toBe('killed');
    expect(g.count('scribe_note')).toBe(1);
    expect(g.flag('notary_known')).toBe(true);
  });

  it('the raid fought: the militia and the hired guns fight beside the party; Кремень withdraws', () => {
    const { r, c, g } = inPillars((g) => {
      for (const [k, v] of [['prokop_trust', true], ['raid_day', 3], ['raid_late', 4], ['raid_guards', true]] as const) g.setFlag(k, v);
    });
    r.goTo('kolyuchka');
    expect(g.flag('raid_now')).toBe(true);
    expect(until(r, () => !!r.npcs.get('kremen') && !r.npcs.get('kremen')!.mover.moving, 60_000)).toBe(true);
    talk(r, c, 'kremen', [8, 7]);
    say(c, 'своих не отдаёт');
    say(c, 'В бой');
    expect(r.fight).not.toBeNull();
    const units = r.fight!.combat.units;
    expect(units.filter((u) => u.team === 'player' && u.side === 'hostile').length).toBeGreaterThanOrEqual(5); // 3 militia + 2 hired
    winFight(r, c);
    expect(g.flag('raid_outcome')).toBe('fought');
    expect(g.stage('tract')).toBe('notary');
  });

  it('too late: the farm fought alone and the beds burned', () => {
    const { r, g } = inPillars((g) => {
      for (const [k, v] of [['prokop_trust', true], ['raid_day', 2], ['raid_late', 3]] as const) g.setFlag(k, v);
    });
    r.goTo('kolyuchka');
    expect(g.flag('raid_outcome')).toBe('burned');
    expect(r.npcs.has('kremen')).toBe(false);
  });

  it('Ласка goes back of her own will: no blood', () => {
    const { r, c, g } = inPillars((g) => {
      for (const [k, v] of [['prokop_trust', true], ['raid_day', 3], ['raid_late', 4]] as const) g.setFlag(k, v);
    });
    r.goTo('kolyuchka');
    talk(r, c, 'barn', [24, 14]);
    say(c, 'Заглянуть');
    say(c, '…');
    expect(until(r, () => r.npcs.has('laska'))).toBe(true);
    talk(r, c, 'laska', [23, 14]);
    say(c, 'вернёшься сама');
    say(c, '…');
    expect(until(r, () => !!r.npcs.get('kremen') && !r.npcs.get('kremen')!.mover.moving, 60_000)).toBe(true);
    talk(r, c, 'kremen', [8, 7]);
    say(c, 'Спроси её саму');
    say(c, '…');
    expect(g.flag('raid_outcome')).toBe('parley');
    expect(g.flag('laska')).toBe('left');
  });
});

describe('Chapter II: Три столба side quests', () => {
  it('«Караван без воды»: the barrels were holed from inside; exposed, the «debtors» go free to Колючка', () => {
    const { r, c, g } = inPillars((g) => (g.char.attrs.per = 6));
    talk(r, c, 'hor', [30, 28]);
    say(c, 'Прощай');
    talk(r, c, 'hor_barrels', [30, 24]);
    say(c, 'Осмотреть дыры');
    say(c, '…');
    expect(g.stage('caravan_dry')).toBe('truth');
    talk(r, c, 'hor', [30, 28]);
    say(c, 'пробиты изнутри');
    say(c, '…');
    expect(g.flag('caravan_dry')).toBe('exposed');
    expect(g.flag('raid_freed')).toBe(true);
    expect(g.stage('caravan_dry')).toBe('freed');
    expect(until(r, () => !r.npcs.has('hor') && !r.npcs.has('debtor_0'), 60_000)).toBe(true);
  });

  it('«Караван без воды»: or buy them out, or bring a barrel of water from Колючка', () => {
    const a = inPillars((g) => g.setFlag('hor_truth'));
    talk(a.r, a.c, 'hor', [30, 28]);
    say(a.c, 'Сколько стоит');
    const caps = a.g.state.caps;
    say(a.c, 'Держи шестьдесят');
    expect(a.g.state.caps).toBe(caps - 60);
    expect(a.g.flag('caravan_dry')).toBe('bought');

    const b = inPillars((g) => {
      g.setFlag('hor_truth');
      g.setFlag('hor_met');
      g.setFlag('prokop_trust');
    });
    b.r.goTo('kolyuchka');
    talk(b.r, b.c, 'prokop', [11, 15]);
    say(b.c, 'Дашь бочку');
    say(b.c, 'Спасибо');
    say(b.c, 'Прощай');
    b.r.goTo('three_pillars');
    talk(b.r, b.c, 'hor', [30, 28]);
    say(b.c, 'бочка воды');
    say(b.c, '…');
    expect(b.g.flag('caravan_dry')).toBe('water');
  });

  it('«Пропавший гонец»: found in the ruins, hidden at Колючка; Зоя pays and names the Notary', () => {
    const { r, c, g } = inPillars((g) => g.setFlag('rumor_paper'));
    talk(r, c, 'zoya', [7, 27]);
    say(c, '…');
    say(c, 'встревожена');
    say(c, 'Найду');
    say(c, 'Займусь');
    say(c, 'Прощай');
    expect(until(r, () => r.npcs.has('senka'))).toBe(true);
    talk(r, c, 'senka', [32, 35]);
    say(c, '…');
    say(c, 'Иди в Колючку');
    say(c, '…');
    expect(g.count('letter_unaddressed')).toBe(1);
    talk(r, c, 'zoya', [7, 27]);
    const caps = g.state.caps;
    say(c, 'Сенька жив. Он в Колючке');
    expect(g.state.caps).toBe(caps + 30);
    say(c, 'Спасибо');
    say(c, 'прочесть старую');
    say(c, 'Спасибо, Зоя');
    expect(g.flag('notary_known')).toBe(true);
    expect(g.stage('courier')).toBe('done');
  });

  it('«Трактирный долг»: the map for the debt, and Зоя forgives it (grudgingly)', () => {
    const { r, c, g } = inPillars((g) => g.setFlag('rumor_paper'));
    talk(r, c, 'zoya', [7, 27]);
    say(c, '…');
    say(c, 'Работа есть');
    say(c, 'Выбью');
    say(c, 'Прощай');
    talk(r, c, 'luka', [10, 31]);
    say(c, 'Отдай карту');
    say(c, 'Скажу');
    expect(g.count('water_path_map')).toBe(1);
    talk(r, c, 'zoya', [7, 27]);
    say(c, 'Прости ему долг');
    expect(g.flag('debt_done')).toBe(true);
    expect(g.flag('zoya_annoyed')).toBe(true);
  });

  it('«Честная драка»: a bout on the ring; the drugged boxer collapses and a medic saves him', () => {
    const { r, c, g } = inPillars();
    talk(r, c, 'gvozd', [13, 29]);
    say(c, 'Выйти на ринг');
    say(c, 'На ринг');
    expect(r.fight).not.toBeNull();
    expect(r.ring).toBe(true);
    winFight(r, c);
    expect(g.flag('ring_result')).toBe('won');
    expect(r.npcs.has('bugai')).toBe(true);
    talk(r, c, 'gvozd', [13, 29]);
    say(c, '…');
    expect(c.last('dialogue')!.text).toMatch(/не встаёт/);
    const caps = g.state.caps;
    say(c, 'Откачать');
    say(c, 'Забрать выигрыш');
    expect(g.flag('bugai_saved')).toBe(true);
    expect(g.flag('gvozd_out')).toBe(true);
    expect(g.state.caps).toBe(caps + 100);
  });

  it('«Честная драка»: a medic sees the «Мираж» and Зоя throws Гвоздь out', () => {
    const { r, c, g } = inPillars((g) => (g.char.spent.medic = 60)); // a trained eye
    expect(g.skill('medic')).toBeGreaterThanOrEqual(40);
    talk(r, c, 'gvozd', [13, 29]);
    say(c, 'с глазами');
    say(c, '…');
    expect(g.flag('mirage_seen')).toBe(true);
    say(c, 'Не сегодня');
    talk(r, c, 'zoya', [7, 27]);
    say(c, '…');
    say(c, 'Гвоздь поит');
    say(c, '…');
    expect(g.flag('gvozd_out')).toBe(true);
    expect(g.flag('bugai_clean')).toBe(true);
    expect(until(r, () => !r.npcs.has('gvozd'), 60_000)).toBe(true);
  });

  it('the Trust post knows a face from Ржавый колодец: a fine settles it', () => {
    const { r, c, g } = inPillars((g) => g.setFlag('trust_outcome', 'fight'));
    talk(r, c, 'mytny', [24, 13]);
    expect(c.last('dialogue')!.text).toMatch(/Ржавый колодец/);
    say(c, 'Штраф');
    say(c, '…');
    expect(g.flag('post_settled')).toBe(true);
    expect(r.fight).toBeNull();
  });

  it('«Доска наград»: the runaway raider is a water-bearer; spared for his pouch, the Trust pays for it anyway', () => {
    const { r, c, g } = inPillars();
    talk(r, c, 'board_pillars', [20, 23]);
    say(c, 'Беглый налётчик');
    say(c, 'Ясно');
    say(c, 'Отойти');
    expect(g.flag('job_hunt_erema')).toBe('active');
    g.apply([{ type: 'travel' }]);
    for (let t = 0; t < 10_500 && !r.onRoad; t += 50) r.tick(50);
    const t = r.world.travel!;
    expect(untilAlone(r, () => true, 50)).toBe(true);
    const erema: PartyState = { id: 'u_erema', tpl: 'erema', x: t.x + 0.3, y: t.y, path: [], members: ['erema'], hurt: 0, wait: 9999, think: 9999 };
    t.parties = [erema];
    c.do({ t: 'travel', x: Math.floor(t.x) + 1, y: Math.floor(t.y) });
    expect(until(r, () => r.meeting === 'u_erema', 10_000)).toBe(true);
    expect(c.last('dialogue')!.speaker).toBe('Водонос Ерёма');
    say(c, 'кисет и нож');
    say(c, '…');
    expect(g.count('erema_pouch')).toBe(1);
    expect(g.flag('gone_u_erema')).toBe(true);
    c.do({ t: 'travel', to: 'three_pillars' });
    expect(untilAlone(r, () => g.flag('at') === 'three_pillars')).toBe(true);
    talk(r, c, 'mytny', [24, 13]);
    const caps = g.state.caps;
    say(c, 'кисет и нож Ерёмы');
    say(c, '…');
    expect(g.state.caps).toBe(caps + 50);
    expect(g.flag('job_hunt_erema')).toBe('closed');
  });

  it('«Доска наград»: taking the jackal hunt puts the pack on the map; a thrown lizard buys a way past', () => {
    const { r, c, g } = inPillars();
    talk(r, c, 'board_pillars', [20, 23]);
    say(c, 'Вожак шакалов');
    say(c, 'Ясно');
    say(c, 'Отойти');
    g.apply([{ type: 'travel' }]);
    for (let t = 0; t < 10_500 && !r.onRoad; t += 50) r.tick(50);
    const tr = r.world.travel!;
    tr.parties = [];
    c.do({ t: 'travel', x: 17, y: 30 });
    expect(until(r, () => tr.parties!.some((p) => p.id === 'u_jackals'), 120_000)).toBe(true);
    const pack = tr.parties!.find((p) => p.id === 'u_jackals')!;
    expect(pack.members).toContain('jackal_leader');
    // meet it: a beast's talk
    tr.parties = [pack];
    Object.assign(pack, { x: tr.x + 0.3, y: tr.y, wait: 9999, think: 9999 });
    g.give('lizard');
    c.do({ t: 'travel', x: Math.floor(tr.x) + 1, y: Math.floor(tr.y) });
    expect(until(r, () => r.meeting === 'u_jackals', 10_000)).toBe(true);
    say(c, 'жареную ящерицу');
    say(c, '…');
    expect(g.count('lizard')).toBe(0);
    expect(r.fight).toBeNull();
    expect(g.flag('gone_u_jackals')).toBeFalsy(); // fed, not beaten: still out there
  });
});

