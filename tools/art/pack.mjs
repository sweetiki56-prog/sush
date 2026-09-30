// Shelf packer that writes a Phaser JSON-hash atlas. Each frame keeps its anchor
// (the prop's footprint bottom vertex) in `anchor`, readable via frame.customData.
import { canvas } from './draw.mjs';

export function packAtlas(entries, imageName, maxW = 2048, pad = 2) {
  const sorted = [...entries].sort((a, b) => b.cv.h - a.cv.h);
  let x = pad;
  let y = pad;
  let rowH = 0;
  const placed = [];
  for (const e of sorted) {
    if (x + e.cv.w + pad > maxW) {
      x = pad;
      y += rowH + pad;
      rowH = 0;
    }
    placed.push({ ...e, x, y });
    x += e.cv.w + pad;
    rowH = Math.max(rowH, e.cv.h);
  }
  const H = y + rowH + pad;
  const out = canvas(maxW, H);
  const frames = {};
  for (const p of placed) {
    out.ctx.drawImage(p.cv.c, p.x, p.y);
    frames[p.name] = {
      frame: { x: p.x, y: p.y, w: p.cv.w, h: p.cv.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: p.cv.w, h: p.cv.h },
      sourceSize: { w: p.cv.w, h: p.cv.h },
      anchor: p.anchor ?? { x: 0.5, y: 0.5 },
    };
  }
  return { cv: out, json: { frames, meta: { image: imageName, size: { w: maxW, h: H }, scale: '1' } } };
}
