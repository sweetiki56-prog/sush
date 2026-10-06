import { describe, expect, it } from 'vitest';
import { masksOverlap, type AlphaMask } from '../../src/world/occlusion';

const mask = (rows: string[]): AlphaMask => ({
  w: rows[0].length, h: rows.length,
  alpha: Uint8Array.from(rows.join('').split('').map((v) => v === '#' ? 255 : 0)),
});

describe('vehicle occlusion', () => {
  it('requires opaque pixels of both the actor and the car, not intersecting transparent bounds', () => {
    const actor = mask(['.##.', '.##.']);
    expect(masksOverlap(actor, 10, 10, mask(['#...', '#...']), 10, 10)).toBe(false);
    expect(masksOverlap(actor, 10, 10, mask(['.##.', '.##.']), 10, 10)).toBe(true);
    expect(masksOverlap(actor, 10, 10, mask(['.##.', '.##.']), 30, 30)).toBe(false);
  });
});
