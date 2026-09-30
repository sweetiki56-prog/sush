import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CONTENT, MAP_IDS } from '../../src/content';
import type { Condition, Effect } from '../../src/core/types';
import { ATTRS, SKILLS } from '../../src/core/character/defs';

const map = JSON.parse(readFileSync('public/assets/maps/rusty_well.json', 'utf8'));
const maps = MAP_IDS.map((id) => JSON.parse(readFileSync(`public/assets/maps/${id}.json`, 'utf8')));
const byId = Object.fromEntries(maps.map((m) => [m.id, m]));

describe('content integrity', () => {
  const items = new Set(Object.keys(CONTENT.items));
  const hasStage = (quest: string, stage: string) => !!CONTENT.quests[quest]?.stages.some((s) => s.id === stage);
  const checkConds = (where: string, conds: Condition[] = []) => {
    for (const c of conds) {
      const subjects = [c.flag, c.attr, c.skill].filter((x) => x !== undefined).length;
      expect(subjects, `${where}: one numeric subject per condition`).toBeLessThanOrEqual(1);
      if (c.attr) expect(ATTRS, where).toContain(c.attr);
      if (c.skill) expect(SKILLS, where).toContain(c.skill);
      for (const p of [c.perk, c.noPerk]) if (p) expect(CONTENT.character.perks[p], `${where}: perk ${p}`).toBeDefined();
      if (c.trait) expect(CONTENT.character.traits[c.trait], `${where}: trait ${c.trait}`).toBeDefined();
      if (c.item) expect(items.has(c.item), `${where}: item ${c.item}`).toBe(true);
      if (c.noItem) expect(items.has(c.noItem), `${where}: item ${c.noItem}`).toBe(true);
    }
  };
  const checkEffects = (where: string, effects: Effect[] = []) => {
    for (const e of effects) {
      if (e.type === 'give' || e.type === 'take') expect(items.has(e.item), `${where}: item ${e.item}`).toBe(true);
      if (e.type === 'quest') expect(hasStage(e.quest, e.stage), `${where}: stage ${e.quest}.${e.stage}`).toBe(true);
      if (e.type === 'open' && e.window === 'barter') expect(CONTENT.traders[e.id], `${where}: trader ${e.id}`).toBeDefined();
      if (e.type === 'goto') expect(byId[e.map]?.entries?.[e.entry ?? 'default'], `${where}: goto ${e.map}.${e.entry}`).toBeDefined();
    }
  };

  for (const [id, d] of Object.entries(CONTENT.dialogues)) {
    it(`dialogue ${id} links resolve`, () => {
      const nodes = d.nodes;
      for (const e of d.entry) {
        expect(nodes[e.node], `${id} entry ${e.node}`).toBeDefined();
        checkConds(`${id} entry`, e.if);
      }
      expect(d.entry.at(-1)!.if, `${id} needs an unconditional fallback entry`).toBeUndefined();
      for (const [nid, n] of Object.entries(nodes)) {
        checkEffects(`${id}.${nid}`, n.effects);
        expect(n.options.length, `${id}.${nid} has options`).toBeGreaterThan(0);
        for (const o of n.options) {
          if (o.next) expect(nodes[o.next], `${id}.${nid} -> ${o.next}`).toBeDefined();
          checkEffects(`${id}.${nid}`, o.effects);
          checkConds(`${id}.${nid}`, o.if);
          if (o.check) {
            const c = o.check;
            expect(!!c.skill !== !!c.attr, `${id}.${nid}: check needs exactly one of skill/attr`).toBe(true);
            if (c.skill) expect(SKILLS).toContain(c.skill);
            if (c.attr) expect(ATTRS).toContain(c.attr);
            expect(nodes[o.check.pass]).toBeDefined();
            expect(nodes[o.check.fail]).toBeDefined();
            checkEffects(`${id}.${nid}`, o.check.passEffects);
            checkEffects(`${id}.${nid}`, o.check.failEffects);
          }
        }
      }
    });
  }

  it('traits and premades reference real items, skills and traits', () => {
    for (const t of Object.values(CONTENT.character.traits)) for (const it of Object.keys(t.mods.items ?? {})) expect(items.has(it), it).toBe(true);
    for (const p of CONTENT.character.premades) {
      for (const t of p.traits) expect(CONTENT.character.traits[t], t).toBeDefined();
      for (const s of p.tags) expect(SKILLS).toContain(s);
      expect(Object.values(p.attrs).reduce((a, b) => a + b, 0), p.title).toBe(40);
    }
  });

  it('map objects and actors on every map reference existing dialogues, creatures, sheets and frames', () => {
    const meta = JSON.parse(readFileSync('public/assets/gen/meta.json', 'utf8'));
    const atlas = JSON.parse(readFileSync('public/assets/gen/atlas.json', 'utf8'));
    for (const m of maps) {
      for (const o of [...m.objects, ...m.actors]) if (o.dialogue) expect(CONTENT.dialogues[o.dialogue], `${m.id}: ${o.id}`).toBeDefined();
      for (const a of m.actors) {
        if (a.creature) expect(CONTENT.creatures[a.creature], `${m.id}: ${a.id} creature`).toBeDefined();
        expect(meta.sheets[a.sheet], `${m.id}: ${a.id} sheet ${a.sheet}`).toBeDefined();
        checkConds(`${m.id}: ${a.id}`, [...(a.if ?? []), ...(a.peace ?? [])]);
      }
      for (const o of [...m.objects, ...m.decor]) expect(atlas.frames[o.frame], `${m.id}: ${o.frame}`).toBeDefined();
      for (const h of [...(m.arrive ?? []), ...(m.cleared ?? [])]) checkEffects(`${m.id} hook`, h.effects);
      for (const t of m.triggers) checkEffects(`${m.id} trigger ${t.id}`, t.effects);
    }
  });

  it('ways out lead to real maps and entries; roofs sit on their maps and have art', () => {
    const atlas = JSON.parse(readFileSync('public/assets/gen/atlas.json', 'utf8'));
    const inside = (m: { width: number; height: number }, x: number, y: number) => x >= 0 && y >= 0 && x < m.width && y < m.height;
    for (const m of maps) {
      for (const ex of m.exits ?? []) {
        expect(inside(m, ex.x, ex.y) && inside(m, ex.x + ex.w - 1, ex.y + ex.h - 1), `${m.id}: exit ${ex.id} on the map`).toBe(true);
        if (ex.to !== 'world') expect(byId[ex.to]?.entries?.[ex.entry ?? 'default'], `${m.id}: exit ${ex.id} → ${ex.to}.${ex.entry}`).toBeDefined();
        checkConds(`${m.id}: exit ${ex.id}`, ex.if ?? []);
        checkEffects(`${m.id}: exit ${ex.id}`, ex.effects);
        for (let y = ex.y; y < ex.y + ex.h; y++) for (let x = ex.x; x < ex.x + ex.w; x++) expect(m.ground[y][x], `${m.id}: exit ${ex.id} on open ground at ${x},${y}`).not.toBe('#');
      }
      for (const rf of m.roofs ?? []) {
        expect(inside(m, rf.x0, rf.y0) && inside(m, rf.x1, rf.y1), `${m.id}: roof ${rf.id}`).toBe(true);
        expect(atlas.frames[`roof_${m.id}_${rf.id}`], `${m.id}: roof art ${rf.id}`).toBeDefined();
      }
    }
    for (const [id, loc] of Object.entries(CONTENT.locations))
      for (const a of loc.areas ?? []) {
        expect(byId[a.map]?.entries?.[a.entry ?? 'default'], `${id}: area ${a.map}.${a.entry}`).toBeDefined();
        checkConds(`${id}: area ${a.map}`, a.known ?? []);
        if (loc.areas![0]) expect(loc.map, `${id}: map is its first area`).toBe(loc.areas![0].map);
      }
  });

  it('creatures, traders, contracts and road parties reference real things', () => {
    const meta = JSON.parse(readFileSync('public/assets/gen/meta.json', 'utf8'));
    for (const [id, c] of Object.entries(CONTENT.creatures)) {
      for (const w of c.weapons) expect(CONTENT.weapons[w], `${id}: ${w}`).toBeDefined();
      for (const it of Object.keys(c.loot ?? {})) expect(items.has(it), `${id} loot ${it}`).toBe(true);
      expect(meta.sheets[c.sheet], `${id} sheet`).toBeDefined();
    }
    for (const [id, t] of Object.entries(CONTENT.traders)) for (const it of Object.keys(t.stock)) expect(items.has(it), `${id}: ${it}`).toBe(true);
    for (const [id, j] of Object.entries(CONTENT.jobs)) {
      for (const it of Object.keys(j.need ?? {})) expect(items.has(it), `${id}: ${it}`).toBe(true);
      if (j.hunt?.creature) expect(CONTENT.creatures[j.hunt.creature], `${id} hunt`).toBeDefined();
    }
    const tr = CONTENT.travel;
    for (const [id, p] of Object.entries(tr.parties)) {
      for (const [c] of p.members) expect(CONTENT.creatures[c], `${id}: ${c}`).toBeDefined();
      if (p.dialogue) expect(CONTENT.dialogues[p.dialogue], `${id} talk`).toBeDefined();
      if (p.trader) expect(CONTENT.traders[p.trader], `${id} trader`).toBeDefined();
    }
    for (const u of tr.uniques ?? []) expect(tr.parties[u.party], u.id).toBeDefined();
  });

  it('every item has a tab and a price; weapons, armor and charms match their items', () => {
    const CATS = ['weapon', 'grenade', 'armor', 'charm', 'chem', 'ammo', 'part', 'quest'];
    for (const [id, it] of Object.entries(CONTENT.items)) {
      expect(CATS, id).toContain(it.cat);
      expect(it.value, id).toBeGreaterThanOrEqual(0);
    }
    for (const id of Object.keys(CONTENT.charms)) expect(CONTENT.items[id]?.use, id).toBe('charm');
    for (const id of Object.keys(CONTENT.armor)) expect(CONTENT.items[id]?.cat, id).toBe('armor');
    for (const [id, w] of Object.entries(CONTENT.weapons)) {
      if (!w.item) continue;
      expect(w.item, id).toBe(id); // a weapon and its item share the id
      expect(CONTENT.items[id]?.cat, id).toBe(w.thrown ? 'grenade' : 'weapon');
      if (w.ammo) expect(CONTENT.items[w.ammo]?.cat, `${id} ammo`).toBe('ammo');
    }
  });

  it('recipes use real items; every armor look has hero sheets', () => {
    for (const [id, r] of Object.entries(CONTENT.recipes))
      for (const it of [...Object.keys(r.inputs), ...Object.keys(r.output)]) expect(items.has(it), `${id}: ${it}`).toBe(true);
    const meta = JSON.parse(readFileSync('public/assets/gen/meta.json', 'utf8'));
    for (const [id, a] of Object.entries(CONTENT.armor)) for (const look of [0, 1, 2, 3]) expect(meta.sheets[`hero_${look}_${a.look ?? id}`], `${id} look ${look}`).toBeDefined();
  });

  it('item icons exist in the atlas', () => {
    const atlas = JSON.parse(readFileSync('public/assets/gen/atlas.json', 'utf8'));
    for (const it of Object.values(CONTENT.items)) expect(atlas.frames[it.icon], it.icon).toBeDefined();
    for (const o of [...map.objects, ...map.decor]) expect(atlas.frames[o.frame], o.frame).toBeDefined();
  });
});

describe('every attribute and skill matters', () => {
  // used by code rather than dialogue: combat (guns, melee, agi -> AP), bandages (medic), poison and HP (end)
  const CODE_SKILLS = ['guns', 'melee', 'medic'];
  const CODE_ATTRS = ['agi', 'end'];

  it('each one is referenced by a dialogue condition or check, or by game code', () => {
    const skills = new Set<string>(CODE_SKILLS);
    const attrs = new Set<string>(CODE_ATTRS);
    for (const d of Object.values(CONTENT.dialogues))
      for (const n of Object.values(d.nodes))
        for (const o of n.options) {
          for (const c of [...(o.if ?? []), ...(o.check ? [o.check] : [])]) {
            if (c.skill) skills.add(c.skill);
            if (c.attr) attrs.add(c.attr);
          }
        }
    expect([...skills].sort()).toEqual([...SKILLS].sort());
    expect([...attrs].sort()).toEqual([...ATTRS].sort());
  });
});

describe('wasteland ring around the map', () => {
  const W: number = map.width;
  const H: number = map.height;
  const M: number = map.outer.margin;

  it('outer grid wraps the playable grid unchanged', () => {
    expect(map.outer.ground).toHaveLength(H + 2 * M);
    for (const row of map.outer.ground) expect(row).toHaveLength(W + 2 * M);
    for (let y = 0; y < H; y++) expect(map.outer.ground[y + M].slice(M, M + W)).toBe(map.ground[y]);
  });

  it('decor stays outside the playable grid and never overlaps', () => {
    const taken = new Set<string>();
    for (const d of map.decor)
      for (let y = d.y; y < d.y + d.h; y++)
        for (let x = d.x; x < d.x + d.w; x++) {
          expect(x >= 0 && y >= 0 && x < W && y < H, `${d.frame} at ${x},${y}`).toBe(false);
          expect(taken.has(`${x},${y}`), `overlap at ${x},${y}`).toBe(false);
          taken.add(`${x},${y}`);
        }
  });

  it('power lines hang between pylons', () => {
    const pylons = new Set([...map.objects, ...map.decor].filter((o) => o.frame === 'pylon').map((o) => `${o.x},${o.y}`));
    for (const [a, b] of map.wires) {
      expect(pylons.has(a.join(',')), `pylon ${a}`).toBe(true);
      expect(pylons.has(b.join(',')), `pylon ${b}`).toBe(true);
    }
  });
});
