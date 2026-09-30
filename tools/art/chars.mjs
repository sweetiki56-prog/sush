// Pseudo-3D character renderer: body parts are spheres/capsules placed in a local
// (side, forward, up) frame, projected to iso screen space and depth-sorted.
// One model yields all 8 directions, the walk cycle and a large portrait.
import { canvas, finalize } from './draw.mjs';
import { P, shade } from './palette.mjs';

export const FRAME_W = 48;
export const FRAME_H = 64;
export const FOOT_X = 24;
export const FOOT_Y = 58;
export const WALK_FRAMES = 4;
// one column per pose; 'walk' repeats for the four walk-cycle frames
export const POSES = ['idle', 'walk', 'walk', 'walk', 'walk', 'aim', 'fire', 'melee1', 'melee2', 'hit', 'dead'];
export const COLS = POSES.length;

export const CHARS = {
  // four player looks (chosen at character creation); text stays gender-neutral
  hero_0: { skin: P.skin2, hair: P.brown1, shirt: P.olive2, pants: P.denim1, boots: P.brown0, coat: P.brown3, coatLen: 14, sleeve: P.brown3, scarf: P.red1, goggles: true, backpack: P.olive1, rifle: true, height: 1 },
  hero_1: { skin: P.skin1, hair: P.dark2, shirt: P.olive1, pants: P.olive1, boots: P.dark1, coat: null, sleeve: P.olive2, scarf: null, goggles: true, bandana: P.rust2, backpack: P.brown2, rifle: true, height: 0.97 },
  hero_2: { skin: P.skin3, hair: P.brown2, shirt: P.teal1, pants: P.brown1, boots: P.brown0, coat: P.sand1, coatLen: 10, sleeve: P.sand1, shawl: P.rust1, hood: P.brown2, scarf: null, rifle: true, height: 0.95 },
  hero_3: { skin: P.skin0, hair: P.brown0, shirt: P.grey3, pants: P.denim0, boots: P.dark1, coat: P.grey2, coatLen: 12, sleeve: P.grey2, scarf: P.teal1, hat: P.dark2, beard: P.brown1, backpack: P.olive0, rifle: true, height: 1.03 },
  marta: { skin: P.skin1, hair: P.grey5, shirt: P.teal1, pants: P.brown1, boots: P.dark2, coat: P.brown2, coatLen: 3, sleeve: P.teal1, scarf: P.sand2, shawl: P.rust2, bun: true, cane: true, height: 0.93 },
  // the Trust: dust coats that never see dust, the inspector's longer and paler
  shluz: { skin: P.skin1, hair: P.grey3, shirt: P.grey1, pants: P.grey2, boots: P.dark1, coat: P.grey5, coatLen: 15, sleeve: P.grey5, scarf: null, hat: P.grey1, rifle: true, height: 1.04 },
  collector: { skin: P.skin2, hair: P.dark2, shirt: P.grey2, pants: P.grey1, boots: P.dark1, coat: P.grey3, coatLen: 11, sleeve: P.grey3, scarf: P.grey4, goggles: true, backpack: P.grey1, rifle: true, height: 0.99 },
  // guests: the Guild caravan master and his guard; Сипуха, a Полусухая: skin like bark under a hood
  birjuk: { skin: P.skin2, hair: P.grey3, shirt: P.sand1, pants: P.brown1, boots: P.dark1, coat: P.brown3, coatLen: 12, sleeve: P.brown3, hat: P.sand0, beard: P.grey4, scarf: P.red1, backpack: P.brown2, height: 1.05 },
  caravan_guard: { skin: P.skin1, hair: P.dark2, shirt: P.olive1, pants: P.olive0, boots: P.dark1, coat: null, sleeve: P.olive2, bandana: P.sand2, goggles: true, rifle: true, height: 1 },
  sipuha: { skin: P.brown2, hair: P.grey2, shirt: P.olive0, pants: P.olive0, boots: P.dark2, coat: P.olive1, coatLen: 16, sleeve: P.olive1, hood: P.olive0, shawl: P.brown1, cane: true, height: 1.07 },
  // «Жажда»: black and red; Кривой is one of them in a worn coat, nose broken
  raider: { skin: P.skin2, hair: P.dark1, shirt: P.dark1, pants: P.dark2, boots: P.dark0, coat: null, sleeve: P.dark1, bandana: P.red1, goggles: true, rifle: true, height: 1.01 },
  krivoy: { skin: P.skin1, hair: P.brown0, shirt: P.dark2, pants: P.denim0, boots: P.dark1, coat: P.brown1, coatLen: 9, sleeve: P.brown1, scarf: P.red1, height: 0.98 },
  // on the road: barge scavengers, water carriers, Ark pilgrims, and a Сухостой (bark for skin, no mind left)
  scavenger: { skin: P.skin2, hair: P.brown1, shirt: P.rust1, pants: P.brown0, boots: P.dark1, coat: P.brown2, coatLen: 8, sleeve: P.rust1, goggles: true, backpack: P.grey2, height: 0.97 },
  waterbearer: { skin: P.skin1, hair: P.dark1, shirt: P.teal0, pants: P.denim0, boots: P.dark1, coat: P.teal1, coatLen: 12, sleeve: P.teal1, hood: P.teal0, backpack: P.olive1, height: 0.99 },
  pilgrim: { skin: P.skin3, hair: P.grey4, shirt: P.bone, pants: P.sand3, boots: P.brown1, coat: P.bone, coatLen: 18, sleeve: P.bone, scarf: P.teal1, height: 0.96 },
  dryman: { skin: P.grey2, hair: P.grey1, shirt: P.grey2, pants: P.grey1, boots: P.grey1, coat: null, sleeve: P.grey2, scarf: null, height: 1.04 },
  hank: { skin: P.skin0, hair: P.dark2, shirt: P.sand1, pants: P.brown1, boots: P.dark1, coat: P.sand0, coatLen: 6, sleeve: P.sand0, hat: P.brown2, beard: P.grey3, scarf: null, height: 1.02 },
  // Chapter II: Три столба — the tavern, the rows, the post, the caravan without water
  zoya: { skin: P.skin1, hair: P.rust1, shirt: P.sand2, pants: P.brown1, boots: P.dark2, coat: null, sleeve: P.sand2, apron: P.bone, shawl: P.rust2, bun: true, height: 0.96 },
  pisar: { skin: P.skin3, hair: P.grey2, shirt: P.bone, pants: P.dark2, boots: P.dark0, coat: P.dark1, coatLen: 15, sleeve: P.dark1, hat: P.dark1, scarf: P.red0, backpack: P.brown2, height: 1 },
  gvozd: { skin: P.skin2, hair: P.dark1, shirt: P.red1, pants: P.dark2, boots: P.dark0, coat: P.brown1, coatLen: 9, sleeve: P.brown1, bandana: P.red1, height: 0.98 },
  senka: { skin: P.skin2, hair: P.brown2, shirt: P.sand1, pants: P.denim1, boots: P.brown0, coat: null, sleeve: P.sand1, scarf: P.teal1, backpack: P.brown2, height: 0.9 },
  luka: { skin: P.skin0, hair: P.grey3, shirt: P.olive0, pants: P.brown0, boots: P.dark1, coat: P.brown2, coatLen: 12, sleeve: P.brown2, beard: P.grey4, height: 0.97 },
  hor: { skin: P.skin2, hair: P.dark2, shirt: P.olive1, pants: P.brown1, boots: P.dark1, coat: P.olive2, coatLen: 13, sleeve: P.olive2, hat: P.sand0, scarf: P.dark1, rifle: true, height: 1.02 },
  mytny: { skin: P.skin1, hair: P.dark1, shirt: P.grey1, pants: P.grey2, boots: P.dark1, coat: P.grey4, coatLen: 13, sleeve: P.grey4, hat: P.grey2, rifle: true, height: 1.03 },
  debtor: { skin: P.skin3, hair: P.brown1, shirt: P.bone, pants: P.sand3, boots: P.brown1, coat: null, sleeve: P.bone, scarf: P.sand2, height: 0.95 },
  remen: { skin: P.skin1, hair: P.dark2, shirt: P.olive1, pants: P.brown0, boots: P.dark1, coat: null, sleeve: P.olive1, apron: P.brown1, beard: P.dark2, goggles: true, height: 1.03 },
  nyura: { skin: P.skin1, hair: P.brown1, shirt: P.teal1, pants: P.brown1, boots: P.dark2, coat: null, sleeve: P.teal1, apron: P.sand1, shawl: P.olive1, bun: true, height: 0.94 },
  bugai: { skin: P.skin2, hair: P.skin2, shirt: P.skin2, pants: P.brown1, boots: P.dark1, coat: null, sleeve: P.skin2, bald: true, bulk: 1.35, height: 1.12 },
  // Колючка and the Сухари
  prokop: { skin: P.skin0, hair: P.grey5, shirt: P.bone, pants: P.brown0, boots: P.dark1, coat: P.brown1, coatLen: 16, sleeve: P.brown1, beard: P.grey5, cane: true, height: 1.02 },
  iva: { skin: P.skin1, hair: P.brown2, shirt: P.olive1, pants: P.brown1, boots: P.brown0, coat: null, sleeve: P.olive1, scarf: P.rust1, bun: true, height: 0.92 },
  farmer: { skin: P.skin2, hair: P.brown1, shirt: P.sand1, pants: P.brown0, boots: P.dark1, coat: null, sleeve: P.sand1, hat: P.sand0, rifle: true, height: 1 },
  kremen: { skin: P.sand2, hair: P.dark0, shirt: P.brown3, pants: P.brown1, boots: P.brown0, coat: null, sleeve: P.sand2, shawl: P.bone, bandana: P.bone, spear: true, bulk: 1.15, height: 1.08 },
  suhar: { skin: P.sand3, hair: P.dark1, shirt: P.brown2, pants: P.brown1, boots: P.brown0, coat: null, sleeve: P.brown2, bandana: P.sand1, spear: true, height: 1.02 },
  // stage L: the barge's people and the children of the market
  yakor: { skin: P.skin0, hair: P.dark1, shirt: P.grey2, pants: P.dark2, boots: P.dark1, coat: null, sleeve: P.grey2, apron: P.rust0, beard: P.dark1, bald: true, bulk: 1.25, height: 1.06 },
  knysh: { skin: P.skin1, hair: P.rust1, shirt: P.red1, pants: P.denim1, boots: P.brown0, coat: P.sand3, coatLen: 8, sleeve: P.sand3, hat: P.dark2, scarf: P.fire1, height: 0.98 },
  efim: { skin: P.skin1, hair: P.grey5, shirt: P.denim0, pants: P.dark2, boots: P.dark1, coat: P.denim1, coatLen: 14, sleeve: P.denim1, beard: P.grey6, bandana: P.grey5, cane: true, height: 0.95 },
  shnyr: { skin: P.skin2, hair: P.dark2, shirt: P.olive1, pants: P.brown1, boots: P.brown0, coat: null, sleeve: P.olive1, bandana: P.rust2, height: 0.74, bulk: 0.8 },
  galka: { skin: P.skin1, hair: P.dark1, shirt: P.teal0, pants: P.brown0, boots: P.dark1, coat: null, sleeve: P.teal0, bun: true, height: 0.7, bulk: 0.78 },
  // Митяй, Нюра's boy of ten: short, thin, his father's cap too big for him
  mityay: { skin: P.skin1, hair: P.brown1, shirt: P.sand2, pants: P.denim0, boots: P.brown0, coat: null, sleeve: P.sand2, hat: P.grey2, height: 0.7, bulk: 0.8 },
  laska: { skin: P.skin3, hair: P.dark1, shirt: P.brown2, pants: P.brown1, boots: P.brown0, coat: null, sleeve: P.brown2, bandana: P.bone, height: 0.88 },
};

/** Worn armor drawn over the torso: plates, shoulder pads, a stripe, the struts of a powered frame. */
export const ARMOR_LOOKS = {
  jacket: { plate: P.brown2, stripe: P.brown4 },
  tirevest: { plate: P.dark1, pads: P.dark2, stripe: P.grey1 },
  vest: { plate: P.olive1, stripe: P.olive3 },
  tinplate: { plate: P.grey3, pads: P.grey2, stripe: P.rust1 },
  exo: { plate: P.dark2, pads: P.fire0, frame: P.fire0 },
  // stage G: coats swap the hero's own coat; the rest are plates in new colours
  duster: { plate: P.grey4, stripe: P.grey2, coat: P.grey4, coatLen: 16 },
  shell: { plate: P.brown3, pads: P.rust1, stripe: P.brown1 },
  crust: { plate: P.grey6, pads: P.bone, stripe: P.grey4 },
  cuirass: { plate: P.grey5, pads: P.grey6, stripe: P.teal1 },
};

function armorParts(a, z, zb, cap, ball) {
  // chest and back plates wrap the torso a little wider than the shirt
  for (const side of [-1, 1]) for (const f of [-1.3, 1.4]) cap([side * 2.4, f, z(22.5) + zb], [side * 2.7, f, z(30) + zb], 3.7, a.plate, 0.15);
  if (a.stripe) cap([-3.4, 2.9, z(26.5) + zb], [3.4, 2.9, z(26.5) + zb], 0.7, a.stripe, 0.6);
  if (a.pads) for (const side of [-1, 1]) ball([side * 6, 0, z(31) + zb], 2.7, a.pads, 0.3);
  if (a.frame) for (const side of [-1, 1]) cap([side * 4.3, -2.6, z(33) + zb], [side * 4, -2.6, z(19) + zb], 0.9, a.frame, -0.5);
}

function parts(cfg, phase, walking, pose = 'idle') {
  const hs = cfg.height;
  const z = (v) => v * hs;
  const swing = walking ? Math.sin(phase) : 0;
  const lift = walking ? Math.max(0, Math.cos(phase)) : 0;
  const bob = walking ? Math.abs(Math.sin(phase)) * 0.8 : 0;
  const bw = cfg.bulk ?? 1; // broad shoulders and chest (the ring's big man)
  const out = [];
  const cap = (a, b, r, color, bias = 0) => out.push({ kind: 'cap', a, b, r, color, bias });
  const ball = (p, r, color, bias = 0) => out.push({ kind: 'ball', a: p, r, color, bias });
  for (const side of [-1, 1]) {
    const s = swing * side;
    const footF = s * 4.5;
    const footZ = s > 0 ? lift * 1.6 : 0;
    cap([side * 2.6, 0, z(19)], [side * 2.7, footF * 0.55, z(10) + footZ], 2.5, cfg.pants);
    cap([side * 2.7, footF * 0.55, z(10) + footZ], [side * 2.7, footF, 2.2 + footZ], 2.3, cfg.pants);
    ball([side * 2.7, footF + 1, 1.8 + footZ], 2.4, cfg.boots);
  }
  const zb = bob;
  // coat / skirt as a flared column
  if (cfg.coat) {
    for (const side of [-1, 1]) for (const f of [-1.3, 1.1]) cap([side * 2.4, f, z(31) + zb], [side * 3.4, f * 1.4, cfg.coatLen + zb], 3.8, cfg.coat, -0.2);
  }
  const torso = cfg.coat && cfg.coatLen < 12 ? cfg.coat : cfg.shirt;
  for (const side of [-1, 1]) for (const f of [-1.1, 1.2]) cap([side * 2.3 * bw, f, z(21) + zb], [side * 2.6 * bw, f, z(30.5) + zb], 3.4 * bw, torso);
  if (cfg.apron) cap([0, 3.4 * bw, z(29) + zb], [0, 3.9 * bw, z(12) + zb], 2.6, cfg.apron, 0.4); // apron down the front
  if (cfg.coat && cfg.coatLen >= 12) ball([0, 1.8, z(27) + zb], 2.4, cfg.shirt, 0.3); // open jacket front
  if (cfg.armor) armorParts(cfg.armor, z, zb, cap, ball);
  if (cfg.backpack) {
    ball([0, -4.6, z(27) + zb], 4.2, cfg.backpack, -1);
    ball([0, -4.4, z(22.5) + zb], 3.6, shade(cfg.backpack, -0.15), -1);
  }
  const aiming = pose === 'aim' || pose === 'fire';
  const recoil = pose === 'fire' ? -1.3 : 0;
  if (cfg.rifle && aiming) {
    cap([1.3, 0.5 + recoil, z(29.5) + zb], [1.3, 17 + recoil, z(30.5) + zb], 1.1, P.dark1, 1);
    ball([1.3, 1.5 + recoil, z(29) + zb], 1.6, P.brown2, 1); // stock
  } else if (cfg.rifle) cap([2.5, -6, z(14) + zb], [-3, -6, z(41) + zb], 1.1, P.dark1, -2);
  if (cfg.spear && !aiming) {
    // a long spear held upright at the side, a bone tip
    cap([6.6, 1.5, z(8)], [6.9, 1.8, z(46)], 0.8, P.brown2, 1);
    cap([6.9, 1.8, z(46)], [7, 1.9, z(50)], 1.1, P.bone, 1);
  }
  if (cfg.shawl) for (const side of [-1, 1]) ball([side * 3.2, 0.3, z(30) + zb], 3.8, cfg.shawl, 0.1);
  // arms: swing opposite to legs, or hold the pose
  for (const side of [-1, 1]) {
    const sh = [side * 5.8 * bw, 0, z(30) + zb];
    let elbow;
    let hand;
    if (aiming) {
      elbow = [side * 5, side > 0 ? 3 + recoil : 6 + recoil, z(25.5) + zb];
      hand = side > 0 ? [1.6, 7.5 + recoil, z(28.5) + zb] : [1, 12 + recoil, z(29.5) + zb];
    } else if (pose === 'melee1' && side > 0) {
      elbow = [6.8, -2, z(33) + zb];
      hand = [6.2, -3.5, z(40) + zb];
    } else if (pose === 'melee2' && side > 0) {
      elbow = [5.6, 4, z(27) + zb];
      hand = [3.6, 10, z(25) + zb];
    } else if (pose === 'hit') {
      elbow = [side * 7.4, -1, z(25) + zb];
      hand = [side * 8.2, -0.5, z(20) + zb];
    } else {
      const a = -swing * side * 3.5;
      elbow = [side * 6.4, a * 0.5, z(24) + zb];
      hand = [side * 6.4, a, z(17.5) + zb];
    }
    cap(sh, elbow, 1.9, cfg.sleeve);
    cap(elbow, hand, 1.7, cfg.sleeve);
    ball(hand, 1.7, cfg.skin);
    if (side > 0 && pose === 'melee1') cap(hand, [hand[0], hand[1] - 1, hand[2] + 5.5], 0.7, P.grey5, 0.5);
    if (side > 0 && pose === 'melee2') cap(hand, [hand[0] - 0.4, hand[1] + 5.5, hand[2]], 0.7, P.grey5, 0.5);
  }
  if (cfg.cane) cap([-6.6, 1, z(18)], [-7.2, 2.5, 0.5], 0.8, P.brown2, 1);
  if (cfg.scarf) ball([0, 0.3, z(32.5) + zb], 3.4, cfg.scarf, 0.2);
  const hz = z(37) + zb;
  ball([0, 0.4, hz], 4.4, cfg.skin);
  ball([0, 3.9, hz - 0.8], 1.2, shade(cfg.skin, -0.1), 0.2); // nose
  if (!cfg.bald) ball([0, -0.9, hz + 1.2], 4.3, cfg.hair, -0.5);
  if (cfg.bun) ball([0, -4, hz + 2], 2.2, cfg.hair, -1);
  if (cfg.hood) {
    ball([0, -1.4, hz + 0.9], 5.3, cfg.hood, -0.3); // hood shell behind the face
    ball([0, -3, hz - 3.4], 3.8, cfg.hood, -0.6); // drape over the neck
  }
  if (cfg.bandana) {
    cap([-4.1, 0.9, hz + 2.3], [4.1, 0.9, hz + 2.3], 1.2, cfg.bandana, 0.5);
    ball([0, -4.3, hz + 1.6], 1.3, cfg.bandana, -0.8); // knot
  }
  if (cfg.beard) ball([0, 2.4, hz - 2.4], 2.6, cfg.beard, 0.4);
  if (cfg.goggles) {
    cap([-2.6, 1.6, hz + 4], [2.6, 1.6, hz + 4], 0.9, P.teal1, 0.6); // goggles pushed up on the forehead
  }
  if (cfg.hat) {
    out.push({ kind: 'brim', a: [0, 0, hz + 3.6], r: 7.6, color: cfg.hat, bias: 0.8 });
    ball([0, 0, hz + 5.4], 3.5, cfg.hat, 0.9);
  }
  out.push({ kind: 'eyes', a: [0, 0.3, hz + 0.3], r: 0, color: P.ink, bias: 0.7 });
  if (pose === 'hit' || pose === 'fire') lean(out, pose === 'hit' ? -2.4 : -0.6);
  if (pose === 'dead') return lieDown(out);
  return out;
}

/** Tilt the upper body back or forward around the feet. */
function lean(list, amount) {
  const t = (p) => [p[0], p[1] + (amount * Math.max(0, p[2] - 10)) / 30, p[2]];
  for (const q of list) {
    q.a = t(q.a);
    if (q.b) q.b = t(q.b);
  }
}

/** Fallen on the back: up becomes backward, the body centred on the tile. */
function lieDown(list) {
  const t = (p) => [p[0], 17 - p[2] * 0.95, 1.4 + p[1] * 0.22];
  return list
    .filter((q) => q.kind !== 'eyes')
    .map((q) => (q.kind === 'brim' ? { ...q, a: [q.a[0] + 7, 20, 1] } : { ...q, a: t(q.a), b: q.b ? t(q.b) : undefined }));
}

function drawFigure(ctx, ox, oy, dir, cfg, phase, walking, scale = 1, pose = 'idle') {
  renderParts(ctx, ox, oy, dir, parts(cfg, phase, walking, pose), scale);
}

/**
 * Project a (side, forward, up) part list for one of 8 facing directions and paint it
 * back to front with a three-pass shade. Shared by people and creatures.
 */
export function renderParts(ctx, ox, oy, dir, parts, scale = 1) {
  const phi = (dir * Math.PI) / 4;
  let F = [Math.cos(phi), 2 * Math.sin(phi)];
  const len = Math.hypot(F[0], F[1]);
  F = [F[0] / len, F[1] / len];
  const S = [-F[1], F[0]];
  const proj = ([s, f, zz]) => {
    const gx = s * S[0] + f * F[0];
    const gy = s * S[1] + f * F[1];
    return [ox + gx * scale, oy + gy * 0.5 * scale - zz * scale, gy];
  };
  const list = parts.map((p) => {
    const A = proj(p.a);
    const B = p.b ? proj(p.b) : A;
    return { ...p, A, B, depth: (A[2] + B[2]) / 2 + p.bias };
  });
  list.sort((a, b) => a.depth - b.depth);
  const disc = (x, y, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.6, r), 0, Math.PI * 2);
    ctx.fill();
  };
  for (const p of list) {
    const r = p.r * scale;
    if (p.kind === 'eyes') {
      if (F[1] < 0.15) continue; // facing away
      for (const side of [-1, 1]) {
        const [x, y] = proj([p.a[0] + side * 1.7, p.a[1] + 3.9, p.a[2]]);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(x - scale / 2), Math.round(y - scale / 2), Math.max(1, Math.round(scale)), Math.max(1, Math.round(scale)));
      }
      continue;
    }
    if (p.kind === 'brim') {
      const [x, y] = p.A;
      ctx.fillStyle = shade(p.color, -0.25);
      ctx.beginPath();
      ctx.ellipse(x, y + scale * 0.6, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const steps = Math.max(1, Math.ceil(Math.hypot(p.B[0] - p.A[0], p.B[1] - p.A[1]) / (0.7 * scale)));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push([p.A[0] + (p.B[0] - p.A[0]) * t, p.A[1] + (p.B[1] - p.A[1]) * t]);
    }
    // three passes: shadow rim (lower right), base, highlight (upper left): sun from the upper left
    for (const [x, y] of pts) disc(x, y, r, shade(p.color, -0.3));
    for (const [x, y] of pts) disc(x - r * 0.18, y - r * 0.18, r * 0.84, p.color);
    for (const [x, y] of pts) disc(x - r * 0.42, y - r * 0.42, r * 0.34, shade(p.color, 0.2));
  }
}

/** 8 rows (directions) x one column per pose (see POSES). */
export function buildSheet(cfg) {
  const cv = canvas(FRAME_W * COLS, FRAME_H * 8);
  for (let dir = 0; dir < 8; dir++)
    for (let col = 0; col < COLS; col++) {
      const pose = POSES[col];
      const walking = pose === 'walk';
      const phase = walking ? ((col - 1) / WALK_FRAMES) * Math.PI * 2 + Math.PI / 4 : 0;
      drawFigure(cv.ctx, col * FRAME_W + FOOT_X, dir * FRAME_H + FOOT_Y, dir, cfg, phase, walking, 1, pose);
    }
  return finalize(cv);
}

export function buildPortrait(cfg) {
  const cv = canvas(96, 96);
  const g = cv.ctx.createLinearGradient(0, 0, 0, 96);
  g.addColorStop(0, P.crt1);
  g.addColorStop(1, P.crt0);
  cv.ctx.fillStyle = g;
  cv.ctx.fillRect(0, 0, 96, 96);
  drawFigure(cv.ctx, 48, 40 + 37 * 3 * cfg.height, 3, cfg, 0, false, 3);
  return finalize(cv, { outline: false });
}
