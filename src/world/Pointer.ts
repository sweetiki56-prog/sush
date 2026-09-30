// Mouse over the world: what is under the pointer, the tile cursor, and clicks turned into intents.
import Phaser from 'phaser';
import { session } from '../session';
import { synth } from '../audio/Synth';
import { GAME_H, HUD_H } from '../config';
import { gridToScreen, screenToTile } from '../iso/IsoMath';
import { Pathfinder } from '../iso/Pathfinder';
import type { Prop } from './MapBuilder';
import type { WorldScene } from '../scenes/WorldScene';

export interface Target {
  kind: 'npc' | 'prop' | 'hostile' | 'player';
  id: string;
  label: string;
  dialogue?: string;
}

export class Pointer {
  private armed: string | null = null; // touch, in a fight: the target or tile tapped once, awaiting the confirming tap
  private cursor: Phaser.GameObjects.Image;

  constructor(private w: WorldScene) {
    this.cursor = w.add.image(0, 0, 'atlas', 'tile_ok').setOrigin(0.5, 0.5).setDepth(-9e4).setVisible(false);
    w.input.on('pointermove', (ptr: Phaser.Input.Pointer) => this.hover(ptr));
    w.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.click(ptr));
  }

  /** Walkability as this client sees it: the map, NPCs and live monsters (the room has the final say). */
  pathfinder(): Pathfinder {
    const m = this.w.map;
    const c = this.w.cast;
    return new Pathfinder(m.data.width, m.data.height, (x, y) => m.isSolid(x, y) || !!c.at(x, y, undefined, true));
  }

  targetAt(wx: number, wy: number): Target | null {
    const cast = this.w.cast;
    for (const m of cast.aliveHostiles())
      if (m.actor.sprite.getBounds().contains(wx, wy)) return { kind: 'hostile', id: m.id, label: cast.label(m) };
    for (const m of [...cast.of('npc'), ...cast.of('ally').filter((a) => !a.hostile?.dead)])
      if (m.actor.sprite.getBounds().contains(wx, wy)) return { kind: 'npc', id: m.id, label: m.label, dialogue: m.dialogue };
    for (const m of cast.of('player')) {
      if (m.id === session().net?.you || !m.actor.sprite.getBounds().contains(wx, wy)) continue;
      const info = session().net?.players.find((p) => p.id === m.id);
      return { kind: 'player', id: m.id, label: info ? `${info.name}, ОЗ ${info.hp}/${info.maxHp}${info.downed ? ' — без сознания' : ''}` : m.label };
    }
    const p: Prop | null = this.w.map.propAt(wx, wy, (pr) => !!pr.obj.label && pr.image.visible);
    if (!p) return null;
    return { kind: 'prop', id: p.obj.id, label: p.obj.label!, dialogue: p.obj.dialogue };
  }

  hide(): void {
    this.cursor.setVisible(false);
  }

  private hover(ptr: Phaser.Input.Pointer): void {
    const s = session();
    if (s.modal || !s.started || ptr.y > GAME_H - HUD_H || !this.w.player) {
      this.cursor.setVisible(false);
      s.ui.emit('hover', null);
      return;
    }
    const wp = this.w.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const target = this.targetAt(wp.x, wp.y);
    const t = screenToTile(wp.x, wp.y);
    const f = this.w.fight;
    if (f.active) {
      const text = f.describe(target && f.combat!.unit(target.id) ? target.id : null, t);
      s.ui.emit('hover', text ? { label: text, interact: !!target } : null);
    } else {
      const exit = target ? null : this.w.map.exits.at(t.x, t.y);
      const label = target?.label ?? (exit ? `Выход: ${exit.label}` : null);
      s.ui.emit('hover', label ? { label, interact: !!target?.dialogue || target?.kind === 'hostile' || !!exit } : null);
    }
    const pf = this.pathfinder();
    const inside = pf.inside(t.x, t.y);
    this.cursor.setVisible(inside && !target);
    if (!inside) return;
    const c = gridToScreen(t.x + 0.5, t.y + 0.5);
    this.cursor.setPosition(c.x, c.y).setFrame(pf.walkable(t.x, t.y) ? 'tile_ok' : 'tile_bad');
  }

  private click(ptr: Phaser.Input.Pointer): void {
    const s = session();
    synth.start();
    if (ptr.rightButtonDown()) return this.w.fight.cancelAim();
    if (s.modal || !s.started || !ptr.leftButtonDown() || ptr.y > GAME_H - HUD_H || !this.w.player) return;
    const wp = this.w.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const target = this.targetAt(wp.x, wp.y);
    const t = screenToTile(wp.x, wp.y);
    const f = this.w.fight;
    if (this.w.input.pointer2?.isDown) return; // the second finger of a pinch
    if (f.active) {
      const unit = target && f.combat!.unit(target.id) ? target.id : null;
      // a finger has no hover: the first tap shows the chance and the cost, a second tap on the same spot acts
      if (ptr.wasTouch) {
        const key = unit ?? `${t.x},${t.y}`;
        if (this.armed !== key) {
          this.armed = key;
          const text = f.describe(unit, t);
          s.ui.emit('hover', text ? { label: `${text} · коснитесь ещё раз`, interact: true } : null);
          return;
        }
        this.armed = null;
      }
      return f.click(unit, t);
    }
    if (target?.kind === 'hostile') return s.send({ t: 'engage', id: target.id });
    if (target?.dialogue) return s.send({ t: 'interact', id: target.id });
    s.send({ t: 'walk', x: t.x, y: t.y });
  }
}
