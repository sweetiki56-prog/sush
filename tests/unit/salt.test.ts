// Chapter IV «Соль» (stage K) in the real room: the engine pieces (the burrowing snake, bouts with weapons), the
// Guild's gate, trust and caravan, the ambush in the salt storm, the reckoning with Крупица, the guide to Кристалл,
// and every ending of the seven side quests; then the balance of the chapter's fights.
import { describe, it, expect } from 'vitest';
import { Combat } from '../../src/core/combat/Combat';
import { creatureUnit, playerUnit } from '../../src/core/combat/build';
import { Game } from '../../src/core/Game';
import { newState, plainCharacter } from '../../src/core/state';
import { fixedRng } from '../../src/core/rng';
import type { PartyState } from '../../src/core/travel/Parties';
import { CONTENT } from '../../src/content';
import { room, until, TOWNS } from './rooms';
import { arm, placedBattle, premadeGame, roadBattle, toLevel } from './sim';
import { say, talk, winFight } from './story';

const W = CONTENT.weapons;
const env = (rolls: number[]) => ({ width: 20, height: 20, rng: fixedRng(rolls), blocked: () => false, opaque: () => false, ammo: () => 30, spendAmmo: () => {} });

function hero(id: string, x: number, y: number, hp: number, weapon = 'rifle') {
  const g = new Game(CONTENT, fixedRng([0.5]), newState({ ...plainCharacter(['guns', 'melee', 'sneak']) }, CONTENT));
  g.give(weapon);
  g.equip('weapon', weapon);
  const u = playerUnit(g, x, y, id);
  u.hp = u.maxHp = hp;
  return u;
}

describe('a burrower', () => {
  const snake = () => ({ ...creatureUnit(CONTENT.creatures.scorpion, 'snake', 10, 10), burrow: true, seq: 1 });

  it('dives after a turn up, cannot be hit under the salt, and comes up beside the sturdiest foe', () => {
    const s = snake();
    const weak = hero('weak', 3, 3, 10);
    const tough = hero('tough', 15, 15, 40);
    const c = new Combat([weak, tough, s], W, env([0.5]));
    c.start();
    for (let i = 0; i < 6 && !s.under; i++) c.endTurn();
    expect(s.under).toBe(true);
    expect(c.preview(weak, s).reason).toContain('под соль');
    // on its next turn it comes up next to the one with the most health, and stays up through the heroes' turns
    for (let i = 0; i < 6 && s.under; i++) c.endTurn();
    expect(s.under).toBe(false);
    expect(Math.max(Math.abs(s.x - tough.x), Math.abs(s.y - tough.y))).toBe(1);
    for (let i = 0; i < 2 && c.current.id !== 'snake'; i++) c.endTurn();
    expect(s.under).toBe(false);
  });

  it('a burst or a blast drives it up, dazed', () => {
    const s = snake();
    const h = hero('h', 10, 12, 30, 'rattler');
    const c = new Combat([h, s], W, env([0.5]));
    c.start();
    s.under = true;
    while (c.current.id !== 'h') c.endTurn();
    const ev = c.attack('snake');
    expect(ev.some((e) => e.t === 'surface')).toBe(true);
    expect(s.under).toBe(false);
    expect(s.stunned).toBeGreaterThan(0);
  });
});

/** After Chapter III: the tube in the bag, the forgery kept, money, sharp eyes; every roll lands. */
function setup(patch: (g: Game) => void = () => {}) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const [k, v] of [['chapter1_seen', true], ['chapter1_done', true], ['trust_outcome', 'tax'], ['chapter2_done', true], ['chapter2_seen', true], ['chapter3_done', true], ['chapter3_seen', true], ['forgery_fate', 'kept'], ['day', 14]] as const) g.setFlag(k, v);
  g.give('tube');
  g.char.attrs.per = 8;
  g.state.caps = 1500;
  g.rng = () => 0.01;
  patch(g);
  r.goTo('salt_market');
  return { r, c, g };
}
type S = ReturnType<typeof setup>;
/** Close whatever talk is open by its last answer (the way out), then walk up to someone new. */
function done(s: S) {
  for (let n = 0; n < 6 && s.r.players.get(s.c.id)!.talk; n++) s.c.do({ t: 'choose', i: s.c.last('dialogue')!.options.length - 1 });
}
const meet = (s: S, id: string, from: [number, number]) => {
  done(s);
  talk(s.r, s.c, id, from);
};
const go = (s: S, map: string, entry?: string) => {
  s.r.goTo(map, entry);
  for (const h of s.r.hostiles.list) if (['spiders', 'wreck_spiders'].includes(h.group)) h.dead = true;
};

/** Into the Guild yard for the fee. */
function yard(s: S) {
  go(s, 'salt_guild');
  meet(s, 'gatekeeper', [19, 27]);
  say(s.c, 'Вот взнос');
  say(s.c, 'Пройти');
  return s;
}

/** Крупица met; the Guild trusts the hero by a paid share. */
function trusted(s: S) {
  yard(s);
  meet(s, 'krupitsa', [10, 9]);
  say(s.c, 'путь через Соляное море');
  say(s.c, 'Куплю пай');
  expect(s.g.flag('guild_trust')).toBe('share');
  expect(s.g.stage('salt')).toBe('caravan');
  return s;
}

/** A bout on the arena: talk to Барыш, step into the pit, win, take the prize. */
function bout(s: S, pick: string) {
  meet(s, 'barysh', [10, 15]);
  say(s.c, pick);
  say(s.c, 'В яму');
  expect(until(s.r, () => !!s.r.fight, 10_000), 'the bout starts').toBe(true);
  winFight(s.r, s.c);
  expect(s.g.flag('ring_result')).toBe('won');
  meet(s, 'barysh', [10, 15]);
  say(s.c, '…');
  done(s);
}

describe('Chapter IV: Соль and the Guild', () => {
  it('arriving at the gate of Соль starts the chapter; the yard opens for the fee', () => {
    const s = setup();
    expect(s.g.stage('salt')).toBe('guild');
    yard(s);
    expect(s.g.flag('guild_way')).toBe('fee');
    expect(s.g.flag('open_guild_gate_a')).toBe(true);
  });

  it('the yard opens on Бирюк\'s word, the arena\'s, a favour, or a tale of the Mandate', () => {
    for (const [patch, answer, way] of [
      [(g: Game) => g.setFlag('semyon_friend'), 'Бирюк', 'letter'],
      [(g: Game) => g.setFlag('arena_1'), 'Барыш', 'arena'],
      [(g: Game) => g.setFlag('salt_smuggle', 'guild'), 'Мешки Хруста', 'favor'],
      [() => {}, 'Дело о Мандате', 'talk'],
    ] as const) {
      const s = setup(patch);
      go(s, 'salt_guild');
      meet(s, 'gatekeeper', [19, 27]);
      say(s.c, answer);
      expect(s.g.flag('guild_way')).toBe(way);
    }
  });

  it('Крупица trusts a good word, the more so with the forgery kept', () => {
    const s = setup();
    yard(s);
    meet(s, 'krupitsa', [10, 9]);
    expect(s.g.flag('krupitsa_met')).toBe(true);
    expect(s.g.flag('mines_known')).toBe(true);
    say(s.c, 'путь через Соляное море');
    say(s.c, 'Улика подделки у меня');
    expect(s.g.flag('guild_trust')).toBe('talk');
  });

  it('she hires the hero for the caravan and asks too much about the nights: caught, the ambush is off', () => {
    const s = trusted(setup());
    say(s.c, 'Зачем гильдмейстеру');
    expect(s.g.flag('ambush_done')).toBe('caught');
    expect(s.g.flag('ambush_off')).toBe(true);
    expect(s.g.flag('krupitsa_fate')).toBe('debt');
    expect(s.g.flag('sea_caravan')).toBe('ready');
    expect(s.g.stage('salt')).toBe('crystal');
  });

  it('Шёпот\'s warning unmasks her just as well', () => {
    const s = setup((g) => g.setFlag('whisper_warned'));
    trusted(s);
    say(s.c, 'Шёпот видела');
    expect(s.g.flag('ambush_done')).toBe('caught');
  });
});

describe('Chapter IV: the caravan and the storm', () => {
  /** Hired and out on the road at Соль; the Guild caravan stands at the gate. */
  function out(patch: (g: Game) => void = () => {}) {
    const s = trusted(setup(patch));
    say(s.c, 'У вешек');
    expect(s.g.flag('krupitsa_sold')).toBe(true);
    done(s);
    s.g.apply([{ type: 'travel' }]);
    const t = s.r.world.travel!;
    expect(t.parties!.some((p) => p.id === 'u_sea_caravan')).toBe(true);
    return { ...s, t };
  }

  it('the caravan takes the hero on as its guard; a storm rises over the sea road', () => {
    const s = out();
    s.c.do({ t: 'travel', x: 76, y: 57 }); // meetings happen on the move
    expect(until(s.r, () => !!s.r.meeting, 5000)).toBe(true);
    say(s.c, 'За караваном от самых ворот');
    expect(s.g.flag('ambush_seen')).toBe(true);
    say(s.c, 'Идём');
    expect(s.g.flag('sea_caravan')).toBe('go');
    expect(s.t.escort).toMatchObject({ party: 'u_sea_caravan', to: 'wrecks' });
    s.r.sendTravel(true);
    expect(s.c.last('travel')!.storms).toEqual([[79, 57, 89, 64]]);
  });

  const hunters = (x: number, y: number): PartyState => ({ id: 'u_hunters', tpl: 'trust_hunters', x, y, path: [], members: ['trust_hunter', 'trust_hunter', 'trust_hunter'], hurt: 0, wait: 9999, think: 9999, chasing: 'hero' });

  it('seen coming, the hunters talk: bought off, they leave the order and the funnel shows', () => {
    const s = out((g) => g.setFlag('ambush_seen'));
    s.g.setFlag('sea_caravan', 'go');
    Object.assign(s.t, { x: 84.5, y: 60.5, parties: [hunters(84.8, 60.5)] });
    s.c.do({ t: 'travel', x: 86, y: 61 });
    expect(until(s.r, () => !!s.r.meeting, 5000)).toBe(true);
    expect(s.c.last('dialogue')!.text).toContain('засада не удалась');
    say(s.c, 'Сколько вам заплатил Трест');
    expect(s.g.flag('ambush_done')).toBe('bought');
    expect(s.g.count('hunt_order')).toBe(1);
    expect(s.g.flag('lair_known')).toBe(true);
    expect(s.g.stage('salt')).toBe('krupitsa');
  });

  it('the forgery makes them doubt; a slip into the storm loses them', () => {
    const s = out((g) => g.setFlag('ambush_seen'));
    s.g.give('forgery_proof');
    s.g.setFlag('sea_caravan', 'go');
    Object.assign(s.t, { x: 84.5, y: 60.5, parties: [hunters(84.8, 60.5)] });
    s.c.do({ t: 'travel', x: 86, y: 61 });
    until(s.r, () => !!s.r.meeting, 5000);
    say(s.c, 'копия мандата Затвора');
    expect(s.g.flag('ambush_done')).toBe('bought');
    const t = out((g) => g.setFlag('ambush_seen'));
    t.g.setFlag('sea_caravan', 'go');
    Object.assign(t.t, { x: 84.5, y: 60.5, parties: [hunters(84.8, 60.5)] });
    t.c.do({ t: 'travel', x: 86, y: 61 });
    until(t.r, () => !!t.r.meeting, 5000);
    say(t.c, 'Уйти в бурю');
    expect(t.g.flag('ambush_done')).toBe('slipped');
  });

  it('fought off on the salt: the order is in the leader\'s coat', () => {
    const s = out((g) => g.setFlag('ambush_seen'));
    s.g.setFlag('sea_caravan', 'go');
    Object.assign(s.t, { x: 84.5, y: 60.5, parties: [hunters(84.8, 60.5)] });
    s.c.do({ t: 'travel', x: 86, y: 61 });
    until(s.r, () => !!s.r.meeting, 5000);
    say(s.c, 'Попробуйте взять');
    say(s.c, '…');
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    expect(s.r.map.id).toBe('enc_salt');
    winFight(s.r, s.c);
    until(s.r, () => !!s.r.pile, 5000);
    s.c.do({ t: 'take' });
    s.c.do({ t: 'lootDone' });
    expect(until(s.r, () => s.g.flag('ambush_done') === 'fought', 20_000)).toBe(true);
    expect(s.g.count('hunt_order')).toBe(1);
  });
});

describe('Chapter IV: the reckoning and the way to Кристалл', () => {
  /** Back from the storm with the hunters' order. */
  function back(order = true) {
    const s = trusted(setup());
    say(s.c, 'У вешек');
    s.g.apply([{ type: 'flag', key: 'ambush_done', value: 'fought' }, { type: 'quest', quest: 'salt', stage: 'krupitsa' }]);
    if (order) s.g.give('hunt_order');
    s.r.goTo('salt_guild');
    meet(s, 'krupitsa', [10, 9]);
    return s;
  }

  it('with the order she confesses and owes the hero', () => {
    const s = back();
    say(s.c, 'Вот приказ Треста');
    say(s.c, 'Будешь должна');
    expect(s.g.flag('krupitsa_fate')).toBe('debt');
    expect(s.g.stage('salt')).toBe('crystal');
  });

  it('told to the whole Guild, she runs to the Trust', () => {
    const s = back(false);
    say(s.c, 'расскажу Гильдии');
    expect(s.g.flag('krupitsa_fate')).toBe('fled');
    expect(s.g.flag('trust_knows_route')).toBe(true);
    s.r.goTo('salt_guild');
    expect(s.r.npcs.has('krupitsa')).toBe(false);
  });

  it('a fight in the yard: Крупица and her guards fall', () => {
    const s = back();
    say(s.c, 'Защищайся');
    say(s.c, '…');
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    winFight(s.r, s.c);
    expect(until(s.r, () => s.g.flag('krupitsa_fate') === 'dead', 20_000)).toBe(true);
  });

  it('Кристалл: no way without a Солевик guide; with one the chapter ends', () => {
    const s = setup();
    s.g.apply([{ type: 'travel' }]);
    const t = s.r.world.travel!;
    Object.assign(t, { x: 103.5, y: 53.5, parties: [] });
    s.c.do({ t: 'travel', to: 'crystal' });
    until(s.r, () => t.path.length === 0 && !t.target, 20_000);
    expect(s.g.state.log.some((l) => l.includes('Без проводника'))).toBe(true);
    s.g.setFlag('crystal_guide', 'captain');
    s.g.setFlag('krupitsa_fate', 'debt');
    s.g.setStage('salt', 'crystal');
    t.parties = [];
    s.c.do({ t: 'travel', x: 101, y: 53 });
    until(s.r, () => t.path.length === 0, 20_000);
    s.c.do({ t: 'travel', to: 'crystal' });
    expect(until(s.r, () => s.g.flag('chapter4_done') === true, 30_000)).toBe(true);
    expect(s.g.stage('salt')).toBe('done');
  });
});

describe('«Последний бой»: the arena of Соль', () => {
  it('three bouts with weapons where nobody dies, then Молчун beaten to the sand: he is free', () => {
    const s = setup((g) => arm(g, 'machete'));
    go(s, 'salt_arena');
    bout(s, 'против Сизого');
    expect(s.g.flag('arena_1')).toBe(true);
    expect(s.g.flag('ring_result')).toBe(false);
    bout(s, 'против Кочерги');
    bout(s, 'против братьев Жмых');
    expect(s.g.flag('arena_3')).toBe(true);
    expect(s.r.npcs.has('molchun')).toBe(true);
    bout(s, 'За цепь');
    expect(s.g.flag('last_bout')).toBe('spared');
    expect(s.g.flag('vyun_free')).toBe(true);
    expect(s.g.flag('whisper_warned')).toBe(true);
    expect(s.g.state.hp).toBeGreaterThan(0);
  });

  it('a bout lost is only a bruise', () => {
    const s = setup();
    go(s, 'salt_arena');
    meet(s, 'barysh', [10, 15]);
    say(s.c, 'против Сизого');
    say(s.c, 'В яму');
    until(s.r, () => !!s.r.fight, 10_000);
    const me = s.r.fight!.combat.unit(s.c.id)!;
    me.hp = 1;
    for (let n = 0; n < 200 && s.r.fight; n++) {
      s.c.ack();
      if (s.r.fight?.combat.current.id === s.c.id) s.c.do({ t: 'endTurn' });
    }
    expect(s.g.flag('ring_result')).toBe('lost');
    expect(s.g.state.hp).toBeGreaterThanOrEqual(1);
    meet(s, 'barysh', [10, 15]);
    say(s.c, '…');
    expect(s.g.flag('arena_1')).toBeUndefined();
  });

  it('Шёпот\'s brother: seen under the mask, told, and talked out of it', () => {
    const s = setup();
    go(s, 'salt_arena');
    meet(s, 'shepot', [21, 10]);
    say(s.c, 'Узнаю');
    meet(s, 'molchun_cage', [28, 17]);
    say(s.c, 'Под ремнём маски');
    expect(s.g.flag('vyun_known')).toBe(true);
    say(s.c, 'Отойти');
    meet(s, 'shepot', [21, 10]);
    say(s.c, 'твой брат');
    expect(s.g.count('whisper_token')).toBe(1);
    say(s.c, 'Отойти');
    meet(s, 'molchun_cage', [28, 17]);
    say(s.c, 'Шёпот ждёт тебя');
    expect(s.g.flag('last_bout')).toBe('talked');
  });

  it('bought out of his bill of sale; or killed in a blood bout, and Шёпот leaves', () => {
    const s = setup();
    s.g.setFlag('whisper_asked');
    s.g.setFlag('arena_1');
    go(s, 'salt_arena');
    meet(s, 'barysh', [10, 15]);
    say(s.c, 'Откуда у вас Молчун');
    say(s.c, 'Отойти');
    meet(s, 'barysh', [10, 15]);
    say(s.c, 'Купить купчую');
    expect(s.g.flag('last_bout')).toBe('bought');
    expect(s.g.count('bout_contract')).toBe(1);

    const b = setup();
    for (const k of ['arena_1', 'arena_2', 'arena_3']) b.g.setFlag(k);
    go(b, 'salt_arena');
    meet(b, 'barysh', [10, 15]);
    say(b.c, 'Насмерть');
    say(b.c, '…');
    b.r.goTo('salt_arena');
    meet(b, 'molchun_blood', [13, 15]);
    say(b.c, 'Начнём');
    expect(until(b.r, () => !!b.r.fight, 10_000)).toBe(true);
    winFight(b.r, b.c);
    expect(until(b.r, () => b.g.flag('last_bout') === 'killed', 20_000)).toBe(true);
    expect(b.g.flag('whisper_enemy')).toBe(true);
  });
});

describe('the side quests of Соль', () => {
  it('«Невеста для Солевика»: helped away, or taken home for the money, or freed by her father', () => {
    const s = setup();
    meet(s, 'efrem', [10, 27]);
    say(s.c, 'Найду');
    go(s, 'salt_mines');
    meet(s, 'lada', [34, 29]);
    say(s.c, 'Уходите в Кристалл');
    expect(s.g.flag('salt_bride')).toBe('fled');
    expect(s.g.flag('crystal_guide')).toBe('sol');

    const h = setup();
    meet(h, 'efrem', [10, 27]);
    say(h.c, 'Найду');
    go(h, 'salt_mines');
    meet(h, 'lada', [34, 29]);
    say(h.c, 'Отец ждёт');
    h.r.goTo('salt_market');
    const caps = h.g.state.caps;
    meet(h, 'efrem', [10, 27]);
    expect(h.g.state.caps).toBe(caps + 150);
    expect(h.g.flag('salt_bride')).toBe('returned');

    const f = setup();
    meet(f, 'efrem', [10, 27]);
    say(f.c, 'Найду');
    go(f, 'salt_mines');
    meet(f, 'lada', [34, 29]);
    say(f.c, 'поговорю с отцом');
    f.r.goTo('salt_market');
    meet(f, 'efrem', [10, 27]);
    say(f.c, 'Лада ушла сама');
    expect(f.g.flag('salt_bride')).toBe('freed');
    expect(f.g.flag('crystal_guide')).toBe('sol');
  });

  it('«Соляные долги»: the book shows doubled debts and the sixth seal; four endings', () => {
    const book = (s: S) => {
      go(s, 'salt_mines');
      meet(s, 'plast', [8, 20]);
      say(s.c, 'Кто пишет');
      yard(s);
      meet(s, 'merka', [28, 8]);
      say(s.c, 'Покажите книгу');
      expect(s.g.count('debt_book')).toBe(1);
      expect(s.g.flag('seal_mark_6')).toBe(true);
      expect(s.g.stage('salt_debts')).toBe('truth');
      say(s.c, 'Отойти');
      return s;
    };
    const e = book(setup());
    meet(e, 'krupitsa', [10, 9]);
    say(e.c, 'Что обо мне');
    say(e.c, 'Мне нужен путь');
    say(e.c, 'Подумаю');
    meet(e, 'krupitsa', [10, 9]);
    say(e.c, 'Мерка подделывает');
    expect(e.g.flag('salt_debts')).toBe('exposed');
    expect(e.g.flag('crystal_guide')).toBe('debtor');

    const b = setup();
    go(b, 'salt_mines');
    meet(b, 'plast', [8, 20]);
    say(b.c, 'Кто пишет');
    meet(b, 'klesch', [11, 6]);
    say(b.c, 'Выкупить');
    say(b.c, 'Вот сто пятьдесят');
    expect(b.g.flag('salt_debts')).toBe('bought');

    const x = book(setup());
    go(x, 'salt_mines');
    meet(x, 'plast', [8, 20]);
    say(x.c, 'Сжечь');
    expect(x.g.flag('salt_debts')).toBe('burned');
    expect(x.g.flag('guild_suspicious')).toBe(true);

    const q = book(setup());
    meet(q, 'merka', [28, 8]);
    say(q.c, 'Договорились');
    expect(q.g.flag('salt_debts')).toBe('silent');
    expect(q.g.count('debt_book')).toBe(0);
  });

  it('«Контрабанда соли»: past the scales to «Жажда», or to the Guild, dumped, or tracked', () => {
    const start = () => {
      const s = setup();
      meet(s, 'khrust', [26, 23]);
      say(s.c, 'Возьмусь');
      return s;
    };
    const d = start();
    meet(d, 'weigher', [16, 19]);
    say(d.c, 'Пройти, пока');
    expect(d.g.flag('scales_passed')).toBe(true);
    meet(d, 'ukho', [31, 28]);
    say(d.c, 'Вот мешки');
    expect(d.g.flag('salt_smuggle')).toBe('delivered');

    const gd = start();
    meet(gd, 'weigher', [16, 19]);
    say(gd.c, 'Мешки — от Хруста');
    expect(gd.g.flag('salt_smuggle')).toBe('guild');

    const du = start();
    meet(du, 'ukho', [31, 28]);
    say(du.c, 'посмотрим, что в мешках');
    say(du.c, 'Высыпать');
    expect(du.g.flag('salt_smuggle')).toBe('dumped');

    const tr = start();
    meet(tr, 'weigher', [16, 19]);
    say(tr.c, 'Двадцать капель');
    meet(tr, 'ukho', [31, 28]);
    say(tr.c, 'посмотрим, что в мешках');
    say(tr.c, 'Подменить');
    expect(tr.g.flag('salt_smuggle')).toBe('tracked');
    expect(tr.g.flag('mogilnik_hint')).toBe(true);
    expect(tr.g.count('sukhovey_vial')).toBe(1);
  });

  it('«Счёт на соли»: the tube left overnight comes back a fake unless the seal is checked', () => {
    const run = (check: boolean) => {
      const s = setup((g) => {
        if (!check) g.rng = () => 0.99;
      });
      yard(s);
      meet(s, 'krupitsa', [10, 9]);
      say(s.c, 'Что обо мне');
      say(s.c, 'сколько соли стоит');
      say(s.c, 'По рукам');
      expect(s.g.count('tube')).toBe(0);
      say(s.c, '…');
      say(s.c, 'У вешек');
      meet(s, 'krupitsa', [10, 9]);
      say(s.c, 'Проверить печать');
      return s;
    };
    const ok = run(true);
    expect(ok.g.flag('salt_share')).toBe('checked');
    expect(ok.g.flag('tube_fake')).toBeUndefined();
    expect(ok.g.count('tube')).toBe(1);
    const fake = run(false);
    expect(fake.g.flag('salt_share')).toBe('faked');
    expect(fake.g.flag('tube_fake')).toBe(true);
  });
});

describe('the Salt sea', () => {
  const sea = (patch: (g: Game) => void = () => {}) => {
    const s = setup(patch);
    go(s, 'sea_wrecks');
    return s;
  };

  it('«Бархан ушёл»: led along the hull, dug out, or the spiders fought; Тамара gives the map', () => {
    for (const [patch, answer, how] of [
      [() => {}, 'Выведу вас', 'led'],
      [(g: Game) => (g.char.attrs.str = 9), 'Своротить люк', 'dug'],
      [(g: Game) => g.setFlag('wreck_spiders_dead'), 'Пауки перебиты', 'fought'],
    ] as const) {
      const s = sea(patch);
      meet(s, 'hold_hatch', [25, 27]);
      say(s.c, answer);
      expect(s.g.flag('barkhan')).toBe(how);
      expect(s.g.flag('lair_known')).toBe(true);
    }
    const t = sea();
    t.g.setFlag('barkhan', 'led');
    t.r.goTo('sea_wrecks');
    meet(t, 'tamara', [23, 28]);
    expect(t.g.count('leather_map')).toBe(1);
  });

  it('«Капитан на мели»: sailed home, then the radio given; or the radio stolen', () => {
    const s = sea();
    meet(s, 'baken', [12, 10]);
    say(s.c, 'Есть, капитан');
    expect(s.g.flag('captain')).toBe('sailed');
    expect(s.g.flag('crystal_guide')).toBe('captain');
    say(s.c, 'А рация');
    say(s.c, 'Отдай его мне');
    expect(s.g.flag('captain')).toBe('both');
    expect(s.g.count('whisper_radio')).toBe(1);

    const r = sea();
    meet(r, 'radio', [16, 7]);
    say(r.c, 'Забрать рацию');
    expect(r.g.flag('captain')).toBe('radio');
    expect(r.g.count('whisper_radio')).toBe(1);
  });

  it('the snake\'s lair opens once someone shows the way; the snake yields its scales', () => {
    const s = sea();
    expect(s.r.map.exits!.find((e) => e.id === 'funnel')!.if).toEqual([{ flag: 'lair_known' }]);
    s.g.setFlag('lair_known');
    go(s, 'sea_lair');
    s.c.do({ t: 'debug', op: { op: 'teleport', x: 15, y: 15 } });
    s.c.do({ t: 'engage', id: 'snake' });
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    winFight(s.r, s.c);
    expect(until(s.r, () => s.g.flag('snake_dead') === true, 20_000)).toBe(true);
    expect(s.g.count('snake_scale')).toBe(1);
  });
});

describe('Chapter IV balance', () => {
  const RUNS = 200;
  const titles = ['Стрелок', 'Механик', 'Говорун'];
  const rate = (f: (g: Game) => string) => {
    const out: Record<string, number> = {};
    for (const t of titles) {
      let w = 0;
      for (let s = 1; s <= RUNS; s++) if (f(premadeGame(t, s * 7919)) === 'victory') w++;
      out[t] = w / RUNS;
    }
    return out;
  };
  const pit = TOWNS.salt_arena;
  // Chapter IV comes at level 5; the helpers prepare the target level explicitly.
  const lvl5 = (g: Game) => toLevel(g, 5);
  const lvl5r = (g: Game) => toLevel(g, 5);

  it('the arena ladder is a fighter\'s way; the talker has others', () => {
    const r = {
      first: rate((g) => placedBattle(lvl5(g), pit, [12, 15], [['pit_1', 15, 15]])),
      brothers: rate((g) => placedBattle(lvl5(g), pit, [12, 15], [['pit_3', 16, 14], ['pit_3', 16, 16]])),
      molchun: rate((g) => placedBattle(lvl5(g), pit, [12, 15], [['molchun', 16, 15]])),
    };
    process.stderr.write(`Chapter IV arena, level 5: ${JSON.stringify(r)}\n`);
    expect(r.first['Стрелок']).toBeGreaterThanOrEqual(0.85);
    expect(r.molchun['Стрелок']).toBeGreaterThanOrEqual(0.3);
    expect(r.molchun['Говорун']).toBeLessThanOrEqual(0.5);
  });

  it('the hunters in the storm: a real fight with the caravan\'s guards; the snake is hard without a rattle', () => {
    const r = {
      hunters: rate((g) => roadBattle(lvl5r(g), ['trust_hunter', 'trust_hunter', 'trust_hunter'], 'enc_salt', ['caravan_guard', 'caravan_guard'], 4)),
      spiders: rate((g) => roadBattle(lvl5r(g), ['salt_spider', 'salt_spider', 'salt_spider'], 'enc_salt', [], 4)),
      snake: rate((g) => roadBattle(lvl5r(g), ['salt_snake'], 'enc_salt', [], 4)),
      snakeRattle: rate((g) => roadBattle(lvl5r(arm(g, 'rattler')), ['salt_snake'], 'enc_salt', [], 4)),
    };
    process.stderr.write(`Chapter IV road, level 5: ${JSON.stringify(r)}\n`);
    expect(r.hunters['Стрелок']).toBeGreaterThanOrEqual(0.5);
    expect(r.spiders['Стрелок']).toBeGreaterThanOrEqual(0.7);
    expect(r.snake['Стрелок']).toBeLessThanOrEqual(0.6);
    expect(r.snakeRattle['Стрелок']).toBeGreaterThan(r.snake['Стрелок']);
    expect(r.snakeRattle['Стрелок']).toBeGreaterThanOrEqual(0.25);
  });
});
