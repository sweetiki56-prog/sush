import { describe, expect, it } from 'vitest';
import { strengthForDisplay, terrainForDisplay, travelInfoLines } from '../../src/i18n/travel';
import { TERRAIN } from '../../src/core/travel/Travel';

describe('English world-map copy', () => {
  it('covers every terrain and relative party strength', () => {
    for (const entry of Object.values(TERRAIN)) expect(terrainForDisplay(entry.name, 'en')).not.toMatch(/[А-Яа-яЁё]/);
    for (const word of ['слабее вас', 'вровень с вами', 'сильнее вас', 'намного сильнее вас'])
      expect(strengthForDisplay(word, 'en')).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('preserves values and provides a fully English four-line status', () => {
    const status = travelInfoLines({ day: 11, time: '05:25', night: true, terrain: 'тракт', storm: true, pace: 0.9, flasks: 2, thirsty: true, moving: false }, 'en');
    expect(status).toHaveLength(4);
    expect(status.join(' ')).toContain('Day 11, 05:25');
    expect(status.join(' ')).toContain('0.9 cells/h');
    expect(status.join(' ')).toContain('2 flasks');
    expect(status.join(' ')).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('covers escort state and keeps Russian source copy', () => {
    const input = { day: 1, time: '12:00', night: false, terrain: 'песок', storm: false, pace: 1, flasks: 1, thirsty: false, escort: { to: 'Salt', paused: true }, moving: false };
    expect(travelInfoLines(input, 'en')[3]).toContain('Caravan to Salt · camp');
    expect(travelInfoLines(input, 'ru')[0]).toBe('День 1, 12:00');
  });
});
