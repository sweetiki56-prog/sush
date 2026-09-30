// Walkability and sight on the map, without Phaser: props block tiles, tall props block sight.
// The world scene draws the same props; the room (server or local) rules with this grid.
import type { FlagValue } from '../types';
import type { MapData, MapObject } from '../../world/MapData';

// tall props that block line of sight in combat (barrels, cacti and crates do not)
const OPAQUE = /^(shack|wall_|door_closed|tank|machine|rock_|car_|hull_hi|transformer|tower)/;

export interface PropState {
  obj: MapObject;
  frame: string;
  visible: boolean;
}

/** What a flag changes on the map, so the scene can mirror it on its images. */
export type PropChange = { id: string; frame?: string; hidden?: boolean };

export class Grid {
  readonly props = new Map<string, PropState>();
  private solid: Uint8Array;
  private byTile = new Map<number, PropState>();

  constructor(readonly data: MapData) {
    const { width: W, height: H } = data;
    this.solid = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data.ground[y][x] === '#') this.solid[y * W + x] = 1;
    for (const obj of data.objects) {
      const p: PropState = { obj, frame: obj.frame, visible: true };
      this.props.set(obj.id, p);
      for (let y = obj.y; y < obj.y + obj.h; y++) for (let x = obj.x; x < obj.x + obj.w; x++) this.byTile.set(y * W + x, p);
      if (obj.block) this.setBlocked(obj, true);
    }
  }

  /** Every prop back as built: frames, visibility, blocking (a new arena round). */
  reset(): void {
    for (const p of this.props.values()) {
      p.frame = p.obj.frame;
      p.visible = true;
      if (p.obj.block) this.setBlocked(p.obj, true);
    }
  }

  get width(): number {
    return this.data.width;
  }

  get height(): number {
    return this.data.height;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  setBlocked(obj: MapObject, blocked: boolean): void {
    const W = this.width;
    for (let y = obj.y; y < obj.y + obj.h; y++) for (let x = obj.x; x < obj.x + obj.w; x++) this.solid[y * W + x] = blocked ? 1 : 0;
  }

  isSolid(x: number, y: number): boolean {
    if (!this.inside(x, y)) return true;
    return this.solid[y * this.width + x] === 1;
  }

  /** Rock rim, walls, shacks, wrecks: things you cannot shoot through. */
  blocksSight(x: number, y: number): boolean {
    if (this.ground(x, y) === '#') return true;
    const p = this.byTile.get(y * this.width + x);
    return !!p && p.visible && OPAQUE.test(p.frame);
  }

  ground(x: number, y: number): string {
    return this.data.ground[y]?.[x] ?? '#';
  }

  /** Flat props (the skeleton) lie on the ground. */
  static flat(frame: string): boolean {
    return frame === 'skeleton';
  }

  /** Map consequences of a world flag: the open door, the fixed pump, a blown barrel. */
  applyFlag(key: string, value: FlagValue): PropChange | null {
    if (!value) return null;
    if (key === 'door_open') {
      const door = this.props.get('door');
      if (!door) return null;
      door.frame = 'door_open';
      this.setBlocked(door.obj, false);
      return { id: 'door', frame: 'door_open' };
    }
    if (key === 'pump_fixed' && this.props.has('pump')) {
      this.props.get('pump')!.frame = 'pump_fixed';
      return { id: 'pump', frame: 'pump_fixed' };
    }
    if (key.startsWith('open_')) {
      // any door or grille by its id: open_vault_door, open_cell_door…
      const id = key.slice(5);
      const p = this.props.get(id);
      if (!p || !p.obj.frame.endsWith('_closed')) return null; // door_closed, bars_closed
      p.frame = p.obj.frame.replace(/_closed$/, '_open');
      this.setBlocked(p.obj, false);
      return { id, frame: p.frame };
    }
    if (key.startsWith('blown_')) {
      const id = key.slice(6);
      const p = this.props.get(id);
      if (!p) return null;
      p.visible = false;
      this.setBlocked(p.obj, false);
      return { id, hidden: true };
    }
    return null;
  }

  /** Explosive barrels that are still standing. */
  barrels(blown: (id: string) => boolean): MapObject[] {
    return [...this.props.values()].filter((p) => p.obj.explosive && p.visible && !blown(p.obj.id)).map((p) => p.obj);
  }
}
