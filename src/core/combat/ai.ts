// AI turn logic (monsters, and allies of the players): close in, strike with the best affordable weapon, flee when badly hurt.
import type { Tile } from '../../iso/Pathfinder';
import { tileDist } from '../../iso/LineOfSight';
import type { Combat } from './Combat';
import { attackCost } from './rules';
import { ITEM_AP } from './Combat';
import { enemies, type Combatant } from './types';

const HOLD_BACK = 2; // tiles from one of our people

export type AiAction = { kind: 'move'; path: Tile[] } | { kind: 'attack'; target: string; weapon: string } | { kind: 'tend'; target: string } | { kind: 'end' };

const TEND_BELOW = 0.5; // a healer goes to a friend under half health

export function nextAction(c: Combat, self: Combatant): AiAction {
  // a healer sees to a badly wounded friend first: bandage if next to them, else go to them
  if (self.heal && self.ap >= ITEM_AP) {
    const hurt = c.units
      .filter((u) => u !== self && u.side !== 'object' && !u.dead && !u.fled && !enemies(self, u) && u.hp < u.maxHp * TEND_BELOW)
      .sort((a, b) => tileDist(self, a) - tileDist(self, b))[0];
    if (hurt && tileDist(self, hurt) <= 1) return { kind: 'tend', target: hurt.id };
    if (hurt && self.ap > ITEM_AP) {
      const pf = c.pathfinder(self.id);
      const path = pf.find(self, pf.around(hurt.x, hurt.y));
      if (path?.length && path.length <= self.ap - ITEM_AP) return { kind: 'move', path };
    }
  }
  // the nearest foe (a person, or an ally of theirs), preferring one in sight
  let people = c.units.filter((u) => u.side !== 'object' && enemies(self, u) && !u.dead && !u.fled && !u.under);
  // held back: only those who came within reach of our people count
  if (self.holdBack) people = people.filter((f) => c.units.some((p) => p.side === 'player' && !p.dead && tileDist(p, f) <= HOLD_BACK));
  const rank = (u: Combatant) => tileDist(self, u) + (c.canSee(self, u) ? 0 : 100);
  const foe = people.sort((a, b) => rank(a) - rank(b))[0];
  if (!foe || self.ap <= 0) return { kind: 'end' };
  if (self.fleeAt > 0 && self.hp <= self.maxHp * self.fleeAt && !self.rooted) self.fleeing = true;
  if (self.fleeing) return flee(c, self, foe);

  const dist = tileDist(self, foe);
  // strongest weapon we can afford right now
  const usable = self.weapons
    .map((id) => ({ id, w: c.weapons[id] }))
    .filter(({ w }) => dist <= w.range && self.ap >= attackCost(self, w))
    .sort((a, b) => b.w.dmg[1] - a.w.dmg[1]);
  if (usable.length && c.canSee(self, foe)) return { kind: 'attack', target: foe.id, weapon: usable[0].id };
  if (self.rooted) return { kind: 'end' }; // it waits under the sand for the next one to come close
  // a gun needs no hug: in range with a clear shot but out of AP, wait; else stop at the first such spot
  const reach = Math.max(...self.weapons.map((id) => c.weapons[id].range));
  if (dist <= 1 || (dist <= reach && c.canSee(self, foe))) return { kind: 'end' };
  const pf = c.pathfinder(self.id);
  let path = pf.find(self, pf.around(foe.x, foe.y));
  if (!path?.length) return { kind: 'end' };
  const firing = path.findIndex((t) => tileDist(t, foe) <= reach && c.canSee(t, foe));
  if (reach > 1 && firing >= 0) path = path.slice(0, firing + 1);
  return { kind: 'move', path: path.slice(0, self.ap) };
}

function flee(c: Combat, self: Combatant, foe: Combatant): AiAction {
  const pf = c.pathfinder(self.id);
  let best: Tile | null = null;
  let bestD = tileDist(self, foe);
  for (let dy = -self.ap; dy <= self.ap; dy++)
    for (let dx = -self.ap; dx <= self.ap; dx++) {
      const t = { x: self.x + dx, y: self.y + dy };
      const d = tileDist(t, foe);
      if (d > bestD && pf.walkable(t.x, t.y)) {
        best = t;
        bestD = d;
      }
    }
  const path = best && pf.find(self, [best]);
  if (!path?.length) return { kind: 'end' };
  return { kind: 'move', path: path.slice(0, self.ap) };
}
