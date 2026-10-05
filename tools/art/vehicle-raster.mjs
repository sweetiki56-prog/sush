// Original painted vehicle cutouts, resized reproducibly into the game's iso atlas.
import { loadImage } from '@napi-rs/canvas';
import { canvas } from './draw.mjs';

const VEHICLES = {
  sedan: { file: 'sedan.png', w: 134, h: 96, anchorX: 88, anchorY: 91, maxW: 126, maxH: 86 },
  pickup: { file: 'pickup.png', w: 134, h: 100, anchorX: 46, anchorY: 95, maxW: 126, maxH: 90 },
  burntVan: { file: 'burnt_van.png', w: 134, h: 112, anchorX: 88, anchorY: 107, maxW: 126, maxH: 101 },
  waterTanker: { file: 'water_tanker.png', w: 142, h: 112, anchorX: 93, anchorY: 107, maxW: 134, maxH: 101 },
};

function opaqueBounds(data, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 32) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
  if (right < left) throw new Error('Vehicle art has no opaque pixels');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

export async function vehicleRaster(id) {
  const spec = VEHICLES[id];
  if (!spec) throw new Error(`Unknown vehicle art: ${id}`);
  const image = await loadImage(new URL(`./assets/vehicles/${spec.file}`, import.meta.url).pathname);
  const source = canvas(image.width, image.height);
  source.ctx.drawImage(image, 0, 0);
  const bounds = opaqueBounds(source.ctx.getImageData(0, 0, image.width, image.height).data, image.width, image.height);
  const scale = Math.min(spec.maxW / bounds.width, spec.maxH / bounds.height);
  const dw = Math.round(bounds.width * scale);
  const dh = Math.round(bounds.height * scale);
  const target = canvas(spec.w, spec.h);
  target.ctx.imageSmoothingEnabled = true;
  target.ctx.imageSmoothingQuality = 'high';
  target.ctx.drawImage(image, bounds.left, bounds.top, bounds.width, bounds.height, Math.round((spec.w - dw) / 2), spec.anchorY - dh, dw, dh);
  target.anchor = { x: spec.anchorX / spec.w, y: spec.anchorY / spec.h };
  return target;
}
