// Turn-based combat state machine. Actions return events; the world scene animates them.
import { Pathfinder, type Tile } from '../../iso/Pathfinder';
import { lineOfSight, tileDist } from '../../iso/LineOfSight';
import type { Rng } from '../rng';
import { checkChance } from '../SkillCheck';
import { armorCut, attackCost, BURST_STEP, hitChance, RANGE_PENALTY, resist, rollAttack, rollDamage, typeCut } from './rules';
import { enemies, teamOf, type Combatant, type CombatEvent, type CombatUse, type Outcome, type WeaponDef } from './types';

const NOISE_STUN = 4; // AP a burrower loses when a burst or a blast drives it up

export const ESCAPE_DIST = 12;
export const ITEM_AP = 2;

export interface CombatEnv {
  width: number;
  height: number;
  rng: Rng;
  /** Static obstacles (walls, props). Units are added on top of this. */
  blocked(x: number, y: number): boolean;
  /** Does this tile block sight? */
  opaque(x: number, y: number): boolean;
  /** Rounds a player-side unit carries for a weapon that uses ammo (creatures never run dry). */
  ammo(item: string, u: Combatant): number;
  spendAmmo(item: string, u: Combatant): void;
}

/** Everything a client needs to rebuild the fight for previews and the HUD. */
export interface CombatSnap {
  units: Combatant[];
  idx: number;
  round: number;
  outcome: Outcome | null;
}

export class Combat {
  round = 1;
  outcome: Outcome | null = null;
  winner: string | null = null; // the team left standing

  private order: Combatant[];
  private idx = 0;

  constructor(
    readonly units: Combatant[],
    readonly weapons: Record<string, WeaponDef>,
    private env: CombatEnv,
  ) {
    // highest sequence first; the player wins ties
    this.order = units.filter((u) => u.side !== 'object').sort((a, b) => b.seq - a.seq || (a.side === b.side ? 0 : a.side === 'player' ? -1 : 1));
  }

  get current(): Combatant {
    return this.order[this.idx];
  }

  /** The first player-side unit (the only one in a solo game). */
  get player(): Combatant {
    return this.units.find((u) => u.side === 'player')!;
  }

  /** People in the fight (player side), alive or not. */
  get humans(): Combatant[] {
    return this.units.filter((u) => u.side === 'player');
  }

  snapshot(): CombatSnap {
    return {
      units: this.units.map((u) => ({ ...u, skills: { ...u.skills }, weapons: [...u.weapons], loot: { ...u.loot }, buff: u.buff && { ...u.buff }, tags: [...u.tags], res: { ...u.res } })),
      idx: this.idx,
      round: this.round,
      outcome: this.outcome,
    };
  }

  /** A read-only copy of a fight from its snapshot (the client uses it for hit chances and paths). */
  static restore(s: CombatSnap, weapons: Record<string, WeaponDef>, env: CombatEnv): Combat {
    const c = new Combat(s.units, weapons, env);
    c.idx = s.idx;
    c.round = s.round;
    c.outcome = s.outcome;
    return c;
  }

  get turnOrder(): Combatant[] {
    return this.order.filter((u) => !u.dead && !u.fled);
  }

  unit(id: string): Combatant | undefined {
    return this.units.find((u) => u.id === id);
  }

  private get jinxed(): boolean {
    return this.units.some((u) => u.jinx && !u.dead);
  }

  occupied(x: number, y: number, except?: string): boolean {
    return this.units.some((u) => !u.dead && !u.fled && u.id !== except && u.x === x && u.y === y);
  }

  blocked(x: number, y: number, except?: string): boolean {
    return this.env.blocked(x, y) || this.occupied(x, y, except);
  }

  pathfinder(forId: string): Pathfinder {
    return new Pathfinder(this.env.width, this.env.height, (x, y) => this.blocked(x, y, forId));
  }

  canSee(a: Tile, b: Tile): boolean {
    return lineOfSight((x, y) => this.env.opaque(x, y), a, b);
  }

  weaponOf(u: Combatant): WeaponDef {
    return this.weapons[u.weapon];
  }

  /** Chance, AP cost and a refusal reason (if any) for u attacking target with its current weapon. */
  preview(u: Combatant, target: Combatant): { chance: number; cost: number; reason: string | null } {
    const w = this.weaponOf(u);
    const cost = attackCost(u, w);
    const dist = tileDist(u, target);
    const chance = hitChance(u, target, w, dist);
    let reason: string | null = null;
    if (target.dead || target.fled || !enemies(u, target)) reason = 'Цель недоступна.';
    else if (target.under && (w.burst ?? 1) < 2) reason = 'Ушёл под соль: не достать. Выгнать может очередь или взрыв.';
    else if (dist > w.range) reason = w.skill === 'melee' ? 'Нужно подойти вплотную.' : 'Слишком далеко.';
    else if (!this.canSee(u, target)) reason = 'Не видно цели.';
    else if (w.ammo && u.side === 'player' && this.env.ammo(w.ammo, u) < 1) reason = 'Нет патронов.';
    else if (u.ap < cost) reason = 'Не хватает очков действия.';
    return { chance, cost, reason };
  }

  start(): CombatEvent[] {
    return this.beginTurn();
  }

  move(path: Tile[]): CombatEvent[] {
    const u = this.current;
    const steps = path.slice(0, Math.max(0, u.ap));
    if (!steps.length) return [];
    for (const s of steps) if (this.blocked(s.x, s.y, u.id)) return [];
    const last = steps[steps.length - 1];
    u.x = last.x;
    u.y = last.y;
    u.ap -= steps.length;
    return [{ t: 'move', id: u.id, path: steps }];
  }

  attack(targetId: string): CombatEvent[] {
    const u = this.current;
    const target = this.unit(targetId);
    if (!target) return [];
    const w = this.weaponOf(u);
    const p = this.preview(u, target);
    if (p.reason) return [{ t: 'log', text: p.reason }];
    u.ap -= p.cost;
    const counted = !!w.ammo && u.side === 'player';
    const rounds = Math.max(1, Math.min(w.burst ?? 1, counted ? this.env.ammo(w.ammo!, u) : Infinity));
    const ev: CombatEvent[] = rounds > 1 ? this.noise() : []; // a burst's racket drives a burrower up
    for (let i = 0; i < rounds && !target.dead; i++) {
      if (counted) this.env.spendAmmo(w.ammo!, u);
      const chance = i ? checkChance(p.chance - BURST_STEP * i) : p.chance;
      const r = rollAttack(chance, u.crit + (w.crit ?? 0), this.jinxed, this.env.rng);
      ev.push({ t: 'attack', id: u.id, target: target.id, weapon: u.weapon, ...r });
      if (r.fumble) {
        u.ap = 0;
        ev.push({ t: 'log', text: `${u.name}: ${w.skill === 'guns' ? 'осечка' : 'промах и потеря равновесия'}! Ход потерян.` });
        break;
      }
      if (!r.hit) continue;
      ev.push(...this.hit(u, target, w, r.crit));
      // a flamer's tongue catches whoever stands next to the target
      if (w.splash)
        for (const o of this.units)
          if (o !== target && o !== u && !o.dead && !o.fled && Math.hypot(o.x - target.x, o.y - target.y) <= w.splash) ev.push(...this.hit(u, o, w, false));
    }
    return ev;
  }

  /** One landed hit: damage, then what the weapon leaves behind (poison, fire, a stun; water puts fire out). */
  private hit(u: Combatant, target: Combatant, w: WeaponDef, crit: boolean): CombatEvent[] {
    const ev = this.damage(target, rollDamage(u, target, w, crit, this.env.rng), crit);
    return [...ev, ...this.afflict(target, w)];
  }

  private afflict(target: Combatant, w: WeaponDef): CombatEvent[] {
    if (target.dead || target.fled || target.side === 'object') return [];
    const ev: CombatEvent[] = [];
    const roll = () => 1 + Math.floor(this.env.rng() * 100);
    if (w.poison && resist(target, 'poison') < 100 && roll() > target.poisonSave) {
      target.poison = Math.max(target.poison, w.poison.turns);
      target.poisonDmg = Math.max(target.poisonDmg, w.poison.dmg);
      ev.push({ t: 'poisoned', id: target.id });
    }
    if (w.type === 'wet' && target.burn) {
      target.burn = 0;
      ev.push({ t: 'log', text: `${target.name}: огонь погас.` });
    }
    if (w.burn && resist(target, 'fire') < 100) {
      target.burn = Math.max(target.burn, w.burn.turns);
      target.burnDmg = Math.max(target.burnDmg, w.burn.dmg);
      ev.push({ t: 'burning', id: target.id });
    }
    if (w.stun && roll() <= w.stun.chance) {
      target.stunned = Math.max(target.stunned, w.stun.ap);
      ev.push({ t: 'stunned', id: target.id, ap: w.stun.ap });
    }
    return ev;
  }

  /** Chance and refusal for throwing `weapon` at a tile. */
  throwPreview(u: Combatant, weapon: string, at: Tile): { chance: number; cost: number; reason: string | null } {
    const w = this.weapons[weapon];
    const cost = w ? attackCost(u, w) : 0;
    const dist = tileDist(u, at);
    const chance = w ? checkChance(u.skills[w.skill] + u.hit - RANGE_PENALTY * Math.max(0, dist - u.aim)) : 0;
    let reason: string | null = null;
    if (!w?.thrown || !w.item) reason = 'Это не бросить.';
    else if (this.env.ammo(w.item, u) < 1) reason = 'Нечего бросать.';
    else if (dist > w.range) reason = 'Слишком далеко.';
    else if (!this.canSee(u, at)) reason = 'Не видно цели.';
    else if (u.ap < cost) reason = 'Не хватает очков действия.';
    return { chance, cost, reason };
  }

  /** Throw a grenade: on a miss it lands a tile or two off. */
  throwAt(weapon: string, at: Tile): CombatEvent[] {
    const u = this.current;
    const p = this.throwPreview(u, weapon, at);
    if (p.reason) return [{ t: 'log', text: p.reason }];
    const w = this.weapons[weapon];
    u.ap -= p.cost;
    this.env.spendAmmo(w.item!, u);
    const roll = 1 + Math.floor(this.env.rng() * 100);
    const hit = roll <= p.chance;
    let spot = { ...at };
    if (!hit) {
      const dx = Math.floor(this.env.rng() * 5) - 2;
      const dy = Math.floor(this.env.rng() * 5) - 2;
      const t = { x: Math.max(0, Math.min(this.env.width - 1, at.x + dx)), y: Math.max(0, Math.min(this.env.height - 1, at.y + dy)) };
      if (!this.env.blocked(t.x, t.y)) spot = t;
    }
    return [{ t: 'throw', id: u.id, item: weapon, x: spot.x, y: spot.y, chance: p.chance, roll, hit }, ...this.blastAt(`${u.id}:${weapon}`, spot, w.thrown!.radius, w.dmg, w)];
  }

  /** A healer bandages a friend next to it. */
  tend(targetId: string): CombatEvent[] {
    const u = this.current;
    const t = this.unit(targetId);
    if (!u.heal || !t || t.dead || tileDist(u, t) > 1 || u.ap < ITEM_AP) return [];
    u.ap -= ITEM_AP;
    const before = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + u.heal);
    return [{ t: 'use', id: u.id, item: 'bandage' }, { t: 'heal', id: t.id, amount: t.hp - before, hp: t.hp }, { t: 'log', text: `${u.name} перевязывает раны: ${t.name}.` }];
  }

  /** A consumable in a fight: heal, cure, extra AP or a resistance buff. */
  consume(item: string, use: CombatUse, heal = use.heal ?? 0): CombatEvent[] {
    const u = this.current;
    if (u.ap < ITEM_AP) return [{ t: 'log', text: 'Не хватает очков действия.' }];
    u.ap -= ITEM_AP;
    const ev: CombatEvent[] = [{ t: 'use', id: u.id, item }];
    if (use.cure) u.poison = 0;
    if (heal) {
      const before = u.hp;
      u.hp = Math.min(u.maxHp, u.hp + heal);
      ev.push({ t: 'heal', id: u.id, amount: u.hp - before, hp: u.hp });
    }
    if (use.ap) u.ap += use.ap;
    if (use.dr) {
      if (u.buff) u.dr -= u.buff.dr;
      u.buff = { dr: use.dr, turns: use.turns ?? 3 };
      u.dr += use.dr;
    }
    return ev;
  }

  /** Spend item AP and heal (amount computed by the caller from Medicine). */
  heal(amount: number, cure = false): CombatEvent[] {
    const u = this.current;
    if (u.ap < ITEM_AP) return [{ t: 'log', text: 'Не хватает очков действия.' }];
    u.ap -= ITEM_AP;
    if (cure) u.poison = 0;
    const before = u.hp;
    u.hp = Math.min(u.maxHp, u.hp + amount);
    return [{ t: 'heal', id: u.id, amount: u.hp - before, hp: u.hp }];
  }

  /** Co-op: a downed person gets back up with `hp` (0 = the attempt failed); costs the helper `ap`. */
  revive(by: Combatant, target: Combatant, hp: number, ap: number): CombatEvent[] {
    by.ap = Math.max(0, by.ap - ap);
    if (hp <= 0) return [{ t: 'log', text: `${by.name}: не получается привести в чувство ${target.name}.` }];
    target.dead = false;
    target.poison = 0;
    target.hp = Math.min(target.maxHp, hp);
    return [{ t: 'revive', id: target.id, by: by.id, hp: target.hp }];
  }

  swapWeapon(): string {
    const u = this.current;
    const i = u.weapons.indexOf(u.weapon);
    u.weapon = u.weapons[(i + 1) % u.weapons.length];
    return u.weapon;
  }

  private damage(target: Combatant, amount: number, crit: boolean): CombatEvent[] {
    const spared = !!target.spare && target.hp <= amount;
    target.hp = spared ? 1 : Math.max(0, target.hp - amount);
    const ev: CombatEvent[] = [{ t: 'damage', id: target.id, amount, hp: target.hp, crit }];
    if (spared) {
      // a story figure is not killed here: wounded, they leave the fight
      target.fled = true;
      ev.push({ t: 'flee', id: target.id });
      return ev;
    }
    if (target.hp > 0) return ev;
    target.dead = true;
    ev.push({ t: 'death', id: target.id });
    if (target.explode) ev.push(...this.blast(target));
    return ev;
  }

  private blast(src: Combatant): CombatEvent[] {
    return this.blastAt(src.id, src, src.explode!.radius, src.explode!.dmg);
  }

  /** Everyone within the radius takes a hit (armor and resistances help); barrels caught in it go off too. */
  private blastAt(id: string, at: Tile, radius: number, dmg: [number, number], w?: WeaponDef): CombatEvent[] {
    const ev: CombatEvent[] = [{ t: 'explode', id, x: at.x, y: at.y, radius }, ...this.noise()];
    for (const u of this.units) {
      if (u.dead || u.fled || Math.hypot(u.x - at.x, u.y - at.y) > radius) continue;
      const raw = dmg[0] + Math.floor(this.env.rng() * (dmg[1] - dmg[0] + 1));
      ev.push(...this.damage(u, typeCut(armorCut(raw, u), u, w?.type), false));
      if (w) ev.push(...this.afflict(u, w));
    }
    return ev;
  }

  endTurn(): CombatEvent[] {
    const ev = this.checkOutcome();
    if (ev.length) return ev;
    const dive = this.dive(this.current);
    if (dive.length) return [...dive, ...this.endTurn()];
    for (let n = 0; n < this.order.length; n++) {
      this.idx = (this.idx + 1) % this.order.length;
      if (this.idx === 0) this.round++;
      const u = this.current;
      if (!u.dead && !u.fled) return this.beginTurn();
    }
    return this.checkOutcome();
  }

  private beginTurn(): CombatEvent[] {
    const u = this.current;
    u.ap = u.maxAp;
    if (u.buff && --u.buff.turns <= 0) {
      u.dr -= u.buff.dr;
      u.buff = null;
    }
    const ev: CombatEvent[] = [{ t: 'turn', id: u.id }];
    if (u.stunned) {
      u.ap = Math.max(0, u.ap - u.stunned);
      ev.push({ t: 'log', text: `${u.name}: оглушение, −${u.stunned} ОД.` });
      u.stunned = 0;
    }
    if (u.poison > 0) {
      u.poison--;
      ev.push({ t: 'log', text: `${u.name}: яд жжёт.` }, ...this.damage(u, typeCut(u.poisonDmg, u, 'poison'), false));
    }
    if (u.burn > 0 && !u.dead) {
      u.burn--;
      ev.push({ t: 'log', text: `${u.name}: горит!` }, ...this.damage(u, typeCut(u.burnDmg, u, 'fire'), false));
    }
    if (u.dead) return [...ev, ...this.checkOutcome(), ...(this.outcome ? [] : this.endTurn())];
    if (u.burrow) ev.push(...this.surface(u));
    return ev;
  }

  /** A burrower's turn is over: if it did not come up this turn, it goes back under the salt. */
  private dive(u: Combatant): CombatEvent[] {
    if (!u.burrow || u.dead || u.fled || u.under) return [];
    if (u.up) {
      u.up = false;
      return [];
    }
    u.under = true;
    return [{ t: 'burrow', id: u.id }, { t: 'log', text: `${u.name} уходит под соль.` }];
  }

  /** Its turn begins under the salt: it comes up beside the sturdiest foe it can reach. */
  private surface(u: Combatant): CombatEvent[] {
    if (!u.under) return [];
    const foes = this.units.filter((o) => o.side !== 'object' && enemies(u, o) && !o.dead && !o.fled).sort((a, b) => b.hp - a.hp);
    for (const f of foes)
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const x = f.x + dx;
        const y = f.y + dy;
        if (x < 0 || y < 0 || x >= this.env.width || y >= this.env.height || this.blocked(x, y, u.id)) continue;
        Object.assign(u, { x, y, under: false, up: true });
        return [{ t: 'surface', id: u.id, x, y }, { t: 'log', text: `Соль вспучивается: ${u.name} выныривает у ${f.name}!` }];
      }
    return [];
  }

  /** A burst or a blast: whatever is under the salt comes up where it is, dazed. */
  private noise(): CombatEvent[] {
    const ev: CombatEvent[] = [];
    for (const u of this.units)
      if (u.under && !u.dead) {
        Object.assign(u, { under: false, up: true, stunned: Math.max(u.stunned, NOISE_STUN) });
        ev.push({ t: 'surface', id: u.id, x: u.x, y: u.y }, { t: 'log', text: `Грохот выгоняет наверх: ${u.name} оглушён.` });
      }
    return ev;
  }

  /** Is this unit out of reach of every living person: far away and out of sight? */
  private lost(u: Combatant, people: Combatant[]): boolean {
    return people.every((p) => tileDist(u, p) >= ESCAPE_DIST && !this.canSee(u, p));
  }

  /** Fleeing hostiles far out of sight leave the fight; the fight ends when one team is left. */
  checkOutcome(): CombatEvent[] {
    if (this.outcome) return [];
    const people = this.humans.filter((u) => !u.dead && !u.fled);
    const ev: CombatEvent[] = [];
    const ours = new Set(people.map(teamOf)); // the people's teams (allies under AI fight in them)
    for (const u of this.units)
      if (u.side === 'hostile' && !ours.has(teamOf(u)) && !u.dead && !u.fled && u.fleeing && people.length && this.lost(u, people)) {
        u.fled = true;
        ev.push({ t: 'flee', id: u.id });
      }
    const fighters = this.units.filter((u) => u.side !== 'object' && !u.dead && !u.fled);
    const teams = new Set(fighters.map(teamOf));
    const foes = fighters.filter((u) => u.side === 'hostile' && !ours.has(teamOf(u)));
    const oneParty = ours.size === 1;
    if (!people.length) this.outcome = 'defeat';
    else if (teams.size <= 1) {
      this.outcome = 'victory';
      this.winner = [...teams][0] ?? null;
    } else if (oneParty && foes.length && this.round > 1 && this.current.side === 'player' && foes.every((f) => this.lost(f, people))) this.outcome = 'escape'; // not before the other side had a turn
    if (this.outcome) ev.push({ t: 'end', outcome: this.outcome });
    return ev;
  }
}
