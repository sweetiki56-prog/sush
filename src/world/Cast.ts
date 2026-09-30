// Everyone on the map as the room reports them: players, NPCs and hostiles, each drawn as an Actor.
import Phaser from 'phaser';
import type { ActorKind, ActorSnap, HostileSnap } from '../core/room/protocol';
import { Actor } from './Actor';
import type { GenMeta } from './MapData';

export interface Member {
  id: string;
  kind: ActorKind;
  actor: Actor;
  label: string;
  dialogue?: string;
  hostile?: HostileSnap;
}

export class Cast {
  readonly members = new Map<string, Member>();

  constructor(
    private scene: Phaser.Scene,
    private meta: GenMeta,
  ) {}

  add(s: ActorSnap): Member {
    this.remove(s.id);
    const actor = new Actor(this.scene, s.id, s.sheet, s.x, s.y, s.dir, this.meta.sheets[s.sheet]);
    if (s.speed) actor.speed = s.speed;
    if (s.path.length) actor.walk(s.path);
    const m: Member = { id: s.id, kind: s.kind, actor, label: s.label, dialogue: s.dialogue };
    this.members.set(s.id, m);
    return m;
  }

  remove(id: string): void {
    const m = this.members.get(id);
    if (!m) return;
    m.actor.sprite.destroy();
    m.actor.shadow.destroy();
    this.members.delete(id);
  }

  clear(): void {
    for (const id of [...this.members.keys()]) this.remove(id);
  }

  get(id: string): Member | undefined {
    return this.members.get(id);
  }

  actor(id: string): Actor | undefined {
    return this.members.get(id)?.actor;
  }

  of(kind: ActorKind): Member[] {
    return [...this.members.values()].filter((m) => m.kind === kind);
  }

  /** Hostiles the room still counts: not dead, not run off. */
  aliveHostiles(): Member[] {
    return this.of('hostile').filter((m) => !m.hostile?.dead && !m.hostile?.gone);
  }

  label(m: Member): string {
    return m.hostile ? m.hostile.name + (m.hostile.asleep ? ' (спит)' : '') : m.label;
  }

  /** A hostile's state changed: corpses lie down, runaways fade out. */
  setHostile(s: HostileSnap, animate = true): void {
    const m = this.members.get(s.id);
    if (!m) return;
    const was = m.hostile;
    m.hostile = s;
    const a = m.actor;
    if (s.dead && !was?.dead) {
      a.stop();
      a.setPose('dead');
      a.sync();
    }
    if (s.gone && !was?.gone) {
      a.stop();
      if (animate) this.scene.tweens.add({ targets: [a.sprite, a.shadow], alpha: 0, duration: 800 });
      else {
        a.sprite.setAlpha(0);
        a.shadow.setAlpha(0);
      }
    }
  }

  /** Is anyone (but `except`) standing on this tile? Players never block each other, so they can be skipped. */
  at(x: number, y: number, except?: string, skipPlayers = false): Member | undefined {
    for (const m of this.members.values()) {
      if (m.id === except || m.hostile?.dead || m.hostile?.gone || (skipPlayers && m.kind === 'player')) continue;
      const t = m.actor.tile;
      if (t.x === x && t.y === y) return m;
    }
    return undefined;
  }

  update(dt: number): void {
    for (const m of this.members.values()) m.actor.update(dt);
  }
}
