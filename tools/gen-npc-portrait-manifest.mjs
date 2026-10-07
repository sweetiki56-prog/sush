// Map every speaking actor without a hand-authored portrait to a reproducible pixel portrait.
// Run after gen:map; the generated JSON is imported by the client and rebuilt by gen:assets.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { CHARS } from './art/chars.mjs';
import { CREATURES } from './art/creatures.mjs';

const source = 'src/content/dialogues';
const output = 'src/content/npcPortraits.json';
const roadOutput = 'src/content/roadPortraits.json';
const actorOutput = 'src/content/actorPortraits.json';
const dialogues = Object.assign({}, ...readdirSync(source).filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(`${source}/${name}`, 'utf8'))));
const actors = new Map();
const speakers = []; // [mapId, actor] of every illustrated speaking actor
for (const file of readdirSync('public/assets/maps').filter((name) => name.endsWith('.json')).sort()) {
  const map = JSON.parse(readFileSync(`public/assets/maps/${file}`, 'utf8'));
  for (const actor of map.actors ?? []) {
    if (!actor.dialogue || (!CHARS[actor.sheet] && !CREATURES[actor.sheet])) continue;
    const sheets = actors.get(actor.dialogue) ?? [];
    if (!sheets.includes(actor.sheet)) sheets.push(actor.sheet);
    actors.set(actor.dialogue, sheets);
    speakers.push([map.id ?? file.slice(0, -5), actor]);
  }
}
// Party talks are created from companion data, not from a standing map actor.
const companions = JSON.parse(readFileSync('src/content/companions.json', 'utf8'));
for (const companion of Object.values(companions)) {
  if (companion.dialogue && (CHARS[companion.sheet] || CREATURES[companion.sheet])) actors.set(companion.dialogue, [companion.sheet]);
}

// A grille with prisoners behind it is an object, not the prisoners' dialogue.
const NON_NPC = new Set(['cell_other']);
// These are the same individual in a different chapter or companion state.
const REUSE = {
  comp_hank: 'portrait_hank',
  comp_shepot: 'portrait_shepot',
  comp_granit: 'portrait_granit',
  comp_irga: 'portrait_irga',
  comp_rzhavchik: 'portrait_npc_rzhavchik',
  kremen: 'portrait_kremen',
  lada_home: 'portrait_npc_lada',
  molchun_blood: 'portrait_npc_molchun',
  vedro_broken: 'portrait_npc_vedro',
  comp_vedro: 'portrait_npc_vedro',
};
// Distinct Sanctuary/raider faces, plus Vedro's old missing creature portrait.
const DISTINCT = { rocket_chain: 'rocket_guard', rocket_chronicler: 'rocket_keeper', raider_boss: 'raider', vedro_broken: 'vedro', comp_vedro: 'vedro' };
const result = {};
for (const [id, dialogue] of Object.entries(dialogues).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
  const sheet = DISTINCT[id] ?? actors.get(id)?.[0];
  if (!sheet || NON_NPC.has(id) || (dialogue.portrait && !DISTINCT[id])) continue;
  result[id] = { sheet, portrait: REUSE[id] ?? `portrait_npc_${id}` };
}
const json = `${JSON.stringify(result, null, 2)}\n`;
// A generic talk shared by people who look different (Горечь and her Горькие, Шнырь and Галка, an arena crowd):
// each of them shows a face drawn from their own sprite, not the face of whoever the talk was illustrated for.
const sheetPortrait = (sheet) => (CHARS[sheet] ? `portrait_${sheet}` : `portrait_npc_sheet_${sheet}`);
const actorPortraits = {};
for (const [mapId, actor] of speakers) {
  const sheets = actors.get(actor.dialogue);
  if (sheets.length < 2 || NON_NPC.has(actor.dialogue)) continue;
  const portrait = result[actor.dialogue]?.portrait ?? dialogues[actor.dialogue]?.portrait;
  const home = result[actor.dialogue]?.sheet ?? (sheets.find((sheet) => portrait === `portrait_${sheet}`) ?? sheets[0]);
  if (actor.sheet !== home) actorPortraits[`${mapId}:${actor.id}`] = { sheet: actor.sheet, portrait: sheetPortrait(actor.sheet) };
}
const actorJson = `${JSON.stringify(actorPortraits, null, 2)}\n`;
const road = {};
const travel = JSON.parse(readFileSync('src/content/travel.json', 'utf8'));
const creatures = JSON.parse(readFileSync('src/content/creatures.json', 'utf8'));
for (const [id, party] of Object.entries(travel.parties).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
  const sheet = creatures[party.members[0]?.[0]]?.sheet;
  if (!sheet || (!CHARS[sheet] && !CREATURES[sheet])) throw new Error(`Road party ${id}: no portrait sheet`);
  road[id] = { sheet, portrait: CHARS[sheet] ? `portrait_${sheet}` : `portrait_npc_road_${id}` };
}
const roadJson = `${JSON.stringify(road, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== json) throw new Error(`${output} is stale; run npm run gen:assets`);
  if (readFileSync(roadOutput, 'utf8') !== roadJson) throw new Error(`${roadOutput} is stale; run npm run gen:assets`);
  if (readFileSync(actorOutput, 'utf8') !== actorJson) throw new Error(`${actorOutput} is stale; run npm run gen:assets`);
} else {
  writeFileSync(output, json);
  writeFileSync(roadOutput, roadJson);
  writeFileSync(actorOutput, actorJson);
}
console.log(`NPC portrait bindings: ${Object.keys(result).length} actor/companion, ${Object.keys(road).length} road, ${Object.keys(actorPortraits).length} own-look`);
