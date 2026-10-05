// Combat on the client: a read-only copy of the room's fight (hit chances, paths, the HUD),
// and the player that animates each batch of events before telling the room to go on.
import { Combat, type CombatEnv } from '../core/combat/Combat';
import { attackCost } from '../core/combat/rules';
import type { ServerMsg, CombatSync } from '../core/room/protocol';
import { enemies } from '../core/combat/types';
import { REVIVE_AP } from '../core/room/FightRules';
import type { Tile } from '../iso/Pathfinder';
import { session } from '../session';
import { settings } from '../core/Settings';
import { synth } from '../audio/Synth';
import type { NetClient } from '../net/NetClient';
import type { WorldScene } from '../scenes/WorldScene';
import { CombatAnimator } from './CombatAnimator';
import { contentText, mapLabelForDisplay } from '../i18n/display';
import { runtimeLineForDisplay } from '../i18n/runtime';

/** What the combat HUD shows. */
export interface CombatView {
  playerTurn: boolean;
  whose: string;
  aiming: string | null; // grenade in hand, waiting for a tile
  deadline: number | null; // Date.now() when the turn timer runs out
  ap: number;
  maxAp: number;
  weapon: string;
  weaponName: string;
  cost: number;
  ammo: number | null;
  order: { id: string; name: string; hp: number; maxHp: number; current: boolean; friend: boolean }[]; // friend: our side (people and allies under AI)
}

export class FightView {
  combat: Combat | null = null;
  /** Animation time multiplier (tests set it near zero). */
  pace = 1;
  /** A grenade picked from the bag: the next click on a tile throws it. */
  aiming: string | null = null;
  private sync: CombatSync | null = null;
  private syncAt = 0;
  private animating = false;
  private anim: CombatAnimator;

  constructor(
    private w: WorldScene,
    private net: NetClient,
  ) {
    this.anim = new CombatAnimator(w, w.map, w.cast, {
      combat: () => this.combat!,
      mult: () => this.mult,
      me: () => net.you,
      turnOf: (id, a) => w.cameras.main.startFollow(id === net.you ? w.player.sprite : a.sprite, true, 0.12, 0.12),
    });
  }

  get active(): boolean {
    return !!this.combat;
  }

  private get mult(): number {
    return this.pace * (settings().combatFast ? 0.5 : 1);
  }

  get myTurn(): boolean {
    const c = this.combat;
    return !!c && !!this.sync && !this.sync.busy && !this.animating && !c.outcome && c.current.id === this.net.you;
  }

  private env(): CombatEnv {
    const m = this.w.map;
    return {
      width: m.data.width,
      height: m.data.height,
      rng: Math.random,
      blocked: (x, y) => m.isSolid(x, y),
      opaque: (x, y) => m.blocksSight(x, y),
      ammo: (it, u) => (u.id === this.net.you ? this.net.game!.count(it) : 99),
      spendAmmo: () => {},
    };
  }

  private mirror(s: CombatSync): void {
    this.combat = Combat.restore(s, session().game.content.weapons, this.env());
    this.sync = s;
    this.syncAt = Date.now();
  }

  /** Joined mid-fight: show it as it stands. */
  resume(s: CombatSync | null): void {
    if (!s) return;
    this.mirror(s);
    this.emitView();
  }

  /** A batch from the room: rebuild the copy, animate the events, then acknowledge. */
  async onBatch(m: Extract<ServerMsg, { t: 'combat' }>): Promise<void> {
    const first = !this.combat;
    this.mirror(m.sync);
    if (first) {
      synth.combatStart();
      session().ui.emit('hover', null);
    }
    if (!m.events.length) {
      this.emitView();
      this.net.send({ t: 'ack', seq: m.seq });
      return;
    }
    this.net.hold();
    this.animating = true;
    this.emitView();
    try {
      for (const e of m.events) await this.anim.animate(e);
    } finally {
      this.animating = false;
      this.net.send({ t: 'ack', seq: m.seq });
      this.emitView();
      this.net.release();
    }
  }

  /** Take a grenade in hand (from the inventory); false when it is not our moment. */
  aim(item: string): boolean {
    if (!this.myTurn) return false;
    this.aiming = item;
    this.emitView();
    return true;
  }

  cancelAim(): void {
    if (!this.aiming) return;
    this.aiming = null;
    this.emitView();
  }

  onEnd(): void {
    this.aiming = null;
    this.combat = null;
    this.sync = null;
    this.w.cameras.main.startFollow(this.w.player.sprite, true, 0.12, 0.12);
    for (const m of this.w.cast.aliveHostiles()) m.actor.setPose('idle');
    session().ui.emit('combat', null);
  }

  // ---------- player input ----------
  /** Tooltip for the pointer: hit chance on a target, AP cost on a tile. */
  describe(targetId: string | null, tile: Tile): string | null {
    const c = this.combat;
    if (!c || !this.myTurn) return null;
    const p = c.unit(this.net.you)!;
    const target = targetId ? c.unit(targetId) : undefined;
    const locale = settings().language;
    const ap = locale === 'en' ? 'AP' : 'ОД';
    const reason = (source: string) => runtimeLineForDisplay(source, locale === 'en' ? 'en' : 'ru');
    const name = target ? mapLabelForDisplay(target.name, locale) : '';
    if (this.aiming) {
      const at = target ? { x: target.x, y: target.y } : tile;
      const pv = c.throwPreview(p, this.aiming, at);
      return pv.reason ? `${locale === 'en' ? 'Throw' : 'Бросок'}: ${reason(pv.reason)}` : `${locale === 'en' ? 'Throw' : 'Бросок'}: ${pv.chance}% · ${pv.cost} ${ap}`;
    }
    if (target && !target.dead && enemies(p, target)) {
      const pv = c.preview(p, target);
      return pv.reason ? `${name}: ${reason(pv.reason)}` : `${name}: ${pv.chance}% · ${pv.cost} ${ap}`;
    }
    if (target && target.side === 'player' && target.dead && target.id !== p.id) return locale === 'en' ? `${name}: revive (bandages, ${REVIVE_AP} AP)` : `${name}: поднять (бинты, ${REVIVE_AP} ОД)`;
    const path = c.pathfinder(p.id).find(p, [tile]);
    if (!path) return reason('Туда не пройти');
    return path.length ? `${path.length} ${ap}${path.length > p.ap ? (locale === 'en' ? ' (not enough)' : ' (не хватит)') : ''}` : null;
  }

  click(targetId: string | null, tile: Tile): void {
    const c = this.combat;
    if (!c || !this.myTurn) return;
    const target = targetId ? c.unit(targetId) : undefined;
    if (this.aiming) {
      const at = target ? { x: target.x, y: target.y } : tile;
      this.net.send({ t: 'throw', item: this.aiming, x: at.x, y: at.y });
      this.aiming = null;
      return;
    }
    if (target && !target.dead && enemies(c.current, target)) return this.net.send({ t: 'attack', target: target.id });
    if (target && target.side === 'player' && target.dead) return this.net.send({ t: 'revive', target: target.id });
    const path = c.pathfinder(this.net.you).find(c.current, [tile]);
    if (path?.length) this.net.send({ t: 'step', x: tile.x, y: tile.y });
  }

  endTurn(): void {
    if (this.myTurn) this.net.send({ t: 'endTurn' });
  }

  swapWeapon(): void {
    if (this.myTurn) this.net.send({ t: 'swapWeapon' });
  }

  emitView(): void {
    const c = this.combat;
    const me = c?.unit(this.net.you);
    if (!c || !me || !this.sync) return;
    const w = c.weapons[me.weapon];
    const cur = c.current;
    const left = this.sync.timer;
    session().ui.emit('combat', {
      playerTurn: this.myTurn,
      whose: cur.id === this.net.you ? (settings().language === 'en' ? 'Your turn' : 'Ваш ход') : !enemies(me, cur)
        ? `${settings().language === 'en' ? 'Turn' : 'Ход'}: ${mapLabelForDisplay(cur.name, settings().language)}`
        : (settings().language === 'en' ? 'Enemy turn…' : 'Ход противника…'),
      aiming: this.aiming ? contentText(`/items/${this.aiming}/name`, this.net.game!.content.items[this.aiming]?.name ?? this.aiming, settings().language) : null,
      deadline: left !== null && !this.sync.busy ? this.syncAt + left : null,
      ap: me.ap,
      maxAp: me.maxAp,
      weapon: me.weapon,
      weaponName: w ? contentText(`/weapons/${me.weapon}/name`, w.name, settings().language) : '—',
      cost: w ? attackCost(me, w) : 0,
      ammo: w?.ammo ? this.net.game!.count(w.ammo) : null,
      order: c.turnOrder.map((u) => ({ id: u.id, name: mapLabelForDisplay(u.name, settings().language), hp: u.hp, maxHp: u.maxHp, current: u === cur, friend: !enemies(me, u) })),
    });
  }
}
