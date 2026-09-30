import { describe, it, expect } from 'vitest';
import { Pathfinder } from '../../src/iso/Pathfinder';

function grid(rows: string[]) {
  const blocked = (x: number, y: number) => rows[y][x] === '#';
  return new Pathfinder(rows[0].length, rows.length, blocked);
}

describe('Pathfinder', () => {
  it('walks a straight diagonal on open ground', () => {
    const pf = grid(['.....', '.....', '.....', '.....', '.....']);
    const p = pf.find({ x: 0, y: 0 }, [{ x: 4, y: 4 }])!;
    expect(p).toHaveLength(4);
    expect(p.at(-1)).toEqual({ x: 4, y: 4 });
  });

  it('goes around a wall', () => {
    const pf = grid(['.....', '.###.', '.#...', '.#...', '.....']);
    const p = pf.find({ x: 0, y: 2 }, [{ x: 2, y: 2 }])!;
    expect(p).not.toBeNull();
    for (const t of p) expect(pf.walkable(t.x, t.y)).toBe(true);
    expect(p.at(-1)).toEqual({ x: 2, y: 2 });
  });

  it('never cuts wall corners diagonally', () => {
    const pf = grid(['.#', '..']);
    const p = pf.find({ x: 0, y: 0 }, [{ x: 1, y: 1 }])!;
    expect(p).toEqual([{ x: 0, y: 1 }, { x: 1, y: 1 }]);
  });

  it('returns null for unreachable goals and [] when already there', () => {
    const pf = grid(['..#..', '..#..', '..#..']);
    expect(pf.find({ x: 0, y: 0 }, [{ x: 4, y: 1 }])).toBeNull();
    expect(pf.find({ x: 0, y: 0 }, [{ x: 0, y: 0 }])).toEqual([]);
  });

  it('reaches the nearest free tile around a footprint', () => {
    const pf = grid(['......', '..##..', '..##..', '......']);
    const goals = pf.around(2, 1, 2, 2);
    expect(goals.length).toBe(12);
    const p = pf.find({ x: 0, y: 0 }, goals)!;
    expect(p.length).toBe(1);
  });
});
