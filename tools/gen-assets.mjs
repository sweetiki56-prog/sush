// Generates the whole procedural texture pack of «Сушь» into public/assets/gen.
// Run: npm run gen:assets (after gen:map when the map changes).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { canvas, finalize } from './art/draw.mjs';
import { bakeGround } from './art/ground.mjs';
import * as B from './art/props_build.mjs';
import * as M from './art/props_misc.mjs';
import * as T from './art/props_terrain.mjs';
import * as K from './art/props_camp.mjs';
import * as TN from './art/props_town.mjs';
import * as AR from './art/props_areas.mjs';
import * as CT from './art/props_city.mjs';
import * as SL from './art/props_salt.mjs';
import { CHARS, ARMOR_LOOKS, buildSheet, buildPortrait, FRAME_W, FRAME_H, FOOT_X, FOOT_Y, POSES } from './art/chars.mjs';
import { CREATURES, buildCreatureSheet, S_FRAME_W, S_FRAME_H, S_FOOT_X, S_FOOT_Y, S_POSES } from './art/creatures.mjs';
import { icon, ICONS } from './art/icons.mjs';
import { gearIcon, GEAR_ICONS } from './art/icons_gear.mjs';
import { kitIcon, KIT_ICONS } from './art/icons_kit.mjs';
import { armsIcon, ARMS_ICONS } from './art/icons_arms.mjs';
import { token, TOKENS } from './art/tokens.mjs';
import { worldMap, STRIP_PX } from './art/worldmap.mjs';
import { loadingChart, loadingDusk, loadingPoster } from './art/loading.mjs';
import { packAtlas } from './art/pack.mjs';
import { roofArt } from './art/roofs.mjs';
import { townPlan } from './art/townplan.mjs';
import { P } from './art/palette.mjs';

const OUT = 'public/assets/gen';
mkdirSync(OUT, { recursive: true });
const save = (name, cv) => writeFileSync(`${OUT}/${name}`, cv.c.toBuffer('image/png'));
const t0 = Date.now();

// ground: one baked image per map
const grounds = {};
const BATTLEFIELDS = ['enc_road', 'enc_sand', 'enc_rocks', 'enc_ravine', 'enc_dead', 'enc_salt'];
// every town map (all areas of every place), besides the Rusty Well's village
const LOCATIONS = JSON.parse(readFileSync('src/content/locations.json', 'utf8'));
const areasOf = (loc) => loc.areas ?? (loc.map ? [{ map: loc.map }] : []);
const TOWNS = [...new Set(Object.values(LOCATIONS).flatMap((l) => areasOf(l).map((a) => a.map)))].filter((m) => m !== 'rusty_well');
const maps = {};
const baked = {};
for (const [id, file, key] of [['rusty_well', 'rusty_well.json', 'ground'], ['arena', 'arena.json', 'ground_arena'], ...[...TOWNS, ...BATTLEFIELDS].map((b) => [b, `${b}.json`, `ground_${b}`])]) {
  maps[id] = JSON.parse(readFileSync(`public/assets/maps/${file}`, 'utf8'));
  const g = bakeGround(maps[id]);
  finalize(g.cv, { outline: false, quantize: false }); // keep smooth cloud/shadow shading
  save(`${key}.png`, g.cv);
  grounds[id] = { key, offX: g.offX, offY: g.offY };
  baked[id] = g;
}
// the plans of towns of several areas (the town screen)
for (const [id, loc] of Object.entries(LOCATIONS))
  if ((loc.areas?.length ?? 0) > 1) writeFileSync(`${OUT}/townplan_${id}.jpg`, townPlan(loc.areas, maps, baked, id.length * 31).c.toBuffer('image/jpeg', 88));

// the world map chart (kept soft: it is a painting, not a sprite)
const chart = worldMap(JSON.parse(readFileSync('public/assets/maps/world_low.json', 'utf8')));
// cut into strips of 64 cells: a whole chart of the Солончаки is wider than a phone's largest texture
for (let i = 0; i * STRIP_PX < chart.w; i++) {
  const w = Math.min(STRIP_PX, chart.w - i * STRIP_PX);
  const strip = canvas(w, chart.h);
  strip.ctx.drawImage(chart.c, i * STRIP_PX, 0, w, chart.h, 0, 0, w, chart.h);
  save(`worldmap_low_${i}.png`, strip);
}
// loading screens: small JPEGs, they are the first thing to load
for (const [id, cv] of [['dusk', loadingDusk()], ['poster', loadingPoster()], ['chart', loadingChart(chart.c)]]) writeFileSync(`${OUT}/loading_${id}.jpg`, cv.c.toBuffer('image/jpeg', 88));

// props (finalized: palette + outline) and fx (kept soft)
const prop = (name, cv) => ({ name, cv: finalize(cv), anchor: cv.anchor });
const raw = (name, cv, anchor) => ({ name, cv, anchor });
const entries = [
  prop('shack_a', B.shack('a')),
  prop('shack_b', B.shack('b')),
  prop('wall_hi', B.wall('hi')),
  prop('wall_lo', B.wall('lo')),
  prop('wall_broken', B.wall('broken')),
  prop('door_closed', B.door(false)),
  prop('door_open', B.door(true)),
  prop('pump_broken', B.pump(false)),
  prop('pump_fixed', B.pump(true)),
  prop('tank', B.tank()),
  prop('locker', B.locker()),
  prop('bag', M.bag()),
  prop('machine', B.machine()),
  prop('barrel', M.barrel(false)),
  prop('barrel_hazard', M.barrel(true)),
  prop('tires', M.tires()),
  prop('crate', M.crate(true)),
  prop('crate_small', M.crate(false)),
  prop('car_x', M.car('x', false)),
  prop('car_y', M.car('y', false)),
  prop('car_x_burnt', M.car('x', true)),
  prop('pylon', M.pylon()),
  prop('skeleton', M.skeleton()),
  prop('cactus', M.cactus()),
  prop('dead_tree', M.deadTree()),
  prop('bush', M.bush()),
  prop('sign', M.sign()),
  prop('campfire', M.campfire()),
  prop('workbench', K.workbench()),
  prop('board', K.board()),
  prop('scrap_pile', K.scrapPile()),
  prop('burrow', K.burrow()),
  prop('bars_closed', CT.bars(false)),
  prop('bars_open', CT.bars(true)),
  prop('tower', CT.tower()),
  prop('water_tower', CT.waterTower()),
  prop('press', CT.press()),
  prop('bunk', CT.bunk()),
  prop('podium', CT.podium()),
  prop('scales', CT.scales()),
  prop('salt_hi', SL.saltWall('hi')),
  prop('salt_lo', SL.saltWall('lo')),
  prop('salt_broken', SL.saltWall('broken')),
  prop('beam_scales', SL.beamScales()),
  prop('headframe', SL.headframe()),
  prop('mine_cart', SL.mineCart()),
  prop('salt_pile', SL.saltPile()),
  prop('crystal', SL.crystalGrowth()),
  prop('stands', SL.stands()),
  prop('wreck_ribs', SL.wreckRibs()),
  prop('radio', SL.radioSet()),
  prop('wagon', SL.wagon()),
  prop('salt_web', SL.saltWeb()),
  prop('hatch', AR.hatch()),
  prop('ladder', AR.ladder()),
  prop('valve', AR.valve()),
  prop('pipes', AR.pipes()),
  prop('glass_hi', AR.glass('hi')),
  prop('glass_lo', AR.glass('lo')),
  prop('transformer', AR.transformer()),
  prop('coil', AR.coil()),
  prop('eggs', AR.eggs()),
  prop('safe', AR.safe()),
  prop('hull_hi', AR.hull('hi')),
  prop('hull_lo', AR.hull('lo')),
  prop('mast', AR.mast()),
  prop('anchor', AR.anchor()),
  prop('counter', TN.counter()),
  prop('table', TN.table()),
  prop('shelf', TN.shelf()),
  prop('stall', TN.stall()),
  prop('notice', TN.noticePost()),
  prop('ring', TN.ring()),
  prop('thorn_fence', TN.thornFence()),
  prop('gate', TN.gate()),
  prop('vat', TN.vat()),
  prop('cactus_bed', TN.cactusBed()),
  prop('sacks', TN.sacks()),
  prop('watchtower', TN.watchtower()),
  ...[0, 1, 2, 3].map((i) => prop(`rock_${i}`, M.rock(i))),
  ...['a', 'b', 'c'].map((v) => prop(`cliff_${v}`, T.cliff(v))),
  prop('mesa', T.mesa()),
  prop('ruin', T.ruin()),
  raw('glow', M.glow()),
  raw('shadow', M.blobShadow()),
  raw('smoke', M.soft(16, 'rgba(120,110,100,0.5)')),
  raw('dust', M.soft(8, 'rgba(216,185,126,0.8)')),
  raw('flame', M.soft(10, 'rgba(255,200,110,1)')),
  raw('muzzle', M.soft(7, 'rgba(255,230,140,1)')),
  raw('ichor', M.soft(6, 'rgba(170,200,60,0.95)')),
  raw('blood', M.soft(6, 'rgba(170,30,20,0.95)')),
  raw('blast', M.soft(28, 'rgba(255,170,70,1)')),
  prop('tumbleweed', M.tumbleweed()),
  raw('tile_ok', M.tileCursor(P.crt3)),
  raw('tile_bad', M.tileCursor(P.red2)),
  raw('tile_use', M.tileCursor(P.fire2)),
  raw('pointer', finalize(M.pointer()), { x: 0, y: 0 }),
  raw('hand', finalize(M.hand()), { x: 0.3, y: 0 }),
  raw('metal', M.metal()),
  raw('rivet', M.rivet()),
  ...ICONS.map((k) => raw(`icon_${k}`, finalize(icon(k)))),
  ...GEAR_ICONS.map((k) => raw(`icon_${k}`, finalize(gearIcon(k)))),
  ...KIT_ICONS.map((k) => raw(`icon_${k}`, finalize(kitIcon(k)))),
  ...Object.keys(ARMS_ICONS).map((k) => raw(`icon_${k}`, finalize(armsIcon(k)))),
  ...TOKENS.map((k) => raw(`token_${k}`, finalize(token(k)))),
  // roofs over buildings with an inside, one per building of every map
  ...Object.entries(maps).flatMap(([id, m]) => (m.roofs ?? []).map((rf, i) => prop(`roof_${id}_${rf.id}`, roofArt(rf, i + id.length * 7)))),
];
const sheets = {};
for (const [id, cfg] of Object.entries(CHARS)) {
  save(`${id}.png`, buildSheet(cfg));
  entries.push(raw(`portrait_${id}`, buildPortrait(cfg)));
  sheets[id] = { w: FRAME_W, h: FRAME_H, footX: FOOT_X, footY: FOOT_Y, poses: POSES };
}
// every hero look in every armor (hero_0_vest ...): the sprite shows what you wear
for (const [id, cfg] of Object.entries(CHARS)) {
  if (!id.startsWith('hero_')) continue;
  for (const [armor, look] of Object.entries(ARMOR_LOOKS)) {
    const coat = look.coat ? { coat: look.coat, sleeve: look.coat, coatLen: look.coatLen } : {};
    save(`${id}_${armor}.png`, buildSheet({ ...cfg, ...coat, armor: look }));
    sheets[`${id}_${armor}`] = { w: FRAME_W, h: FRAME_H, footX: FOOT_X, footY: FOOT_Y, poses: POSES };
  }
}
for (const [id, cfg] of Object.entries(CREATURES)) {
  save(`${id}.png`, buildCreatureSheet(cfg));
  sheets[id] = { w: S_FRAME_W, h: S_FRAME_H, footX: S_FOOT_X, footY: S_FOOT_Y, poses: S_POSES };
}
const atlas = packAtlas(entries, 'atlas.png');
save('atlas.png', atlas.cv);
writeFileSync(`${OUT}/atlas.json`, JSON.stringify(atlas.json));
writeFileSync(
  `${OUT}/meta.json`,
  JSON.stringify({ groundOffsetX: grounds.rusty_well.offX, groundOffsetY: grounds.rusty_well.offY, grounds, sheets }),
);
console.log(`texture pack: ${entries.length} atlas frames, ${Object.keys(sheets).length} sheets, ${Date.now() - t0} ms`);
