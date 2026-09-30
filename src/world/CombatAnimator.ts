// Turns combat events into sprite poses, effects and sounds. The room has already applied them;
// this only shows what happened, in order.
import Phaser from 'phaser';
import type { Combat } from '../core/combat/Combat';
import type { CombatEvent } from '../core/combat/types';
import { gridToScreen, dirFromVector } from '../iso/IsoMath';
import { synth } from '../audio/Synth';
import type { Actor } from './Actor';
import type { Cast } from './Cast';
import type { WorldMap } from './MapBuilder';
import { blast, flash, floatText, lob, splat, tracer } from './Fx';

const WALK = 4.5; // tiles per second in combat

export interface AnimatorCtl {
  combat(): Combat;
  mult(): number;
  me(): string;
  /** A person's turn begins: the camera follows them (you, or a friend). */
  turnOf(id: string, actor: Actor): void;
}

export class CombatAnimator {
  constructor(
    private scene: Phaser.Scene,
    private map: WorldMap,
    private cast: Cast,
    private ctl: AnimatorCtl,
  ) {}

  private wait(ms: number): Promise<void> {
    return new Promise((r) => this.scene.time.delayedCall(Math.max(1, ms * this.ctl.mult()), r));
  }

  private isPerson(id: string): boolean {
    return this.ctl.combat().unit(id)?.side === 'player';
  }

  private spot(id: string): { x: number; y: number } {
    const u = this.ctl.combat().unit(id)!;
    const a = this.cast.actor(id);
    if (a) return { x: a.sprite.x, y: a.sprite.y - (this.isPerson(id) ? 24 : 8) };
    const p = gridToScreen(u.x + 0.5, u.y + 0.5);
    return { x: p.x, y: p.y - 10 };
  }

  async animate(e: CombatEvent): Promise<void> {
    const cam = this.scene.cameras.main;
    switch (e.t) {
      case 'turn': {
        const a = this.cast.actor(e.id);
        if (!a) break;
        if (this.isPerson(e.id)) {
          this.ctl.turnOf(e.id, a);
          if (e.id === this.ctl.me()) synth.turn();
        } else {
          cam.stopFollow();
          cam.pan(a.sprite.x, a.sprite.y, 250 * this.ctl.mult(), 'Sine.easeInOut');
          await this.wait(200);
        }
        break;
      }
      case 'move': {
        const a = this.cast.actor(e.id);
        if (!a) break;
        a.speed = WALK / this.ctl.mult();
        await new Promise<void>((r) => a.walk(e.path, r));
        break;
      }
      case 'attack':
        await this.attackAnim(e);
        break;
      case 'damage': {
        const s = this.spot(e.id);
        floatText(this.scene, s.x, s.y - 8, `-${e.amount}${e.crit ? '!' : ''}`, e.crit ? '#ffd87a' : '#ff8a5a', 400 * this.ctl.mult());
        const u = this.ctl.combat().unit(e.id)!;
        if (u.side !== 'object') splat(this.scene, s.x, s.y + 6, this.isPerson(e.id) ? 'blood' : 'ichor', 300 * this.ctl.mult());
        synth.hit();
        const a = this.cast.actor(e.id);
        if (a && e.hp > 0) {
          a.setPose('hit');
          await this.wait(180);
          a.setPose('idle');
        }
        break;
      }
      case 'poisoned':
        floatText(this.scene, this.spot(e.id).x, this.spot(e.id).y - 20, 'яд', '#b8f5a0', 400 * this.ctl.mult());
        break;
      case 'burning':
        floatText(this.scene, this.spot(e.id).x, this.spot(e.id).y - 20, 'огонь', '#ffb04a', 400 * this.ctl.mult());
        break;
      case 'stunned':
        floatText(this.scene, this.spot(e.id).x, this.spot(e.id).y - 20, 'оглушение', '#ffe27a', 400 * this.ctl.mult());
        break;
      case 'death':
        this.onDeath(e.id);
        await this.wait(250);
        break;
      case 'explode': {
        this.map.hideProp(e.id);
        const p = gridToScreen(e.x + 0.5, e.y + 0.5);
        blast(this.scene, p.x, p.y - 8, e.radius * 32, 400 * this.ctl.mult());
        synth.boom();
        await this.wait(450);
        break;
      }
      case 'heal':
      case 'revive': {
        const s = this.spot(e.id);
        floatText(this.scene, s.x, s.y - 8, `+${e.t === 'heal' ? e.amount : e.hp}`, '#b8f5a0', 400 * this.ctl.mult());
        if (e.t === 'revive') this.cast.actor(e.id)?.setPose('idle');
        await this.wait(200);
        break;
      }
      case 'throw': {
        const a = this.cast.actor(e.id);
        a?.faceTile(e.x, e.y);
        a?.setPose('melee1');
        await this.wait(120);
        a?.setPose('melee2');
        synth.swing();
        const from = this.spot(e.id);
        const to = gridToScreen(e.x + 0.5, e.y + 0.5);
        await lob(this.scene, from, to, 380 * this.ctl.mult());
        if (a && !a.dead) a.setPose('idle');
        break;
      }
      case 'use': {
        const s = this.spot(e.id);
        floatText(this.scene, s.x, s.y - 18, '✚', '#b8f5a0', 300 * this.ctl.mult());
        synth.pickup();
        await this.wait(150);
        break;
      }
      case 'flee': {
        const a = this.cast.actor(e.id);
        if (a) this.scene.tweens.add({ targets: [a.sprite, a.shadow], alpha: 0, duration: 600 * this.ctl.mult() });
        break;
      }
      case 'log':
      case 'end':
        break;
    }
  }

  private async attackAnim(e: Extract<CombatEvent, { t: 'attack' }>): Promise<void> {
    const c = this.ctl.combat();
    const att = this.cast.actor(e.id);
    const w = c.weapons[e.weapon];
    const to = c.unit(e.target)!;
    att?.faceTile(to.x, to.y);
    const target = this.spot(e.target);
    if (!this.isPerson(e.id)) {
      att?.setPose('attack1');
      await this.wait(200);
      att?.setPose('attack2');
      synth.hiss();
      await this.wait(160);
    } else if (w.skill === 'guns' && att) {
      att.setPose('aim');
      await this.wait(160);
      att.setPose('fire');
      const a = att.sprite;
      const v = gridToScreen(to.x + 0.5, to.y + 0.5);
      const len = Math.hypot(v.x - a.x, v.y - a.y) || 1;
      const muzzle = { x: a.x + ((v.x - a.x) / len) * 16, y: a.y - 26 + ((v.y - a.y) / len) * 8 };
      flash(this.scene, muzzle.x, muzzle.y, 'muzzle', 1.2, 90 * this.ctl.mult());
      const miss = e.hit ? { x: 0, y: 0 } : { x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 24 };
      tracer(this.scene, muzzle, { x: target.x + miss.x, y: target.y + miss.y }, 120 * this.ctl.mult());
      synth.gun(e.weapon);
      await this.wait(140);
    } else {
      att?.setPose('melee1');
      await this.wait(160);
      att?.setPose('melee2');
      synth.swing();
      await this.wait(140);
    }
    if (!e.hit) {
      floatText(this.scene, target.x, target.y - 8, 'мимо', '#e6cc97', 350 * this.ctl.mult());
      synth.miss();
    }
    if (att && !att.dead) att.setPose('idle');
  }

  private onDeath(id: string): void {
    const u = this.ctl.combat().unit(id)!;
    if (u.side === 'object') return;
    const a = this.cast.actor(id);
    if (a) {
      if (!this.isPerson(id)) a.face(dirFromVector(1, 1));
      a.setPose('dead');
      a.sync();
    }
    synth.death();
  }
}
