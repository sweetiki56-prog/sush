// Ways out drawn on the ground, in the manner of the old isometric RPGs: a hatched strip of tiles at the edge of
// a map with chevrons pointing where it leads, breathing softly. Hovering names the place; stepping on it goes there.
import Phaser from 'phaser';
import { gridToScreen } from '../iso/IsoMath';
import type { MapData, MapExit } from './MapData';

const HATCH = 0xe0a246;
const RIM = 0x2a1a0c;

export class Exits {
  constructor(
    scene: Phaser.Scene,
    private data: MapData,
  ) {
    const g = scene.add.graphics().setDepth(-9.5e4); // over the ground and flat decals, under anything standing
    for (const ex of data.exits ?? []) this.draw(g, ex);
    scene.tweens.add({ targets: g, alpha: 0.45, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** The exit on this tile, if any. */
  at(x: number, y: number): MapExit | null {
    return (this.data.exits ?? []).find((e) => x >= e.x && y >= e.y && x < e.x + e.w && y < e.y + e.h) ?? null;
  }

  private draw(g: Phaser.GameObjects.Graphics, ex: MapExit): void {
    const out = this.outward(ex);
    for (let y = ex.y; y < ex.y + ex.h; y++)
      for (let x = ex.x; x < ex.x + ex.w; x++) {
        const c = [gridToScreen(x, y), gridToScreen(x + 1, y), gridToScreen(x + 1, y + 1), gridToScreen(x, y + 1)];
        g.fillStyle(RIM, 0.35).fillPoints(c, true);
        g.lineStyle(2, HATCH, 0.9).strokePoints(c, true, true);
        // hatching: stripes across the tile, parallel to one of its sides
        for (let k = 1; k < 4; k++) {
          const t = k / 4;
          const a = lerp(c[0], c[3], t);
          const b = lerp(c[1], c[2], t);
          g.lineStyle(1, HATCH, 0.7).lineBetween(a.x, a.y, b.x, b.y);
        }
        if (out) this.chevron(g, x + 0.5, y + 0.5, out);
      }
  }

  /** A chevron in the middle of a tile, pointing off the map. */
  private chevron(g: Phaser.GameObjects.Graphics, cx: number, cy: number, [dx, dy]: [number, number]): void {
    const tip = gridToScreen(cx + dx * 0.3, cy + dy * 0.3);
    const l = gridToScreen(cx - dx * 0.1 + dy * 0.25, cy - dy * 0.1 + dx * 0.25);
    const r = gridToScreen(cx - dx * 0.1 - dy * 0.25, cy - dy * 0.1 - dx * 0.25);
    g.lineStyle(3, RIM, 0.8).strokePoints([l, tip, r]);
    g.lineStyle(2, 0xffd890, 1).strokePoints([l, tip, r]);
  }

  /** Which way the exit leads off the map; none for a hatch or a door in the middle. */
  private outward(ex: MapExit): [number, number] | null {
    const { width: W, height: H } = this.data;
    if (ex.x === 0) return [-1, 0];
    if (ex.y === 0) return [0, -1];
    if (ex.x + ex.w === W) return [1, 0];
    if (ex.y + ex.h === H) return [0, 1];
    return null;
  }
}

const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
