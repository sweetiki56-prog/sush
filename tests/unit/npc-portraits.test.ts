import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';
import bindings from '../../src/content/npcPortraits.json';
import roadBindings from '../../src/content/roadPortraits.json';
import companions from '../../src/content/companions.json';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const mainFrames = read('public/assets/gen/atlas.json').frames as Record<string, unknown>;
const npcFrames = read('public/assets/gen/npc-portraits.json').frames as Record<string, unknown>;
const sheets = read('public/assets/gen/meta.json').sheets as Record<string, unknown>;

describe('dialogue NPC avatars', () => {
  it('never references a missing frame, including previously illustrated NPCs', () => {
    const missing = Object.entries(CONTENT.dialogues).flatMap(([id, dialogue]) => {
      if (!dialogue.portrait) return [];
      const frames = dialogue.portrait.startsWith('portrait_npc_') ? npcFrames : mainFrames;
      return frames[dialogue.portrait] ? [] : [`${id}: ${dialogue.portrait}`];
    });
    expect(missing).toEqual([]);
  });

  it('gives every speaking actor a frame in the correct loaded atlas', () => {
    const missing: string[] = [];
    for (const file of readdirSync('public/assets/maps').filter((name) => name.endsWith('.json'))) {
      const map = read(`public/assets/maps/${file}`);
      for (const actor of map.actors ?? []) {
        if (!actor.dialogue || !sheets[actor.sheet] || actor.dialogue === 'cell_other') continue;
        const portrait = CONTENT.dialogues[actor.dialogue]?.portrait;
        const frames = portrait?.startsWith('portrait_npc_') ? npcFrames : mainFrames;
        if (!portrait || !frames[portrait]) missing.push(`${file}:${actor.id} → ${actor.dialogue}: ${portrait ?? 'none'}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('keeps named people and animals identifiable across dialogues', () => {
    const portrait = (id: string) => CONTENT.dialogues[id].portrait;
    expect(portrait('lada_home')).toBe(portrait('lada'));
    expect(portrait('molchun_blood')).toBe(portrait('molchun'));
    expect(portrait('comp_rzhavchik')).toBe(portrait('rzhavchik'));
    expect(portrait('street_cat')).not.toBe(portrait('street_dog'));
    expect(portrait('rocket_chain')).not.toBe(portrait('rocket_psar'));
    expect(portrait('rocket_chronicler')).not.toBe(portrait('rocket_keeper'));
    expect(portrait('comp_vedro')).toBe(portrait('vedro_broken'));
    expect(portrait('nina')).not.toBe(portrait('kulik'));
    expect(Object.keys(bindings).length).toBeGreaterThan(80);
  });

  it('gives every world-map party leader a portrait', () => {
    const missing: string[] = [];
    for (const [id, party] of Object.entries(CONTENT.travel.parties)) {
      const portrait = party.portrait;
      const frames = portrait?.startsWith('portrait_npc_') ? npcFrames : mainFrames;
      if (!portrait || !frames[portrait]) missing.push(id);
    }
    expect(missing).toEqual([]);
    expect(Object.keys(roadBindings)).toHaveLength(Object.keys(CONTENT.travel.parties).length);
    expect(CONTENT.travel.parties.jackals.portrait).not.toBe(CONTENT.travel.parties.caravan.portrait);
  });

  it('covers companion talks created without a standing map actor', () => {
    for (const companion of Object.values(companions)) {
      const portrait = CONTENT.dialogues[companion.dialogue]?.portrait;
      const frames = portrait?.startsWith('portrait_npc_') ? npcFrames : mainFrames;
      expect(portrait, companion.dialogue).toBeTruthy();
      expect(frames[portrait!], companion.dialogue).toBeTruthy();
    }
  });

  it('draws distinct pixel art for distinct NPC portrait frames', async () => {
    const atlas = await loadImage(readFileSync('public/assets/gen/npc-portraits.png'));
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const [name, value] of Object.entries(npcFrames)) {
      const { x, y, w, h } = (value as { frame: { x: number; y: number; w: number; h: number } }).frame;
      const crop = createCanvas(w, h);
      const ctx = crop.getContext('2d');
      ctx.drawImage(atlas, x, y, w, h, 0, 0, w, h);
      const digest = createHash('sha256').update(ctx.getImageData(0, 0, w, h).data).digest('hex');
      if (seen.has(digest)) duplicates.push(`${seen.get(digest)} = ${name}`);
      seen.set(digest, name);
    }
    expect(duplicates).toEqual([]);
  });
});
