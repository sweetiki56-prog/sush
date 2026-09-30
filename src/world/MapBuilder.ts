// Builds the static world: baked ground, depth-sorted props; walkability and sight come from the Grid.
import Phaser from 'phaser';
import { depthOf, gridToScreen, tileCenter } from '../iso/IsoMath';
import { Grid } from '../core/world/Grid';
import type { FlagValue } from '../core/types';
import type { GenMeta, MapData, MapDecor, MapObject } from './MapData';
import { Exits } from './Exits';
import { Roofs } from './Roofs';

export interface Prop {
  obj: MapObject;
  image: Phaser.GameObjects.Image;
}

const WIRE_SAG = 0.07; // of span length
// insulator tips on the pylon crossbar, relative to the tile center (see tools/art/props_misc.mjs pylon())
const INSULATORS = [-15, 0, 15].map((t) => ({ x: t, y: -101 - t * 0.33 }));

export class WorldMap {
  readonly props = new Map<string, Prop>();
  readonly grid: Grid;
  readonly exits: Exits;
  readonly roofs: Roofs;
  private readonly groundImage: Phaser.GameObjects.Image;

  constructor(
    private scene: Phaser.Scene,
    readonly data: MapData,
    meta: GenMeta,
  ) {
    this.grid = new Grid(data);
    const gr = meta.grounds?.[data.id ?? 'rusty_well'] ?? { key: 'ground', offX: meta.groundOffsetX, offY: meta.groundOffsetY };
    this.groundImage = scene.add.image(-gr.offX, -gr.offY, gr.key).setOrigin(0, 0).setDepth(-1e6);
    for (const o of data.objects) this.addProp(o);
    for (const d of data.decor) this.addDecor(d);
    this.addWires();
    this.exits = new Exits(scene, data);
    this.roofs = new Roofs(scene, data);
  }

  private addDecor(d: MapDecor): void {
    const frame = this.scene.textures.getFrame('atlas', d.frame);
    const anchor = (frame.customData as { anchor?: { x: number; y: number } }).anchor ?? { x: 0.5, y: 1 };
    const p = gridToScreen(d.x + d.w, d.y + d.h);
    this.scene.add.image(p.x + (d.jx ?? 0), p.y + (d.jy ?? 0), 'atlas', d.frame).setOrigin(anchor.x, anchor.y).setDepth(depthOf(d.x + d.w / 2, d.y + d.h / 2));
  }

  /** Sagging power lines between pylon crossbars; high in the air, so drawn over the world. */
  private addWires(): void {
    const g = this.scene.add.graphics().setDepth(1e5);
    g.lineStyle(1, 0x1e1611, 0.85);
    for (const [[ax, ay], [bx, by]] of this.data.wires) {
      const a = tileCenter(ax, ay);
      const b = tileCenter(bx, by);
      const sag = Math.hypot(b.x - a.x, b.y - a.y) * WIRE_SAG;
      for (const ins of INSULATORS) {
        g.beginPath();
        for (let i = 0; i <= 16; i++) {
          const s = i / 16;
          const x = a.x + ins.x + (b.x - a.x) * s;
          const y = a.y + ins.y + (b.y - a.y) * s + sag * 4 * s * (1 - s);
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokePath();
      }
    }
  }

  private addProp(obj: MapObject): void {
    const frame = this.scene.textures.getFrame('atlas', obj.frame);
    const anchor = (frame.customData as { anchor?: { x: number; y: number } }).anchor ?? { x: 0.5, y: 1 };
    const p = gridToScreen(obj.x + obj.w, obj.y + obj.h); // footprint bottom vertex
    const image = this.scene.add.image(p.x + (obj.jx ?? 0), p.y + (obj.jy ?? 0), 'atlas', obj.frame).setOrigin(anchor.x, anchor.y);
    image.setDepth(Grid.flat(obj.frame) ? -1e5 : depthOf(obj.x + obj.w / 2, obj.y + obj.h / 2));
    this.props.set(obj.id, { obj, image });
  }

  /** Mirror a world flag on the map: the grid changes, and so do the images. */
  applyFlag(key: string, value: FlagValue): string | null {
    const ch = this.grid.applyFlag(key, value);
    if (!ch) return null;
    const img = this.props.get(ch.id)?.image;
    if (ch.frame) img?.setFrame(ch.frame);
    if (ch.hidden) img?.setVisible(false);
    return ch.id;
  }

  /** Every prop as built (a new arena round); flags are applied again afterwards. */
  reset(): void {
    this.grid.reset();
    for (const p of this.props.values()) p.image.setFrame(p.obj.frame).setVisible(true);
  }

  /** Hide a prop right away (a barrel blowing up mid-animation); the flag follows later. */
  hideProp(id: string): void {
    this.props.get(id)?.image.setVisible(false);
  }

  isSolid(x: number, y: number): boolean {
    return this.grid.isSolid(x, y);
  }

  blocksSight(x: number, y: number): boolean {
    return this.grid.blocksSight(x, y);
  }

  ground(x: number, y: number): string {
    return this.grid.ground(x, y);
  }

  /** Topmost prop whose opaque pixels are under the world point. */
  propAt(wx: number, wy: number, filter: (p: Prop) => boolean): Prop | null {
    let best: Prop | null = null;
    for (const p of this.props.values()) {
      if (!filter(p)) continue;
      const img = p.image;
      if (best && img.depth <= best.image.depth) continue;
      const lx = wx - (img.x - img.displayOriginX);
      const ly = wy - (img.y - img.displayOriginY);
      if (lx < 0 || ly < 0 || lx >= img.width || ly >= img.height) continue;
      const alpha = this.scene.textures.getPixelAlpha(Math.floor(lx), Math.floor(ly), 'atlas', img.frame.name);
      if (alpha && alpha > 0) best = p;
    }
    return best;
  }

  /** Camera bounds: the baked ground image (map plus its wasteland ring), minus a small margin. */
  bounds(): Phaser.Geom.Rectangle {
    const g = this.groundImage;
    const m = 32;
    return new Phaser.Geom.Rectangle(g.x + m, g.y + m, g.width - 2 * m, g.height - 2 * m);
  }

  center(o: MapObject): { x: number; y: number } {
    return tileCenter(o.x + (o.w - 1) / 2, o.y + (o.h - 1) / 2);
  }
}
