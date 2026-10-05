import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';
import { slidesFor } from '../../src/core/endings';
import { room, until } from './rooms';
import { say, talk } from './story';

function setup(map = 'rocket_outpost') {
  const { r, clients } = room();
  const c = clients[0];
  const g = r.players.get(c.id)!.game;
  g.setFlag('chapter5_done', true);
  g.setFlag('day', 12);
  g.rng = () => 0.01;
  r.goTo(map);
  return { r, c, g };
}

describe('one Rocket, one sanctuary', () => {
  it('admits a disarmed pilgrim, rewards the audience once and permits departure with all gear', () => {
    const s = setup();
    const { r, c, g } = s;
    g.give('knife');
    const knives = g.count('knife');
    talk(r, c, 'rocket_psar', [11, 17]);
    say(c, 'Сдать вещи');
    expect(g.count('knife')).toBe(0);
    expect(g.state.rocketEscrow?.knife).toBe(knives);
    expect(g.flag('rocket_gate_open')).toBe(true);
    say(c, 'Войти.');
    talk(r, c, 'rocket_hatch', [14, 8]);
    say(c, 'Спуститься.');
    expect(until(r, () => r.map.id === 'rocket_tunnel')).toBe(true);
    talk(r, c, 'rocket_gallery', [8, 6]);
    say(c, 'Сравнить изображения.');
    expect(g.flag('rocket_same_dog')).toBe(true);
    r.goTo('rocket_palace');
    talk(r, c, 'rocket_dog_actor', [16, 10]);
    say(c, 'важно никому');
    say(c, 'принять её взгляд');
    expect(g.flag('rocket_friend')).toBe(true);
    expect(g.count('knife')).toBe(knives);
    expect(g.state.rocketEscrow).toBeUndefined();
    expect([g.count('rocket_collar'), g.count('rocket_fang'), g.count('rocket_water')]).toEqual([1, 1, 3]);
    say(c, 'Идти к Хранителю');
    talk(r, c, 'rocket_dog_actor', [16, 10]);
    expect(c.last('dialogue')!.options.some((o) => o.includes('принять её взгляд'))).toBe(false);
    r.goTo('rusty_well');
    expect(g.state.rocketEscrow).toBeUndefined();
    expect(g.count('knife')).toBe(knives);
  });

  it.each(['closed', 'shared', 'sold'] as const)('records %s as a distinct one-time peaceful outcome', (fate) => {
    const { r, c, g } = setup('rocket_sanctuary');
    g.setFlag('rocket_friend', true);
    talk(r, c, 'rocket_bowl_keeper', [19, 12]);
    say(c, fate === 'closed' ? 'Сохранить Обитель' : fate === 'shared' ? 'Открыть соседям' : 'Продать сведения');
    if (fate === 'sold') say(c, 'Передать сведения Тресту');
    expect(g.flag('rocket_fate')).toBe(fate);
    expect(g.stage('rocket')).toBe('done');
    expect(slidesFor(g, CONTENT.endings).find((slide) => slide.id === 'rocket')).toBeDefined();
  });

  it('starts hostilities only after a final, visible choice; the dog is never a combat unit', () => {
    const { r, c, g } = setup();
    talk(r, c, 'rocket_psar', [11, 17]);
    say(c, 'Прорваться');
    expect(g.flag('rocket_blasphemer')).toBeUndefined();
    say(c, 'Начать прорыв');
    expect(g.flag('rocket_blasphemer')).toBeUndefined();
    say(c, '…');
    expect(g.flag('rocket_blasphemer')).toBe(true);
    expect(r.hostiles.byId('rocket_psar')).toBeDefined();
    r.goTo('rocket_palace');
    expect(r.hostiles.byId('rocket_dog_actor')).toBeUndefined();
    expect(r.npcs.has('rocket_dog_actor')).toBe(false);
  });

  it('has a destructive outcome and a finite, unsellable daily refill', () => {
    const s = setup('rocket_sanctuary');
    const { r, c, g } = s;
    g.setFlag('rocket_friend', true);
    g.give('canteen');
    const emptyBefore = g.count('canteen');
    talk(r, c, 'rocket_fountain', [15, 14]);
    say(c, 'Наполнить одну');
    expect(g.count('canteen')).toBe(emptyBefore - 1);
    expect(g.count('rocket_water')).toBe(1);
    expect(CONTENT.items.rocket_water.value).toBe(0);
    say(c, 'Отойти.');
    g.give('canteen');
    talk(r, c, 'rocket_fountain', [15, 14]);
    expect(c.last('dialogue')!.options.some((o) => o.includes('Наполнить одну'))).toBe(false);
    say(c, 'Повредить очиститель');
    say(c, 'Разбить щиток');
    expect(g.flag('rocket_fate')).toBe('broken');
    expect(g.flag('rocket_blasphemer')).toBeUndefined();
    say(c, '…');
    expect(g.flag('rocket_blasphemer')).toBe(true);
    expect(slidesFor(g, CONTENT.endings).find((slide) => slide.id === 'rocket')).toBeDefined();
  });
});
