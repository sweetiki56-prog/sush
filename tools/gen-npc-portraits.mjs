// A small, independently rebuildable dialogue atlas; the main texture pack is large.
import { readFileSync, writeFileSync } from 'node:fs';
import { CHARS } from './art/chars.mjs';
import { CREATURES } from './art/creatures.mjs';
import { npcPortrait } from './art/npc_portraits.mjs';
import { packAtlas } from './art/pack.mjs';

export function generateNpcPortraitAtlas() {
  const portraitBindings = JSON.parse(readFileSync('src/content/npcPortraits.json', 'utf8'));
  const roadPortraits = JSON.parse(readFileSync('src/content/roadPortraits.json', 'utf8'));
  const bindings = [
    ...Object.entries(portraitBindings),
    ...Object.entries(roadPortraits).map(([id, value]) => [`road_${id}`, value]),
  ];
  const seen = new Set();
  const entries = bindings.flatMap(([id, binding]) => {
    if (!binding.portrait.startsWith('portrait_npc_') || seen.has(binding.portrait)) return [];
    seen.add(binding.portrait);
    const cfg = CHARS[binding.sheet] ?? CREATURES[binding.sheet];
    if (!cfg) throw new Error(`NPC portrait ${id}: unknown sheet ${binding.sheet}`);
    return [{ name: binding.portrait, cv: npcPortrait(id, cfg, !CHARS[binding.sheet]) }];
  });
  const atlas = packAtlas(entries, 'npc-portraits.png', 1024);
  writeFileSync('public/assets/gen/npc-portraits.png', atlas.cv.c.toBuffer('image/png'));
  writeFileSync('public/assets/gen/npc-portraits.json', JSON.stringify(atlas.json));
  return entries.length;
}

if (process.argv[1]?.endsWith('/gen-npc-portraits.mjs')) console.log(`NPC portraits: ${generateNpcPortraitAtlas()}`);
