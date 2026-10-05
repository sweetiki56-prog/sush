import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';
import { slidesFor } from '../../src/core/endings';
import { room } from './rooms';
import { say, talk } from './story';

describe('Sanctuary record at Zaslon', () => {
  it('unlocks the service switch at Repair 55 without becoming trial evidence', () => {
    const { r, clients } = room();
    const c = clients[0];
    const g = r.players.get(c.id)!.game;
    for (let n = 1; n <= 8; n++) g.setFlag(`chapter${n}_done`, true);
    while (g.skill('repair') < 55) g.char.spent.repair = (g.char.spent.repair ?? 0) + 1;
    expect(g.skill('repair')).toBeLessThan(70);
    g.setFlag('rocket_bypass_known', true);
    r.goTo('dam_machines');
    talk(r, c, 'sentry_panel', [33, 23]);
    say(c, 'По записи Обители найти');
    expect(g.flag('sentries_off')).toBe(true);
    expect(g.flag('machines_way')).toBe('off');
    expect(g.flag('evidence') ?? 0).toBe(0);
  });

  it('selects only one Sanctuary slide and keeps the main ending choice separate', () => {
    const { r, clients } = room();
    const g = r.players.get(clients[0].id)!.game;
    g.setFlag('rocket_fate', 'shared');
    g.setFlag('ending', 'flood');
    const shared = slidesFor(g, CONTENT.endings).filter((s) => s.id === 'rocket');
    expect(shared).toHaveLength(1);
    expect(shared[0].text).toContain('беженцев');
    g.setFlag('rocket_fate', 'closed');
    const closed = slidesFor(g, CONTENT.endings).filter((s) => s.id === 'rocket');
    expect(closed).toHaveLength(1);
    expect(closed[0].text).not.toContain('беженцев');
    expect(g.flag('ending')).toBe('flood');
    g.setFlag('rocket_fate', 'sold');
    g.setFlag('rocket_buyer', 'trust');
    expect(slidesFor(g, CONTENT.endings).find((s) => s.id === 'rocket')?.text).toContain('Трест');
    g.setFlag('rocket_buyer', 'guild');
    expect(slidesFor(g, CONTENT.endings).find((s) => s.id === 'rocket')?.text).toContain('Гильдия');
    g.setFlag('rocket_fate', 'broken');
    expect(slidesFor(g, CONTENT.endings).find((s) => s.id === 'rocket')?.text).toContain('Потоп');
  });
});
