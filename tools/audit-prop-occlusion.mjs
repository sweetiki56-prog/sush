// Report dialogue actors that paint over interactive props at their initial positions.
// Uses actual sprite alpha, not just tile occupancy or rectangular bounds.
import { readFileSync, readdirSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const root = new URL('../public/assets/', import.meta.url);
const atlas = JSON.parse(readFileSync(new URL('gen/atlas.json', root), 'utf8')).frames;
const sheets = JSON.parse(readFileSync(new URL('gen/meta.json', root), 'utf8')).sheets;
const atlasImage = await loadImage(new URL('gen/atlas.png', root).pathname);
const imageCache = new Map();
const alphaCache = new Map();

function alphaOf(image, sx, sy, w, h, key) {
  if (alphaCache.has(key)) return alphaCache.get(key);
  const cv = createCanvas(w, h);
  cv.getContext('2d').drawImage(image, sx, sy, w, h, 0, 0, w, h);
  const data = cv.getContext('2d').getImageData(0, 0, w, h).data;
  const alpha = new Uint8Array(w * h);
  let opaque = 0;
  for (let i = 0; i < alpha.length; i++) {
    alpha[i] = data[i * 4 + 3];
    if (alpha[i] > 64) opaque++;
  }
  const result = { w, h, alpha, opaque };
  alphaCache.set(key, result);
  return result;
}

async function actorImage(actor) {
  const meta = sheets[actor.sheet];
  if (!meta) return null;
  let image = imageCache.get(actor.sheet);
  if (!image) {
    image = await loadImage(new URL(`gen/${actor.sheet}.png`, root).pathname);
    imageCache.set(actor.sheet, image);
  }
  const dir = actor.dir ?? 0;
  const frame = dir * meta.poses.length + meta.poses.indexOf('idle');
  const sprite = alphaOf(image, (frame % meta.poses.length) * meta.w, Math.floor(frame / meta.poses.length) * meta.h, meta.w, meta.h, `${actor.sheet}:${dir}`);
  const px = (actor.x - actor.y) * 32;
  const py = (actor.x + actor.y + 1) * 16;
  return { ...sprite, x: Math.round(px - meta.footX), y: Math.round(py - meta.footY) };
}

function propImage(prop) {
  const frame = atlas[prop.frame];
  if (!frame) return null;
  const { x, y, w, h } = frame.frame;
  const sprite = alphaOf(atlasImage, Math.round(x), Math.round(y), w, h, `prop:${prop.frame}`);
  const anchor = frame.anchor ?? { x: 0.5, y: 1 };
  const px = (prop.x + (prop.w ?? 1) - prop.y - (prop.h ?? 1)) * 32 + (prop.jx ?? 0);
  const py = (prop.x + (prop.w ?? 1) + prop.y + (prop.h ?? 1)) * 16 + (prop.jy ?? 0);
  return { ...sprite, x: Math.round(px - w * anchor.x), y: Math.round(py - h * anchor.y) };
}

function overlap(actor, prop) {
  const x0 = Math.max(actor.x, prop.x);
  const y0 = Math.max(actor.y, prop.y);
  const x1 = Math.min(actor.x + actor.w, prop.x + prop.w);
  const y1 = Math.min(actor.y + actor.h, prop.y + prop.h);
  if (x1 <= x0 || y1 <= y0) return 0;
  let pixels = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const ai = (y - actor.y) * actor.w + x - actor.x;
      const pi = (y - prop.y) * prop.w + x - prop.x;
      if (actor.alpha[ai] > 64 && prop.alpha[pi] > 64) pixels++;
    }
  return pixels;
}

const findings = [];
for (const file of readdirSync(new URL('maps/', root)).filter((name) => name.endsWith('.json'))) {
  const map = JSON.parse(readFileSync(new URL(`maps/${file}`, root), 'utf8'));
  const visibleActors = [];
  for (const actor of map.actors ?? []) {
    if (actor.id === 'player') continue;
    const actorSprite = await actorImage(actor);
    if (!actorSprite) continue;
    visibleActors.push({ actor, sprite: actorSprite });
    for (const prop of map.objects ?? []) {
      if (!atlas[prop.frame]) continue;
      const propSprite = propImage(prop);
      const pixels = overlap(actorSprite, propSprite);
      if (pixels < 30) continue;
      const actorInFront = actor.x + actor.y + 1 >= prop.x + (prop.w ?? 1) / 2 + prop.y + (prop.h ?? 1) / 2;
      if (actorInFront && prop.dialogue && pixels / propSprite.opaque >= 0.1)
        findings.push({ map: map.id, actor: actor.id, prop: prop.id, kind: 'actor over prop', pixels, portion: +(pixels / propSprite.opaque).toFixed(2) });
      if (!actorInFront && pixels / actorSprite.opaque >= 0.1)
        findings.push({ map: map.id, actor: actor.id, prop: prop.id, kind: 'prop over actor', pixels, portion: +(pixels / actorSprite.opaque).toFixed(2) });
    }
  }
  for (let i = 0; i < visibleActors.length; i++)
    for (let j = i + 1; j < visibleActors.length; j++) {
      const a = visibleActors[i];
      const b = visibleActors[j];
      if (a.actor.x === b.actor.x && a.actor.y === b.actor.y) continue; // conditional versions of one character
      const pixels = overlap(a.sprite, b.sprite);
      const portion = pixels / Math.min(a.sprite.opaque, b.sprite.opaque);
      if (pixels >= 30 && portion >= 0.5)
        findings.push({ map: map.id, actor: a.actor.id, prop: b.actor.id, kind: 'actor over actor', pixels, portion: +portion.toFixed(2) });
    }
}
findings.sort((a, b) => b.portion - a.portion || b.pixels - a.pixels);
for (const item of findings) console.log(`${item.portion.toFixed(2)} ${String(item.pixels).padStart(4)} ${item.map}: ${item.kind}: ${item.actor} / ${item.prop}`);
if (process.argv.includes('--check') && findings.some((item) => item.portion >= (item.kind === 'actor over actor' ? 0.5 : 0.3))) {
  console.error('Severe initial-position occlusion detected');
  process.exitCode = 1;
}
