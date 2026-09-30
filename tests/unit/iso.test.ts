import { describe, it, expect } from 'vitest';
import { gridToScreen, screenToGrid, screenToTile, tileCenter, dirFromVector, depthOf } from '../../src/iso/IsoMath';

describe('IsoMath', () => {
  it('round-trips grid <-> screen', () => {
    for (const [x, y] of [[0, 0], [3.5, 7.25], [39, 0], [0, 39], [12.1, 30.9]]) {
      const s = gridToScreen(x, y);
      const g = screenToGrid(s.x, s.y);
      expect(g.x).toBeCloseTo(x);
      expect(g.y).toBeCloseTo(y);
    }
  });

  it('maps tile centers back to the same tile', () => {
    for (let x = 0; x < 10; x++)
      for (let y = 0; y < 10; y++) {
        const c = tileCenter(x, y);
        expect(screenToTile(c.x, c.y)).toEqual({ x, y });
      }
  });

  it('uses a 2:1 diamond', () => {
    expect(gridToScreen(1, 0)).toEqual({ x: 32, y: 16 });
    expect(gridToScreen(0, 1)).toEqual({ x: -32, y: 16 });
  });

  it('picks 8 screen directions clockwise from east', () => {
    expect(dirFromVector(1, 0)).toBe(0);
    expect(dirFromVector(1, 1)).toBe(1);
    expect(dirFromVector(0, 1)).toBe(2);
    expect(dirFromVector(-1, 0)).toBe(4);
    expect(dirFromVector(0, -1)).toBe(6);
    expect(dirFromVector(1, -1)).toBe(7);
  });

  it('sorts an actor in front of a 3x3 box on its visible +x side and behind on the -x side', () => {
    const box = depthOf(10 + 1.5, 10 + 1.5);
    expect(depthOf(13.5, 10.5)).toBeGreaterThan(box);
    expect(depthOf(9.5, 12.5)).toBeLessThan(box);
  });
});
