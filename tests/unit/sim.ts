// Headless nest fight used by the balance test: a simple but sensible player policy vs the AI.
import { Combat, type CombatEnv } from '../../src/core/combat/Combat';
import { nextAction } from '../../src/core/combat/ai';
import { barrelUnit, creatureUnit, playerUnit } from '../../src/core/combat/build';
import { tileDist } from '../../src/iso/LineOfSight';
import { Game } from '../../src/core/Game';
import { BuildDraft } from '../../src/core/character/BuildDraft';
import { XP_TABLE } from '../../src/core/character/defs';
import { newState } from '../../src/core/state';
import { mulberry32 } from '../../src/core/rng';
import { CONTENT } from '../../src/content';
import { enemies, type Combatant } from '../../src/core/combat/types';
import { Grid } from '../../src/core/world/Grid';
import { FIELDS } from './rooms';
import type { MapData } from '../../src/world/MapData';

export const NEST = { big: [26, 16], a: [28, 14], b: [35, 17], barrel: [27, 15], player: [31, 20] };

export function premadeGame(title: string, seed: number): Game {
  const d = new BuildDraft(CONTENT.character);
  d.applyPremade(CONTENT.character.premades.find((p) => p.title === title)!);
  return new Game(CONTENT, mulberry32(seed), newState(d.build(), CONTENT));
}

/** Prepare a combat scenario at the stated level, independent of the XP curve. */
export function toLevel(g: Game, level: number): Game {
  g.addXp(Math.max(0, XP_TABLE[level] - g.char.xp));
  return g;
}

export type Result = 'victory' | 'defeat' | 'escape' | 'stalemate';

export function nestFight(g: Game, barrel = true): Result {
  const units: Combatant[] = [
    playerUnit(g, NEST.player[0], NEST.player[1]),
    creatureUnit(CONTENT.creatures.scorpion_big, 'big', NEST.big[0], NEST.big[1]),
    creatureUnit(CONTENT.creatures.scorpion, 'a', NEST.a[0], NEST.a[1]),
    creatureUnit(CONTENT.creatures.scorpion, 'b', NEST.b[0], NEST.b[1]),
  ];
  if (barrel) units.push(barrelUnit('barrel', NEST.barrel[0], NEST.barrel[1]));
  return run(g, units);
}

/** The lone scorpion by the burnt van: a tutorial fight every build should survive. */
export function roadFight(g: Game): Result {
  return run(g, [playerUnit(g, 24, 25), creatureUnit(CONTENT.creatures.scorpion, 'road', 24, 29)]);
}

/** Chapter I finale gone wrong: the Trust's men at the pump, the hero at level 3 right next to the inspector. */
export const TRUST = { shluz: [11, 24], a: [9, 24], b: [12, 26], player: [12, 25] };
export function trustFight(g: Game): Result {
  toLevel(g, 3);
  g.state.hp = g.maxHp;
  const c = CONTENT.creatures;
  return run(g, [
    playerUnit(g, TRUST.player[0], TRUST.player[1]),
    creatureUnit(c.inspector, 'shluz', TRUST.shluz[0], TRUST.shluz[1]),
    creatureUnit(c.collector, 'a', TRUST.a[0], TRUST.a[1]),
    creatureUnit(c.collector, 'b', TRUST.b[0], TRUST.b[1]),
  ]);
}

/** Хромой Жнец by the pickup, the hero at level 3 a few tiles off. */
export function lameFight(g: Game): Result {
  toLevel(g, 3);
  g.state.hp = g.maxHp;
  return run(g, [playerUnit(g, 30, 22), creatureUnit(CONTENT.creatures.lame_reaper, 'lame', 36, 22)]);
}

/** Put a weapon in hand 1 (given if missing). */
export function arm(g: Game, weapon: string): Game {
  if (!g.count(weapon)) g.give(weapon);
  g.equip('weapon', weapon);
  return g;
}

/**
 * A battle on the road: the hero (at `level`) on the south-west side of a battlefield, a party's fighters on the
 * far side, and friends (caravan guards) beside the hero under AI.
 */
export function roadBattle(g: Game, foes: string[], field = 'enc_sand', friends: string[] = [], level = 3): Result {
  toLevel(g, level);
  g.state.hp = g.maxHp;
  const map = FIELDS[field];
  const grid = new Grid(map);
  const [hx, hy] = map.spawns![0];
  const units: Combatant[] = [playerUnit(g, hx, hy)];
  foes.forEach((id, i) => units.push(creatureUnit(CONTENT.creatures[id], `enc_${i}`, map.foes![i][0], map.foes![i][1])));
  friends.forEach((id, i) => units.push({ ...creatureUnit(CONTENT.creatures[id], `ally_${i}`, map.spawns![i + 1][0], map.spawns![i + 1][1]), team: 'player' }));
  return run(g, units, { width: grid.width, height: grid.height, blocked: (x, y) => grid.isSolid(x, y), opaque: (x, y) => grid.blocksSight(x, y) });
}

/** A fight on any map: the hero at a spot (level 3), foes and friends at theirs; `fists` for a bout on the ring. */
export function placedBattle(g: Game, map: MapData, at: [number, number], foes: [string, number, number][], friends: [string, number, number][] = [], fists = false): Result {
  toLevel(g, 3);
  g.state.hp = g.maxHp;
  const grid = new Grid(map);
  const me = playerUnit(g, at[0], at[1]);
  const units: Combatant[] = [me];
  foes.forEach(([id, x, y], i) => units.push(creatureUnit(CONTENT.creatures[id], `foe_${i}`, x, y)));
  friends.forEach(([id, x, y], i) => units.push({ ...creatureUnit(CONTENT.creatures[id], `ally_${i}`, x, y), team: 'player' }));
  if (fists) for (const u of units) Object.assign(u, { weapons: ['fists'], weapon: 'fists', spare: true });
  return run(g, units, { width: grid.width, height: grid.height, blocked: (x, y) => grid.isSolid(x, y), opaque: (x, y) => grid.blocksSight(x, y) });
}

function run(g: Game, units: Combatant[], ground: Partial<CombatEnv> = {}): Result {
  const c = new Combat(units, CONTENT.weapons, {
    width: 40,
    height: 40,
    rng: g.rng,
    blocked: () => false,
    opaque: () => false,
    ammo: (it) => g.count(it),
    spendAmmo: (it) => void g.take(it),
    ...ground,
  });
  c.start();
  for (let guard = 0; guard < 400 && !c.outcome; guard++) {
    const u = c.current;
    if (u.side === 'player') playerTurn(c, g, u);
    else for (let a = nextAction(c, u), n = 0; a.kind !== 'end' && n < 20; a = nextAction(c, u), n++) {
      if (a.kind === 'move') c.move(a.path);
      else if (a.kind === 'tend') c.tend(a.target);
      else {
        u.weapon = a.weapon;
        c.attack(a.target);
      }
      if (c.outcome || c.checkOutcome().length) break;
    }
    if (!c.outcome) c.endTurn();
  }
  return c.outcome ?? 'stalemate';
}

function playerTurn(c: Combat, g: Game, p: Combatant): void {
  for (let n = 0; n < 12 && p.ap > 0 && !c.outcome; n++) {
    if (p.hp < p.maxHp * 0.4 && g.count('bandage') && p.ap >= 2) {
      g.take('bandage');
      c.heal(8 + Math.floor(g.skill('medic') / 10));
      continue;
    }
    const foes = c.units.filter((u) => u.side === 'hostile' && enemies(p, u) && !u.dead && !u.fled);
    if (!foes.length) return;
    const barrel = c.unit('barrel');
    const bunched = barrel && !barrel.dead && foes.filter((f) => Math.hypot(f.x - barrel.x, f.y - barrel.y) <= 2.5).length >= 2;
    const target = bunched && tileDist(p, barrel) > 2 ? barrel : foes.sort((a, b) => tileDist(p, a) - tileDist(p, b))[0];
    // best expected damage among weapons usable right now
    let best: { w: string; v: number } | null = null;
    for (const w of p.weapons) {
      p.weapon = w;
      const pv = c.preview(p, target);
      const def = CONTENT.weapons[w];
      const v = ((def.dmg[0] + def.dmg[1]) / 2) * pv.chance;
      if (!pv.reason && pv.chance >= 15 && (!best || v > best.v)) best = { w, v };
    }
    if (best) {
      p.weapon = best.w;
      c.attack(target.id);
      continue;
    }
    p.weapon = p.weapons[0];
    if (tileDist(p, target) <= 1) return; // adjacent, nothing affordable
    const pf = c.pathfinder('player');
    const path = pf.find(p, pf.around(target.x, target.y));
    if (!path?.length) return;
    c.move(path.slice(0, 1));
  }
}
