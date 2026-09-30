// Using inventory items in the world: bandages, antidote, bait for scorpions, the firebomb.
import type { Game } from '../Game';
import type { Tile } from '../../iso/Pathfinder';
import type { Grid } from '../world/Grid';
import { LURE_MS, type Hostile, type Hostiles } from '../world/Hostiles';

export const BAIT_RANGE = 10;
export const BOMB_RANGE = 9;
const BOMB_RADIUS = 3;

export interface ItemWorld {
  game: Game;
  grid: Grid;
  hostiles: Hostiles;
  player: Tile;
  walkable(x: number, y: number): boolean;
  startCombat(ids: string[]): void;
  afterKills(): void;
  killed(h: Hostile): void;
  blast(at: Tile, radius: number): void;
}

export function useItem(w: ItemWorld, item: string): void {
  const g = w.game;
  if (!g.count(item)) return;
  const def = g.content.items[item];
  if (def?.use === 'wear') return void g.equip('armor', g.state.equipped.armor === item ? null : item);
  if (def?.use === 'charm') return void g.equip('charm', item);
  if (item === 'bandage') return void g.useBandage();
  if (item === 'antidote') return g.log('Вы не отравлены. Противоядие пригодится в бою.');
  if (def?.use === 'grenade') return g.log('Прибережём для боя.');
  if (def?.use === 'stim' || def?.use === 'drink' || def?.use === 'eat') return void g.consume(item);
  if (def?.use === 'bait') return bait(w, item);
  if (item === 'firebomb') return bomb(w);
  g.log('Это нельзя использовать просто так.');
}

function center(group: Hostile[]): Tile {
  const x = group.reduce((s, h) => s + h.mover.tile.x, 0) / group.length;
  const y = group.reduce((s, h) => s + h.mover.tile.y, 0) / group.length;
  return { x: Math.round(x), y: Math.round(y) };
}

/** Throw the lizard beyond the group, away from the player: they follow it for a while. */
/** Throw bait beyond the group, away from the player. The scented one carries further, holds them longer and is harder to botch. */
function bait(w: ItemWorld, item: string): void {
  const g = w.game;
  const scent = item === 'scent_lizard';
  const group = w.hostiles.nearGroup(w.player, scent ? BAIT_RANGE + 4 : BAIT_RANGE).filter((h) => h.lured <= 0);
  if (!group.length) return g.log('Приманка сейчас ни к чему: скорпионов поблизости нет.');
  g.take(item);
  const c = center(group);
  if (!g.hasPerk('tracker') && !g.check({ skill: 'survival' }, scent ? 40 : 20).success) {
    g.log('Ящерица шлёпается у самого гнезда. Скорпионы просыпаются!');
    return w.startCombat(group.map((h) => h.id));
  }
  const dx = c.x - w.player.x;
  const dy = c.y - w.player.y;
  const len = Math.hypot(dx, dy) || 1;
  const want = { x: Math.round(c.x + (dx / len) * 9), y: Math.round(c.y + (dy / len) * 9) };
  const spot = nearestWalkable(w, want) ?? c;
  w.hostiles.lure(group, spot, scent ? LURE_MS * 2 : LURE_MS);
  if (group[0].group === 'nest') g.setFlag('nest_lured');
  g.log('Ящерица летит далеко в пустошь. Скорпионы, щёлкая клешнями, семенят за ней.');
}

function nearestWalkable(w: ItemWorld, t: Tile): Tile | null {
  for (let r = 0; r < 8; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const x = Math.max(1, Math.min(w.grid.width - 2, t.x + dx));
        const y = Math.max(1, Math.min(w.grid.height - 2, t.y + dy));
        if (w.walkable(x, y)) return { x, y };
      }
  return null;
}

/** Firebomb: lands where it catches the most of the group (a fuel barrel there joins in); survivors scatter for good. */
function bomb(w: ItemWorld): void {
  const g = w.game;
  const group = w.hostiles.nearGroup(w.player, BOMB_RANGE);
  if (!group.length) return g.log('Бросать не в кого: скорпионов поблизости нет.');
  g.take('firebomb');
  if (group[0].group === 'nest') g.setFlag('nest_bombed');
  const barrels = w.grid.barrels((id) => !!g.flag(`blown_${id}`));
  const spots: (Tile & { barrel: boolean })[] = [...group.map((h) => ({ ...h.mover.tile, barrel: false })), ...barrels.map((o) => ({ x: o.x, y: o.y, barrel: true }))];
  const covered = (c: Tile, r: number) => group.filter((h) => Math.hypot(h.mover.tile.x - c.x, h.mover.tile.y - c.y) <= r);
  const c = spots.reduce((best, s) => {
    const n = covered(s, BOMB_RADIUS).length + (s.barrel ? 0.5 : 0);
    return n > best.n ? { s, n } : best;
  }, { s: spots[0], n: -1 }).s;
  const booms: { at: Tile; r: number }[] = [{ at: c, r: BOMB_RADIUS }];
  w.blast(c, BOMB_RADIUS);
  g.log('Бомба разрывается прямо в гнезде!');
  for (const o of barrels) {
    if (Math.hypot(o.x - c.x, o.y - c.y) > BOMB_RADIUS) continue;
    g.setFlag(`blown_${o.id}`);
    booms.push({ at: o, r: 2.5 });
    g.log('Следом рвётся бочка с горючим!');
  }
  for (const h of group) {
    const t = h.mover.tile;
    const dmg = booms.reduce((sum, b) => (Math.hypot(t.x - b.at.x, t.y - b.at.y) <= b.r + 0.5 ? sum + 15 + Math.floor(g.rng() * 11) : sum), 0);
    if (Math.round(dmg * (1 - h.def.dr / 100)) >= h.def.hp) {
      h.dead = true;
      h.mover.stop();
      g.setFlag(`dead_${h.id}`);
      g.state.stats.kills++;
      g.log(`${h.def.name} мёртв.`);
      g.addXp(h.def.xp);
      for (const [it, n] of Object.entries(h.def.loot ?? {})) g.give(it, n);
      w.killed(h);
    } else {
      h.gone = true;
      h.mover.stop();
      g.setFlag(`fled_${h.id}`);
      g.log(`${h.def.name}${dmg ? ', обожжённый,' : ''} удирает в пустошь.`);
    }
  }
  w.afterKills();
}
