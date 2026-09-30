// The Rusty Well mission as a room: NPCs, triggers, dialogues, stealth, fights. Solo is this room
// with one player in the browser; co-op is the same room on the server with up to four.
import { Combat } from '../combat/Combat';
import { barrelUnit, creatureUnit, playerUnit } from '../combat/build';
import type { Combatant } from '../combat/types';
import { DialogueRunner } from '../DialogueRunner';
import { flagsHold } from '../Game';
import type { Dialogue, EncounterAction, FlagValue, GameStateData, Hook } from '../types';
import type { Tile } from '../../iso/Pathfinder';
import type { MapActor, MapData } from '../../world/MapData';
import { WALK_SPEED } from '../../config';
import { Hostiles, PATROL_SPEED, type Hostile } from '../world/Hostiles';
import { jobCount, jobFlag } from '../jobs';
import { Mover } from '../world/Mover';
import { Fight } from './Fight';
import { FightRules } from './FightRules';
import { useItem as useInWorld } from './ItemUse';
import { craft } from './Craft';
import { trade, type Deal } from './Trade';
import { rest } from './Days';
import { leaveToWorld, roadIntent, roadTick, visibleParties } from './Road';
import { placeOfMap } from '../places';
import { placeParty, settleMeeting } from './Meetings';
import { afterBattle, endBattle, takeLoot } from './RoadBattle';
import type { ActorSnap, EquipSlot, HostileSnap, Intent, ServerMsg } from './protocol';
import { Room, SNEAK_SPEED, type Link, type Player, type RoomOptions } from './Room';

const JOIN_RANGE = 10;
const BARREL_RANGE = 12;
const NOISE_RANGE = 12;
const WATCH_MS = 250;
const EDGE_MSG_MS = 5000;
const DEPART_MS = 10_000; // co-op: the others get this long to say «stay» before the party sets out
const FIRST_SEQ = 50; // sequence added to the side that strikes first

/** The part of the save every player shares. */
export interface WorldData {
  flags: GameStateData['flags'];
  quests: GameStateData['quests'];
  stats: GameStateData['stats'];
  stock?: GameStateData['stock']; // traders' goods and money (older saves have none yet)
  travel?: GameStateData['travel']; // where the party is on the world map
}

interface Npc {
  id: string;
  actor: MapActor;
  label: string;
  dialogue?: string;
  mover: Mover;
  leaving: boolean; // walking off the map: no more talk
}

interface Target {
  id: string;
  label: string;
  dialogue: string;
  npc: boolean;
  foot: { x: number; y: number; w: number; h: number };
}

export class MissionRoom extends Room {
  readonly npcs = new Map<string, Npc>();
  hostiles!: Hostiles;
  private talking = new Map<string, string>(); // target id -> player id
  private watchMs = 0;
  private sentHostile = new Map<string, string>();
  private travelSent = { ms: 0, seen: '' };
  private rules = new FightRules(this);
  defeated = false; // everyone fell: the server may roll the room back to its autosave
  meeting: string | null = null; // the party met on the road while its talk is open
  meetingAlly: string | null = null; // in a fight already going on: the side the bandits set upon
  pile: Record<string, number> | null = null; // the spoils of a road battle, for anyone to take
  ring = false; // the fight going on is a bout (see startCombat)
  quietRoad = false; // debug: nobody else on the world map
  private roadAction: EncounterAction | null = null; // how that talk ended, acted on once it closes
  private later: (() => void) | null = null;
  // co-op: the party is about to leave town, or move to another area of it (`to`)
  private departure: { by: string; left: number; to: { map: string; entry?: string } | null } | null = null;

  constructor(
    opts: RoomOptions,
    readonly world: WorldData,
  ) {
    super(opts);
    this.setup();
  }

  // ---------- the road ----------
  /** Out on the world map rather than in a place. */
  get onRoad(): boolean {
    return this.world.flags.at === 'world';
  }

  get worldMap() {
    return this.opts.worldMap;
  }

  closeTalk(p: Player): void {
    this.endDialogue(p);
  }

  /** Everyone gets a fresh snapshot (the party changed places). */
  resyncAll(): void {
    for (const p of this.players.values()) if (p.link) this.connect(p, p.link);
  }

  /** The party's spot on the world map for every client: now, or at most every `every` ms; the fog only when it changed. */
  sendTravel(force: boolean, every = 0): void {
    const t = this.world.travel;
    if (!t) return;
    if (!force && this.clock - this.travelSent.ms < every) return;
    this.travelSent.ms = this.clock;
    const seen = t.seen !== this.travelSent.seen ? t.seen : undefined;
    this.travelSent.seen = t.seen;
    this.broadcast({ t: 'travel', x: t.x, y: t.y, minute: t.minute, day: Number(this.world.flags.day ?? 1), path: t.path, target: t.target, sneak: t.sneak, seen, parties: visibleParties(this), escort: t.escort ? { to: this.content.locations[t.escort.to]?.name ?? t.escort.to, paused: t.escort.paused } : null });
  }

  /** Someone stepped onto the way out. Alone you go; in co-op the others get ten seconds to say «stay». */
  protected traveled(p: Player): void {
    this.lead(p, null);
  }

  /** The same for another area of this place (an exit at the edge, a hatch, a gangway). */
  protected moved(p: Player, map: string, entry?: string): void {
    if (!this.opts.maps?.[map]) return;
    this.lead(p, { map, entry });
  }

  private lead(p: Player, to: { map: string; entry?: string } | null): void {
    if (this.players.size <= 1) return to ? this.defer(() => void this.goTo(to.map, to.entry)) : void leaveToWorld(this, p);
    if (this.departure || this.fight) return;
    this.departure = { by: p.id, left: DEPART_MS, to };
    const where = to ? (placeOfMap(this.content.locations, to.map)?.area.name ?? this.opts.maps?.[to.map]?.name) : undefined;
    this.broadcast({ t: 'depart', by: p.game.char.name, ms: DEPART_MS, where });
    this.logAll(`${p.game.char.name} зовёт отряд ${where ? `в район «${where}»` : 'в путь'}. Через ${DEPART_MS / 1000} с уходят все, если никто не против.`);
  }

  private callOff(text: string): void {
    this.departure = null;
    this.broadcast({ t: 'depart', by: null, ms: 0 });
    this.logAll(text);
  }

  private departTick(dtMs: number): void {
    const d = this.departure;
    if (!d) return;
    if (this.fight) return this.callOff('Бой! Уход отложен.');
    d.left -= dtMs;
    if (d.left > 0) return;
    const p = this.players.get(d.by) ?? this.host;
    this.departure = null;
    this.broadcast({ t: 'depart', by: null, ms: 0 });
    if (d.to) this.goTo(d.to.map, d.to.entry);
    else if (p) leaveToWorld(this, p);
  }

  protected encountered(_p: Player, action: EncounterAction): void {
    this.roadAction = action;
  }

  /** Run this on the next tick (not in the middle of the road's own tick or a fight's callback). */
  defer(fn: () => void): void {
    this.later = fn;
  }

  addLoot(items: Record<string, number>): void {
    const pile = (this.pile ??= {});
    for (const [it, n] of Object.entries(items)) pile[it] = (pile[it] ?? 0) + n;
  }

  /** A talk made up on the spot (a meeting on the road), not one from the dialogue files. */
  talkOnRoad(p: Player, target: string, d: Dialogue): void {
    if (p.talk) this.endDialogue(p);
    this.roadAction = null;
    this.talking.set(target, p.id);
    p.talk = { runner: new DialogueRunner(p.game, d, target), target };
    this.sendDialogue(p);
  }

  /** No saves mid-battle on the road: the autosave before the meeting is where a defeat or a reload returns. */
  save(slot: 'main' | 'auto' = 'main'): void {
    if (this.world.travel?.encounter) return;
    super.save(slot);
  }

  /** Who stands on the current map, by the flags: NPCs, hostiles; the map's doors and water follow the flags too. */
  private setup(): void {
    const world = this.world;
    this.npcs.clear();
    this.talking.clear();
    this.sentHostile.clear();
    const cast = this.map.actors.filter((a) => a.id !== 'player' && this.present(a));
    for (const a of cast) if (!this.hostile(a)) this.addNpc(a);
    const flag = (k: string) => world.flags[k];
    // hostiles walk around NPCs and each other, but not through players
    const hostilePf = this.pathfinder((x, y) => this.npcAt(x, y));
    this.hostiles = new Hostiles(cast.filter((a) => this.hostile(a)), this.content.creatures, flag, () => hostilePf, (x, y) => this.grid.blocksSight(x, y));
    this.hostiles.onWalk = (h, path) => this.broadcast({ t: 'walk', id: h.id, path, speed: h.mover.speed });
    for (const [k, v] of Object.entries(world.flags)) this.grid.applyFlag(k, v);
    for (const h of this.hostiles.list) this.sentHostile.set(h.id, this.hostileKey(h.id));
  }

  /**
   * The whole party moves to another map (a town, an encounter): everyone arrives at the entry, talks end,
   * and every client gets a fresh snapshot of the new place.
   */
  goTo(mapId: string, entry?: string, extra: MapActor[] = []): boolean {
    const base = this.opts.maps?.[mapId];
    const map = base && extra.length ? { ...base, actors: [...base.actors, ...extra] } : base;
    if (!map || this.fight) return false;
    for (const p of this.players.values()) {
      if (p.talk) this.endDialogue(p);
      p.sneaking = false;
      p.mover.stop();
    }
    this.useMap(map);
    this.setup();
    this.host?.game.setFlag('at', mapId);
    this.host?.game.setFlag(`seen_${mapId}`, true); // on the town's plan from now on
    const spawn = map.actors.find((a) => a.id === 'player');
    const start: [number, number] = (entry ? map.entries?.[entry] : undefined) ?? map.entries?.default ?? [spawn?.x ?? 1, spawn?.y ?? 1];
    for (const p of this.players.values()) {
      p.mover.teleport(start[0], start[1]);
      const t = this.freeTileNear(p.mover.tile, p);
      p.mover.teleport(t.x, t.y);
      p.game.state.player = { x: t.x, y: t.y, dir: p.mover.dir };
    }
    if (this.host) this.runHooks(this.host, map.arrive);
    for (const p of this.players.values()) if (p.link) this.connect(p, p.link);
    this.save();
    return true;
  }

  /** Join with a game state (a new character or a save). Shared parts are swapped for the world's. */
  join(token: string, state: GameStateData, link: Link | null): Player {
    const known = this.byToken(token);
    if (known) {
      if (link) this.connect(known, link);
      return known;
    }
    state.flags = this.world.flags;
    state.quests = this.world.quests;
    state.stats = this.world.stats;
    state.stock = this.world.stock ??= {};
    state.travel = this.world.travel;
    const p = this.addPlayer(token, state, null);
    if (!state.log.length) p.game.log('Вы входите в Ржавый колодец. Где-то скрипит несмазанная помпа.');
    if (this.players.size > 1) {
      const t = this.freeTileNear(p.mover.tile, p);
      this.place(p, t.x, t.y);
    }
    this.broadcast({ t: 'spawn', actor: this.playerActor(p) }, p);
    if (link) this.connect(p, link);
    return p;
  }

  private freeTileNear(t: Tile, self: Player): Tile {
    const pf = this.playerPf();
    for (let r = 0; r < 6; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const x = t.x + dx;
          const y = t.y + dy;
          if (pf.walkable(x, y) && !this.playerAt(x, y, self)) return { x, y };
        }
    return t;
  }

  // ---------- snapshots ----------
  protected welcome(p: Player): ServerMsg {
    const actors: ActorSnap[] = [...this.players.values()].map((q) => this.playerActor(q));
    for (const n of this.npcs.values()) actors.push(this.npcActor(n));
    for (const h of this.hostiles.list) actors.push(this.hostileActor(h.id));
    return {
      t: 'welcome',
      you: p.id,
      map: this.onRoad ? 'world' : (this.map.id ?? 'rusty_well'),
      mode: this.mode,
      code: this.code,
      state: p.game.state,
      actors,
      hostiles: this.hostiles.list.map((h) => this.hostileSnap(h.id)),
      players: this.playerInfo(),
      combat: this.fight ? this.fight.sync() : null,
      sneaking: p.sneaking,
    };
  }

  protected welcomed(p: Player): void {
    this.fight?.drop(p.id); // a fresh snapshot shows the fight as it stands: no batch to wait for from this client
    if (p.talk) this.sendDialogue(p);
    if (this.onRoad) {
      this.travelSent.seen = ''; // a fresh client needs the fog too
      this.sendTravel(true);
    }
  }

  private npcActor(n: Npc): ActorSnap {
    const t = n.mover.tile;
    return { id: n.id, kind: 'npc', sheet: n.actor.sheet, x: t.x, y: t.y, dir: n.mover.dir, path: [...n.mover.path], speed: n.mover.speed, label: n.label, dialogue: n.dialogue };
  }

  private hostileActor(id: string): ActorSnap {
    const h = this.hostiles.byId(id)!;
    const t = h.mover.tile;
    return { id: h.id, kind: 'hostile', sheet: h.sheet, x: t.x, y: t.y, dir: h.mover.dir, path: [...h.mover.path], speed: h.mover.speed, label: h.def.name };
  }

  // ---------- who is on the map ----------
  /** Actors with an `if` come and go with the flags. */
  private present(a: MapActor): boolean {
    return flagsHold(this.world.flags, a.if);
  }

  /** A creature is hostile unless its `peace` flags still hold (people who talk first). */
  private hostile(a: MapActor): boolean {
    return !!a.creature && !(a.peace && flagsHold(this.world.flags, a.peace));
  }

  private addNpc(a: MapActor, from?: Tile): Npc {
    const at = from ?? { x: a.x, y: a.y };
    const n: Npc = { id: a.id, actor: a, label: a.label ?? a.id, dialogue: a.dialogue, mover: new Mover(at.x, at.y, a.dir, PATROL_SPEED), leaving: false };
    this.npcs.set(a.id, n);
    return n;
  }

  private npcPf(self: string) {
    return this.pathfinder((x, y) => [...this.npcs.values()].some((n) => n.id !== self && n.mover.tile.x === x && n.mover.tile.y === y) || !!this.hostiles.at(x, y));
  }

  private npcWalk(n: Npc, to: Tile, done?: () => void): void {
    const path = this.npcPf(n.id).find(n.mover.tile, [to]);
    if (!path?.length) return void done?.();
    n.mover.walk(path, done);
    this.broadcast({ t: 'walk', id: n.id, path, speed: n.mover.speed });
  }

  /** The flags changed: people arrive (walking in from `from`), leave, or turn hostile where they stand. */
  private recast(p: Player): void {
    const turned: string[] = [];
    for (const a of this.map.actors) {
      if (a.id === 'player') continue;
      const npc = this.npcs.get(a.id);
      const foe = this.hostiles.byId(a.id);
      if (!this.present(a)) {
        if (npc && !npc.leaving) this.leave(npc);
        if (foe) {
          this.hostiles.remove(a.id);
          this.sentHostile.delete(a.id);
          this.broadcast({ t: 'despawn', id: a.id });
        }
        continue;
      }
      if (this.hostile(a)) {
        if (foe) continue;
        const t = npc?.mover.tile;
        if (npc) this.dropNpc(npc, false); // the talk that provoked it ends on its own
        const h = this.hostiles.add(t ? { ...a, x: t.x, y: t.y, dir: npc!.mover.dir } : a);
        if (!h) continue;
        this.broadcast({ t: 'spawn', actor: this.hostileActor(h.id) });
        if (npc && !h.dead) turned.push(h.id);
      } else if (!npc) {
        const n = this.addNpc(a, a.from && { x: a.from[0], y: a.from[1] });
        this.broadcast({ t: 'spawn', actor: this.npcActor(n) });
        if (a.from) this.npcWalk(n, { x: a.x, y: a.y }, () => this.settle(n));
      }
    }
    // whoever turned on the players goes for the one who provoked them (once the talk is over)
    if (!turned.length) return;
    if (p.talk) p.pendingAlarm = [...(p.pendingAlarm ?? []), ...turned];
    else this.startCombat(p, turned);
  }

  /** Arrived at the post: turn the way the map says. */
  private settle(n: Npc): void {
    const t = n.mover.tile;
    n.mover.dir = n.actor.dir;
    this.broadcast({ t: 'place', id: n.id, x: t.x, y: t.y, dir: n.actor.dir });
  }

  /** Walk off the way they came, then vanish. */
  private leave(n: Npc): void {
    n.leaving = true;
    const from = n.actor.from;
    if (!from) return this.dropNpc(n);
    this.npcWalk(n, { x: from[0], y: from[1] }, () => this.dropNpc(n));
  }

  private dropNpc(n: Npc, endTalk = true): void {
    this.npcs.delete(n.id);
    const who = this.talking.get(n.id);
    if (endTalk && who) this.endDialogue(this.players.get(who)!);
    this.broadcast({ t: 'despawn', id: n.id });
  }

  private hostileSnap(id: string): HostileSnap {
    const h = this.hostiles.byId(id)!;
    return { id, name: h.def.name, asleep: h.asleep, lured: h.lured > 0, dead: h.dead, gone: h.gone };
  }

  private hostileKey(id: string): string {
    const s = this.hostileSnap(id);
    return `${s.asleep}|${s.lured}|${s.dead}|${s.gone}`;
  }

  protected flushMore(): void {
    for (const h of this.hostiles.list) {
      const key = this.hostileKey(h.id);
      if (this.sentHostile.get(h.id) === key) continue;
      this.sentHostile.set(h.id, key);
      this.broadcast({ t: 'hostile', ...this.hostileSnap(h.id) });
    }
  }

  // ---------- intents ----------
  protected intent(p: Player, i: Intent): void {
    if (this.fight) return this.rules.command(p, i);
    if (this.onRoad) {
      if (p.talk) return void (i.t === 'choose' && this.choose(p, i.i));
      if (roadIntent(this, p, i)) return;
      if (i.t === 'equip') return this.equip(p, i.slot, i.item);
      if (i.t === 'useItem') return void p.game.consume(i.item);
      if (i.t === 'seen') return this.seen(p, i.chapter); // the chapter screen shows as the party leaves town
      return;
    }
    if (p.talk) {
      if (i.t === 'choose') this.choose(p, i.i);
      return;
    }
    switch (i.t) {
      case 'walk':
        return this.walkTo(p, i.x, i.y);
      case 'interact':
        return this.interact(p, i.id);
      case 'engage':
        if (this.hostiles.byId(i.id) && this.hostiles.alive.includes(this.hostiles.byId(i.id)!)) this.startCombat(p, [i.id]);
        return;
      case 'useItem':
        return this.useItem(p, i.item);
      case 'sneak':
        return this.setSneak(p, i.on);
      case 'seen':
        return this.seen(p, i.chapter);
      case 'give':
        return this.handOver(p, i.to, i.item);
      case 'equip':
        return this.equip(p, i.slot, i.item);
      case 'craft':
        return this.craft(p, i.recipe);
      case 'trade':
        return this.trade(p, i.trader, { buy: i.buy, sell: i.sell });
      case 'take':
        return takeLoot(this, p, i.item);
      case 'stay':
        if (this.departure) this.callOff(`${p.game.char.name} просит задержаться.`);
        return;
      case 'lootDone':
        if (this.pile) endBattle(this);
        return;
    }
  }

  private seen(p: Player, chapter = 1): void {
    p.game.setFlag(`chapter${chapter}_seen`);
    this.save();
  }

  protected debug(p: Player, op: Extract<Intent, { t: 'debug' }>['op']): void {
    if (op.op === 'combat') return this.startCombat(p, op.ids);
    if (op.op === 'goto') return void this.goTo(op.map, op.entry);
    if (op.op === 'quiet') {
      this.quietRoad = op.on;
      if (op.on && this.world.travel) this.world.travel.parties = [];
      return;
    }
    if (op.op === 'party') return void placeParty(this, op.tpl, op.dx, op.dy, op.members, op.route);
    super.debug(p, op);
  }

  // ---------- walking and talking ----------
  npcAt(x: number, y: number): boolean {
    for (const n of this.npcs.values()) {
      const t = n.mover.tile;
      if (t.x === x && t.y === y) return true;
    }
    return false;
  }

  /** Players walk around NPCs and live monsters; other players never block them. */
  playerPf() {
    return this.pathfinder((x, y) => this.npcAt(x, y) || !!this.hostiles.at(x, y));
  }

  private walkTo(p: Player, x: number, y: number): void {
    if (!this.grid.inside(x, y)) {
      if (this.clock - p.lastEdge > EDGE_MSG_MS) p.game.log('Дальше только скалы и пустошь.');
      p.lastEdge = this.clock;
      return;
    }
    const pf = this.playerPf();
    if (!pf.walkable(x, y)) return;
    const path = pf.find(p.mover.tile, [{ x, y }]);
    if (!path) return p.game.log('Туда не пройти.');
    this.walk(p, path, () => this.savePos(p));
  }

  private target(id: string): Target | null {
    const n = this.npcs.get(id);
    if (n?.dialogue && !n.leaving) {
      const t = n.mover.tile;
      return { id, label: n.label, dialogue: n.dialogue, npc: true, foot: { x: t.x, y: t.y, w: 1, h: 1 } };
    }
    const prop = this.grid.props.get(id);
    const o = prop?.obj;
    if (!prop || !o?.dialogue || !prop.visible) return null;
    return { id, label: o.label ?? id, dialogue: o.dialogue, npc: false, foot: { x: o.x, y: o.y, w: o.w, h: o.h } };
  }

  /** Walk next to a target, then talk to / use it. */
  private interact(p: Player, id: string): void {
    const t = this.target(id);
    if (!t) return;
    const f = t.foot;
    const pf = this.playerPf();
    const path = pf.find(p.mover.tile, pf.around(f.x, f.y, f.w, f.h));
    if (!path) return p.game.log(`${t.label}: не подойти.`);
    this.walk(p, path, () => {
      const cx = f.x + (f.w - 1) / 2;
      const cy = f.y + (f.h - 1) / 2;
      p.mover.faceTile(cx, cy);
      this.broadcast({ t: 'face', id: p.id, x: cx, y: cy });
      const n = t.npc ? this.npcs.get(t.id) : undefined;
      if (n) {
        const me = p.mover.tile;
        n.mover.faceTile(me.x, me.y);
        this.broadcast({ t: 'face', id: n.id, x: me.x, y: me.y });
      }
      this.openDialogue(p, t);
    });
  }

  private openDialogue(p: Player, t: Target): void {
    const d = this.content.dialogues[t.dialogue];
    if (!d || this.fight) return;
    const other = this.talking.get(t.id);
    if (other && other !== p.id) {
      const who = this.players.get(other)?.game.char.name ?? 'кто-то';
      return p.game.log(`${t.label}: сейчас занят разговором с ${who}.`);
    }
    this.talking.set(t.id, p.id);
    p.talk = { runner: new DialogueRunner(p.game, d, t.dialogue), target: t.id };
    this.sendDialogue(p);
  }

  private sendDialogue(p: Player): void {
    const r = p.talk?.runner;
    if (!r) return;
    if (r.done) return this.endDialogue(p);
    const d = r.dialogue;
    this.send(p, { t: 'dialogue', id: r.id, speaker: d.speaker, portrait: d.portrait, text: r.text, options: r.options().map((o) => o.label) });
  }

  private choose(p: Player, i: number): void {
    p.talk?.runner.choose(Number(i));
    this.sendDialogue(p);
  }

  private endDialogue(p: Player): void {
    const talk = p.talk;
    if (!talk) return;
    p.talk = null;
    this.talking.delete(talk.target);
    this.send(p, { t: 'dialogueEnd', id: talk.runner.id });
    this.savePos(p);
    const ids = p.pendingAlarm;
    p.pendingAlarm = null;
    if (ids?.length) this.startCombat(p, ids);
    if (this.meeting && talk.target === `road_${this.meeting}`) settleMeeting(this, this.roadAction);
  }

  savePos(p: Player): void {
    if (this.fight) return;
    const t = p.mover.tile;
    p.game.state.player = { x: t.x, y: t.y, dir: p.mover.dir };
    this.save();
  }

  // ---------- the world moves ----------
  protected update(dtMs: number): void {
    const later = this.later;
    this.later = null;
    later?.();
    this.departTick(dtMs);
    if (this.onRoad) {
      roadTick(this, dtMs);
      for (const p of this.players.values()) if (p.link && !p.modal) p.game.tick(dtMs);
      return;
    }
    for (let left = dtMs; left > 0; left -= 50) {
      const dt = Math.min(50, left);
      for (const p of this.players.values()) p.mover.update(dt / 1000);
      for (const n of [...this.npcs.values()]) n.mover.update(dt / 1000);
    }
    // chems wear off while you play (not while a window or a talk holds the world still)
    for (const p of this.players.values()) if (p.link && !p.modal && !p.talk) p.game.tick(dtMs);
    if (!this.fight) {
      this.hostiles.update(Math.min(dtMs, 50));
      this.watchMs += dtMs;
      if (this.watchMs > WATCH_MS) {
        this.watchMs = 0;
        for (const p of this.players.values()) this.watch(p);
      }
    }
    if ([...this.players.values()].some((p) => p.link && !p.modal && !p.talk)) this.world.stats.playMs += dtMs;
  }

  protected enteredTile(p: Player, t: Tile): void {
    const g = p.game;
    for (const ex of this.map.exits ?? []) {
      if (t.x < ex.x || t.y < ex.y || t.x >= ex.x + ex.w || t.y >= ex.y + ex.h) continue;
      if (!g.testAll(ex.if)) {
        if (ex.closed && this.clock - p.lastEdge > EDGE_MSG_MS) g.log(ex.closed);
        p.lastEdge = this.clock;
        continue;
      }
      if (ex.effects) g.apply(ex.effects);
      if (ex.to === 'world') this.traveled(p);
      else this.moved(p, ex.to, ex.entry);
      return;
    }
    for (const tr of this.map.triggers) {
      if (t.x < tr.x || t.y < tr.y || t.x >= tr.x + tr.w || t.y >= tr.y + tr.h) continue;
      const key = `trigger_${tr.id}`;
      if ((!tr.repeat && g.flag(key)) || !g.testAll(tr.if)) continue;
      if (!tr.repeat) g.setFlag(key);
      if (tr.log) g.log(tr.log);
      g.apply(tr.effects);
      this.save();
    }
    if (!this.fight) this.watch(p);
  }

  /** Does any hostile notice this player right now? Then the fight starts. */
  private watch(p: Player): void {
    if (this.fight || p.modal || p.talk || !p.link) return;
    const h = this.hostiles.noticedBy(p.mover.tile, p.sneaking, p.game);
    if (!h) return;
    p.game.log(p.sneaking ? `${h.def.name} замечает вас!` : `${h.def.name} замечает вас и бросается в атаку!`);
    this.startCombat(p, this.hostiles.group(h.group).map((x) => x.id));
  }

  setSneak(p: Player, on: boolean): void {
    if (this.fight) return;
    const g = p.game;
    p.sneaking = on;
    p.mover.speed = on ? SNEAK_SPEED : WALK_SPEED;
    g.log(on ? `Вы крадётесь. Скрытность ${g.skill('sneak')}%.` : 'Вы идёте в полный рост.');
    this.send(p, { t: 'sneak', on });
    if (p.mover.moving) this.broadcast({ t: 'walk', id: p.id, path: [...p.mover.path], speed: p.mover.speed });
  }

  /** A deal needs the trader standing close by (their NPC shares the trader's id). */
  private trade(p: Player, trader: string, deal: Deal): void {
    const n = this.npcs.get(trader);
    if (!this.content.traders[trader] || !n || n.leaving) return;
    const [a, b] = [p.mover.tile, n.mover.tile];
    if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > 3) return p.game.log(`${n.label}: подойдите ближе.`);
    if (trade(p.game, trader, deal)) this.save();
  }

  /** Crafting needs the right bench or a fire within two tiles. */
  private craft(p: Player, id: string): void {
    const r = this.content.recipes[id];
    if (!r) return;
    const me = p.mover.tile;
    const near = this.map.objects.some((o) => o.bench === r.bench && Math.max(Math.abs(me.x - (o.x + (o.w - 1) / 2)) - (o.w - 1) / 2, Math.abs(me.y - (o.y + (o.h - 1) / 2)) - (o.h - 1) / 2) <= 2);
    if (!near) return p.game.log(r.bench === 'fire' ? 'Для этого нужен костёр рядом.' : 'Для этого нужен верстак рядом.');
    if (craft(p.game, id)) this.save();
  }

  private equip(p: Player, slot: EquipSlot, item: string | null): void {
    const before = Room.sheetOf(p);
    p.game.equip(slot, item);
    if (Room.sheetOf(p) !== before) this.redraw(p);
    this.infoChanged();
  }

  private useItem(p: Player, item: string): void {
    const g = p.game;
    const sheet = Room.sheetOf(p);
    this.useWorld(p, g, item);
    if (Room.sheetOf(p) !== sheet) this.redraw(p); // put on or took off armor
  }

  private useWorld(p: Player, g: Player['game'], item: string): void {
    useInWorld(
      {
        game: g,
        grid: this.grid,
        hostiles: this.hostiles,
        player: p.mover.tile,
        walkable: (x, y) => this.playerPf().walkable(x, y),
        startCombat: (ids) => this.startCombat(p, ids),
        afterKills: () => {
          this.clearedCheck(p);
          this.save();
        },
        killed: (h) => this.jobKill(p, h),
        blast: (at, r) => this.broadcast({ t: 'fx', kind: 'blast', x: at.x, y: at.y, r }),
      },
      item,
    );
  }

  /** Hand an item to another player standing close by. */
  private handOver(p: Player, to: string, item: string): void {
    const q = this.players.get(to);
    if (!q || q === p || !p.game.count(item)) return;
    const a = p.mover.tile;
    const b = q.mover.tile;
    if (Math.hypot(a.x - b.x, a.y - b.y) > 3) return p.game.log(`${q.game.char.name} слишком далеко.`);
    const qty = item === 'ammo' ? p.game.count(item) : 1;
    p.game.take(item, qty);
    q.game.give(item, qty);
    p.game.log(`Вы отдаёте: ${this.content.items[item]?.name ?? item}${qty > 1 ? ` ×${qty}` : ''} → ${q.game.char.name}.`);
  }

  // ---------- flags and quests ----------
  protected flagChanged(p: Player, key: string, value: unknown): void {
    this.grid.applyFlag(key, value as FlagValue);
    this.broadcast({ t: 'flag', key, value: value as FlagValue });
    this.markAll();
    // the crowbar screech wakes a sleeping nest nearby, as soon as the door dialogue closes
    if (key === 'door_method' && value === 'монтировка') {
      const nest = this.hostiles.nearGroup(p.mover.tile, NOISE_RANGE).filter((h) => h.lured <= 0);
      if (nest.length) {
        p.game.log('Скрежет будит скорпионов!');
        p.pendingAlarm = nest.map((h) => h.id);
      }
    }
    if (key === 'valve_taken' && this.hostiles.group('nest').length && !this.world.flags.nest_cleared) p.game.setStage('nest', 'avoided');
    this.recast(p);
  }

  /** A quest moved on for one player: everybody shares the stage and its XP. */
  protected questChanged(p: Player, quest: string, stage: string): void {
    this.markAll();
    const xp = this.content.quests[quest]?.stages.find((s) => s.id === stage)?.xp;
    for (const q of this.players.values()) {
      if (q === p) continue;
      q.game.log(`Журнал обновлён: ${this.content.quests[quest].title}.`);
      if (xp) q.game.addXp(xp);
      this.send(q, { t: 'gev', ev: 'quest', quest, stage });
    }
  }

  /** A kill counts for every active hunt that wants this kind, group or very beast. */
  jobKill(p: Player, h: Hostile): void {
    for (const [id, j] of Object.entries(this.content.jobs)) {
      const m = j.hunt;
      if (!m || this.world.flags[jobFlag(id)] !== 'active') continue;
      if ((m.id && m.id !== h.id) || (m.group && m.group !== h.group) || (m.creature && m.creature !== h.creature) || (m.tag && !h.def.tags?.includes(m.tag))) continue;
      const n = Number(this.world.flags[jobCount(id)] ?? 0) + 1;
      p.game.setFlag(jobCount(id), n);
      if (n <= m.count) p.game.log(`Контракт «${j.title}»: ${n} из ${m.count}.`);
    }
  }

  protected rested(p: Player): void {
    rest(this, p);
  }

  /** Every map the room knows, the current one included. */
  allMaps(): Record<string, MapData> {
    return { ...(this.opts.maps ?? {}), [this.map.id ?? 'rusty_well']: this.map };
  }

  /** Morning: burrow dwellers and the like are back, alive, on every map (here at once, elsewhere when the party comes). */
  respawn(): void {
    const g = this.host?.game;
    if (!g) return;
    for (const map of Object.values(this.allMaps()))
      for (const a of map.actors) {
        if (!a.respawn) continue;
        if (map === this.map && this.hostiles.byId(a.id)) {
          this.hostiles.remove(a.id);
          this.sentHostile.delete(a.id);
          this.broadcast({ t: 'despawn', id: a.id });
        }
        for (const k of [`dead_${a.id}`, `fled_${a.id}`]) if (this.world.flags[k]) g.setFlag(k, false);
      }
    if (!this.onRoad) this.recast(this.host!);
  }

  /**
   * A bout on the ring is over: nobody died. The loser comes round at the bar, the boxer is back behind the ropes
   * as a person to talk to (the map's `ring_fight` flag starts a bout; `ring_result` says how it went).
   */
  private boutOver(combat: Combat, outcome: 'victory' | 'defeat' | 'escape'): void {
    this.ring = false;
    for (const q of this.players.values()) {
      const u = combat.unit(q.id);
      if (!u) continue;
      q.game.state.hp = Math.max(1, u.hp);
      q.game.events.emit('stats');
    }
    const host = this.host!;
    const boxers = this.hostiles.list.filter((x) => x.ring);
    for (const h of boxers) {
      this.hostiles.remove(h.id);
      this.sentHostile.delete(h.id);
      this.broadcast({ t: 'despawn', id: h.id });
    }
    // peace first, so the recast brings the boxer back as a person, not as a fresh foe
    host.game.setFlag('ring_result', outcome === 'victory' ? 'won' : outcome === 'defeat' ? 'lost' : 'left');
    host.game.setFlag('ring_fight', false);
    for (const h of boxers) for (const k of [`dead_${h.id}`, `fled_${h.id}`]) if (this.world.flags[k]) host.game.setFlag(k, false);
    this.logAll(outcome === 'victory' ? 'Бой окончен: противник на полу.' : outcome === 'defeat' ? 'Вы приходите в себя у стойки. Бой проигран.' : 'Вы уходите с ринга.');
    this.recast(host);
    for (const q of this.players.values()) this.savePos(q);
  }

  /** Hooks that fire on arriving at a place and every morning spent there (a raid on its day). */
  runHooks(p: Player, hooks: Hook[] | undefined): void {
    for (const h of hooks ?? []) {
      if (!p.game.testAll(h.if)) continue;
      if (h.log) this.logAll(h.log);
      p.game.apply(h.effects);
    }
  }

  /** A group with nobody left standing (the nest, the Trust's men): the map says what that means. */
  clearedCheck(p: Player): void {
    for (const c of this.map.cleared ?? []) {
      if (this.hostiles.group(c.group).length || !p.game.testAll(c.if)) continue;
      if (c.log) p.game.log(c.log);
      p.game.apply(c.effects);
    }
  }


  // ---------- fights ----------
  /**
   * `foesFirst`: an ambush, or a getaway that failed: the other side acts before anyone of ours.
   * A fight with a boxer is a bout on the ring: fists only, a knockout instead of death, no items.
   */
  startCombat(p: Player, ids: string[], { foesFirst = false } = {}): void {
    if (this.fight) return;
    for (const q of this.players.values()) {
      if (q.sneaking) this.setSneak(q, false);
      if (q.talk && q !== p) this.endDialogue(q);
      this.halt(q);
    }
    this.save('auto');
    const people = [...this.players.values()];
    const dist = (a: Tile, b: Tile) => Math.hypot(a.x - b.x, a.y - b.y);
    // allies always come; foes that are called or close by join
    const near = this.hostiles.alive.filter((h) => h.ally || ids.includes(h.id) || people.some((q) => dist(h.mover.tile, q.mover.tile) <= JOIN_RANGE));
    this.hostiles.wake(near);
    this.ring = near.some((h) => h.ring);
    const units: Combatant[] = people.map((q) => playerUnit(q.game, q.mover.tile.x, q.mover.tile.y, q.id));
    if (this.ring) for (const u of units) Object.assign(u, { weapons: ['fists'], weapon: 'fists', spare: true });
    for (const h of near) {
      const t = h.mover.tile;
      h.mover.stop();
      h.mover.teleport(t.x, t.y);
      h.lured = 0;
      this.broadcast({ t: 'place', id: h.id, x: t.x, y: t.y, dir: h.mover.dir });
      const u = creatureUnit(h.def, h.id, t.x, t.y);
      if (h.ally) u.team = 'player';
      else if (foesFirst) u.seq += FIRST_SEQ;
      if (this.ring) Object.assign(u, { weapons: ['fists'], weapon: 'fists', spare: true });
      units.push(u);
    }
    if (!this.ring)
      for (const o of this.grid.barrels((id) => !!this.world.flags[`blown_${id}`]))
        if (units.some((u) => dist(u, o) <= BARREL_RANGE)) units.push(barrelUnit(o.id, o.x, o.y));
    const combat = new Combat(units, this.content.weapons, {
      width: this.grid.width,
      height: this.grid.height,
      rng: () => this.roll(),
      blocked: (x, y) => this.grid.isSolid(x, y),
      opaque: (x, y) => this.grid.blocksSight(x, y),
      ammo: (it, u) => this.players.get(u.id)?.game.count(it) ?? 0,
      spendAmmo: (it, u) => void this.players.get(u.id)?.game.take(it),
    });
    this.logAll('Бой! Ходы по очереди: клик по врагу атакует, клик по земле ведёт, пробел завершает ход.');
    this.fight = new Fight(combat, this.rules.host());
    this.fight.start();
  }

  /** The fight is over: positions and HP back to the world, monsters go home. */
  combatOver(combat: Combat, outcome: 'victory' | 'defeat' | 'escape'): void {
    this.fight = null;
    for (const q of this.players.values()) {
      const u = combat.unit(q.id);
      if (!u) continue;
      q.mover.teleport(u.x, u.y);
      q.game.state.player = { x: u.x, y: u.y, dir: q.mover.dir };
      if (outcome !== 'defeat') {
        q.game.state.hp = Math.max(1, u.hp);
        q.game.events.emit('stats');
      }
      q.downed = false;
    }
    if (outcome === 'victory') this.logAll('Бой окончен.');
    if (outcome === 'escape') this.logAll('Вы оторвались от погони.');
    for (const h of this.hostiles.alive) {
      const u = combat.unit(h.id);
      if (u) h.mover.teleport(u.x, u.y);
    }
    this.broadcast({ t: 'combatEnd', outcome });
    if (this.ring) return this.boutOver(combat, outcome);
    if (outcome === 'defeat') {
      this.defeated = true;
      this.logAll('Пустошь забирает вас.');
      this.broadcast({ t: 'gameOver', canLoad: true });
      return;
    }
    if (this.world.travel?.encounter) return void (this.later = () => afterBattle(this, outcome));
    if (this.host) this.clearedCheck(this.host);
    for (const h of this.hostiles.alive) this.hostiles.walk(h, h.home);
    for (const q of this.players.values()) this.savePos(q);
  }
}
