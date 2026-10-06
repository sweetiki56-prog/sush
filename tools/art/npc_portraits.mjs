// Dialogue-only portraits: reuse the actual character/creature look, then snap it to
// a 48-pixel grid. These live in a second atlas: the map atlas is near 8192px high.
import { canvas, finalize } from './draw.mjs';
import { P } from './palette.mjs';
import { buildPortrait } from './chars.mjs';
import { buildCreatureSheet, S_FRAME_W, S_FRAME_H } from './creatures.mjs';

const DETAILS = {
  apprentice: { hair: P.rust1, scarf: P.sand3 },
  arena_crowd: { bandana: P.red1, scarf: P.rust1 },
  salt_folk: { shawl: P.sand2, hair: P.grey3 },
  barge_scav: { bandana: P.rust2, scarf: P.sand2 },
  changer: { apron: P.brown0, scarf: P.teal1 },
  collector_post: { hat: P.grey1, scarf: P.grey5 },
  raid_collector: { bandana: P.red1, scarf: P.grey4 },
  recruiter: { hat: P.grey2, scarf: P.teal1 },
  zap_gate: { hat: P.dark1, scarf: P.grey5 },
  dam_salt: { scarf: P.bone, hair: P.grey4 },
  dam_militia: { bandana: P.red1, hat: null },
  svinec_farmer: { hat: P.brown0, scarf: P.olive2 },
  guild_clerk: { apron: P.sand3, scarf: P.fire1 },
  zap_folk: { shawl: P.grey2, hair: P.grey5 },
  trial_knight: { scarf: P.red1, hat: P.sand0 },
  gate_guard: { scarf: P.red1, hat: P.dark2 },
  trust_soldier: { goggles: true, scarf: P.grey5 },
  upper_gate: { bandana: P.grey4, scarf: P.olive2 },
  guild_gatekeeper: { scarf: P.fire2, hat: P.brown1 },
  salt_debtor: { shawl: P.grey6, crystals: P.bone },
  salt_porter: { scarf: P.brown3, apron: P.grey3 },
  thirst_guard: { bandana: P.rust1, scarf: P.dark1 },
  ukho: { bandana: P.brown2, beard: P.dark2 },
  rocket_guard: { scarf: P.red1, hair: P.dark1 },
  nina: { hair: P.brown2, shawl: P.teal1 },
  salt_shop: { shawl: P.sand3, apron: P.brown2 },
  steward: { coat: P.grey4, sleeve: P.grey4, scarf: P.red1 },
  rocket_chain: { scarf: P.teal1, hair: P.grey2 },
  rocket_chronicler: { hair: P.grey5, goggles: true },
  raider_boss: { scarf: P.red0, beard: P.dark1 },
  vyun: { bandana: P.sand2, scarf: P.red1 },
};

function pixelFrame(source, accent) {
  const low = canvas(48, 48);
  low.ctx.drawImage(source.c, 0, 0, 96, 96, 0, 0, 48, 48);
  low.ctx.fillStyle = P.ink;
  low.ctx.fillRect(0, 0, 48, 2);
  low.ctx.fillRect(0, 46, 48, 2);
  low.ctx.fillRect(0, 0, 2, 48);
  low.ctx.fillRect(46, 0, 2, 48);
  low.ctx.fillStyle = accent;
  low.ctx.fillRect(3, 43, 16, 2);
  low.ctx.fillRect(43, 3, 2, 11);
  const out = canvas(96, 96);
  out.ctx.drawImage(low.c, 0, 0, 48, 48, 0, 0, 96, 96);
  return finalize(out, { outline: false });
}

export function npcPortrait(id, cfg, creature = false) {
  if (!creature) {
    const look = { ...cfg, ...DETAILS[id] };
    return pixelFrame(buildPortrait(look), look.shawl ?? look.scarf ?? look.coat ?? look.shirt ?? P.sand3);
  }
  const cv = canvas(96, 96);
  const gradient = cv.ctx.createLinearGradient(0, 0, 0, 96);
  gradient.addColorStop(0, P.crt1);
  gradient.addColorStop(1, P.crt0);
  cv.ctx.fillStyle = gradient;
  cv.ctx.fillRect(0, 0, 96, 96);
  const sheet = buildCreatureSheet(cfg);
  // The first idle frame is a side view. Crop its alpha bounds instead of using
  // a fixed rectangle: dogs, birds and tiny mites occupy very different areas.
  const pixels = sheet.ctx.getImageData(0, 0, S_FRAME_W, S_FRAME_H).data;
  let left = S_FRAME_W, top = S_FRAME_H, right = 0, bottom = 0;
  for (let y = 0; y < S_FRAME_H; y++) for (let x = 0; x < S_FRAME_W; x++) {
    if (pixels[(y * S_FRAME_W + x) * 4 + 3] < 32) continue;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + 1);
    bottom = Math.max(bottom, y + 1);
  }
  if (left < right && top < bottom) {
    const width = right - left, height = bottom - top;
    const scale = Math.min(84 / width, 84 / height);
    const drawnW = Math.round(width * scale), drawnH = Math.round(height * scale);
    cv.ctx.drawImage(sheet.c, left, top, width, height, Math.round((96 - drawnW) / 2), Math.round((96 - drawnH) / 2), drawnW, drawnH);
  }
  return pixelFrame(cv, cfg.fur ?? cfg.skin ?? cfg.shell ?? P.sand3);
}
