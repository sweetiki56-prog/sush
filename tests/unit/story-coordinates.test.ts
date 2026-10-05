import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CONTENT } from '../../src/content';

describe('story atlas coordinates', () => {
  it('the location bible uses cells from the current 112×80 chart', () => {
    const bible = readFileSync('docs/story/locations.md', 'utf8');
    const cells = new Set(Object.values(CONTENT.locations).map((location) => location.cell.join(',')));
    const found = [...bible.matchAll(/клетка (\d+), (\d+)/g)];
    expect(found.length).toBeGreaterThanOrEqual(16);
    for (const match of found) expect(cells.has(`${match[1]},${match[2]}`), `stale location cell ${match[0]}`).toBe(true);
  });
});
