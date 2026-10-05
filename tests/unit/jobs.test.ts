// The contract board: take, count, hand in; the caravan ambush, Кривой, Хромой Жнец, the village and Сипуха.
import { describe, it, expect } from 'vitest';
import { room, until, type Client } from './rooms';

type R = ReturnType<typeof room>['r'];

function say(c: Client, text: string) {
  const d = c.last('dialogue')!;
  const i = d.options.findIndex((o) => o.includes(text));
  expect(i, `"${text}" in ${JSON.stringify(d.options)}`).toBeGreaterThanOrEqual(0);
  c.do({ t: 'choose', i });
}

function talk(r: R, c: Client, id: string, at: [number, number]) {
  const n = c.of('dialogue').length;
  c.do({ t: 'debug', op: { op: 'teleport', x: at[0], y: at[1] } });
  c.do({ t: 'interact', id });
  expect(until(r, () => c.of('dialogue').length > n), `talk to ${id}`).toBe(true);
}

function morning(r: R, c: Client, days = 1) {
  c.do({ t: 'debug', op: { op: 'teleport', x: 16, y: 29 } });
  for (let i = 0; i < days; i++) r.players.get(c.id)!.game.apply([{ type: 'rest' }]);
}

const BOARD: [number, number] = [16, 24];

describe('contracts', () => {
  it('a fetch job: take it, bring the goods, get paid; it comes back next morning', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    talk(r, c, 'board', BOARD);
    say(c, 'Взять: «Металлолом»');
    say(c, 'Ясно');
    expect(c.last('dialogue')!.options.some((o) => o.startsWith('Сдать'))).toBe(false);
    g.give('scrap', 5);
    const caps = g.state.caps;
    say(c, 'Отойти');
    talk(r, c, 'board', BOARD);
    say(c, 'Сдать: «Металлолом»');
    expect(g.state.caps).toBe(caps + 12);
    expect(g.count('scrap')).toBe(0);
    expect(r.world.flags.job_scrap).toBe('done');
    const firstXp = g.char.xp;
    morning(r, c);
    expect(r.world.flags.job_scrap).toBeFalsy();
    say(c, 'Хорошо');
    say(c, 'Отойти');
    talk(r, c, 'board', BOARD);
    say(c, 'Взять: «Металлолом»');
    say(c, 'Ясно');
    g.give('scrap', 5);
    say(c, 'Отойти');
    talk(r, c, 'board', BOARD);
    say(c, 'Сдать: «Металлолом»');
    expect(g.char.xp).toBe(firstXp); // daily income stays, repeat XP does not
  });

  it('a hunt counts kills of its kind: three from the burrow', () => {
    const { r, clients } = room();
    const [c] = clients;
    const p = r.players.get(c.id)!;
    morning(r, c);
    talk(r, c, 'board', BOARD);
    say(c, 'Взять: «Нора у скал»');
    for (const id of ['burrow_0', 'burrow_1']) r.jobKill(p, r.hostiles.byId(id)!);
    r.jobKill(p, r.hostiles.byId('scorp_road')!); // a scorpion, but not from the burrow
    expect(r.world.flags.job_burrow_n).toBe(2);
    say(c, 'Ясно');
    expect(c.last('dialogue')!.options.some((o) => o.includes('Сдать: «Нора'))).toBe(false);
    r.jobKill(p, r.hostiles.byId('burrow_2')!);
    say(c, 'Отойти');
    talk(r, c, 'board', BOARD);
    say(c, 'Сдать: «Нора у скал»');
    expect(p.game.flag('rep_circle')).toBe(2);
  });

  it('the caravan ambush: talked off, paid off, or fought', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    morning(r, c); // day 2: the caravan
    talk(r, c, 'board', BOARD);
    say(c, 'Взять: «Караван до поворота»');
    say(c, 'Ясно');
    say(c, 'Отойти');
    expect(until(r, () => r.npcs.get('raider_boss')?.mover.moving === false)).toBe(true);
    g.addCaps(40);
    talk(r, c, 'raider_boss', [5, 27]);
    say(c, 'Тридцать капель');
    say(c, '…');
    expect(r.world.flags).toMatchObject({ ambush_off: true, job_escort_n: 1 });
    expect(until(r, () => !r.npcs.has('raider_boss'))).toBe(true);
    talk(r, c, 'board', BOARD);
    say(c, 'Сдать: «Караван до поворота»');
    expect(g.flag('rep_guild')).toBe(5);
    say(c, 'Хорошо');
    say(c, 'Отойти');

    morning(r, c, 3); // day 5: the next caravan, a fight this time
    talk(r, c, 'board', BOARD);
    say(c, 'Взять: «Караван до поворота»');
    say(c, 'Ясно');
    say(c, 'Отойти');
    expect(until(r, () => r.npcs.get('raider_boss')?.mover.moving === false)).toBe(true);
    talk(r, c, 'raider_boss', [5, 27]);
    say(c, 'через мой труп');
    say(c, '…');
    expect(r.fight).not.toBeNull();
    expect(r.hostiles.group('raiders')).toHaveLength(3);
  });

  it('Бирюк with a sharp eye spots Сыч marking the packs, and the raiders turn on him', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    g.char.attrs.per = 8;
    morning(r, c);
    talk(r, c, 'board', BOARD);
    say(c, 'Взять: «Караван до поворота»');
    say(c, 'Ясно');
    say(c, 'Отойти');
    expect(until(r, () => r.npcs.get('birjuk')?.mover.moving === false)).toBe(true);
    talk(r, c, 'birjuk', [8, 26]);
    say(c, 'мелом метит');
    say(c, '…');
    say(c, 'Прощай');
    talk(r, c, 'raider_boss', [5, 27]);
    say(c, 'Вас навёл Сыч');
    say(c, '…');
    expect(r.world.flags).toMatchObject({ sych_exposed: true, ambush_off: true });
    expect(until(r, () => !r.npcs.has('sych'))).toBe(true);
  });

  it('Кривой: Marta can take him in, and the bounty pays in respect instead', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    morning(r, c);
    talk(r, c, 'board', BOARD);
    say(c, 'Взять: «Кривой»');
    say(c, 'Ясно');
    say(c, 'Отойти');
    expect(r.npcs.has('krivoy')).toBe(true);
    talk(r, c, 'krivoy', [10, 5]);
    say(c, 'Пойдём к Марте');
    say(c, '…');
    talk(r, c, 'marta', [15, 25]);
    say(c, 'Дай ему шанс');
    say(c, 'Спасибо, Марта');
    expect(r.npcs.has('krivoy')).toBe(false);
    expect(r.npcs.has('krivoy_village')).toBe(true);
    talk(r, c, 'board', BOARD);
    say(c, 'сторожит колодец');
    expect(g.flag('rep_circle')).toBe(5);
    expect(r.world.flags.job_krivoy).toBe('closed');
  });

  it('Хромой Жнец waits by the pickup from the third day, a lone hunt', () => {
    const { r, clients } = room();
    const [c] = clients;
    morning(r, c);
    expect(r.hostiles.byId('lame_reaper')).toBeUndefined();
    morning(r, c);
    const h = r.hostiles.byId('lame_reaper')!;
    expect(h.def.name).toBe('Хромой Жнец');
    talk(r, c, 'board', BOARD);
    say(c, 'Взять: «Хромой Жнец»');
    r.jobKill(r.players.get(c.id)!, h);
    expect(r.world.flags.job_lame_n).toBe(1);
  });

  it('the village turns on Сипуха; driving her off costs a child a bad night', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    morning(r, c, 6); // day 7: her second visit
    expect(g.flag('sipuha_here')).toBe(true);
    talk(r, c, 'marta', [15, 25]);
    expect(c.last('dialogue')!.text).toMatch(/Коряга/);
    say(c, 'Пусть уходит');
    say(c, '…');
    expect(g.flag('rep_dry')).toBe(-20);
    expect(until(r, () => !r.npcs.has('sipuha'))).toBe(true);
    talk(r, c, 'marta', [15, 25]);
    expect(c.last('dialogue')!.text).toMatch(/ужалил/);
  });
});
