// Mutant scorpions on the same pseudo-3D part renderer as people: segmented body,
// eight legs with a walk cycle, pincers and an arched tail with a stinger.
import { canvas, finalize } from './draw.mjs';
import { P, shade } from './palette.mjs';
import { renderParts } from './chars.mjs';

export const S_FRAME_W = 64;
export const S_FRAME_H = 56;
export const S_FOOT_X = 32;
export const S_FOOT_Y = 44;
export const S_POSES = ['idle', 'walk', 'walk', 'walk', 'walk', 'attack1', 'attack2', 'hit', 'dead'];

export const CREATURES = {
  scorpion: { shell: P.rust2, dark: P.rust0, claw: P.rust1, joint: P.brown1, tip: P.bone, scale: 1 },
  scorpion_big: { shell: P.brown3, dark: P.brown0, claw: P.rust1, joint: P.dark2, tip: P.bone, scale: 1.4 },
  scorpion_lame: { shell: P.dark2, dark: P.dark0, claw: P.rust0, joint: P.grey1, tip: P.fire1, scale: 1.6 },
  scorpion_behemoth: { shell: P.olive1, dark: P.dark1, claw: P.olive0, joint: P.brown0, tip: P.bone, scale: 1.75 },
  // jackals: lean, sandy, big ears; the pack leader is darker, heavier, with a scar
  jackal: { dog: true, fur: P.sand3, dark: P.brown2, belly: P.sand4, scale: 1.45 },
  jackal_leader: { dog: true, fur: P.brown3, dark: P.brown0, belly: P.sand2, scar: true, scale: 1.75 },
  // sewer rats of Запруда: grey, hunched, as big as a small dog
  rat: { dog: true, fur: P.grey2, dark: P.dark2, belly: P.grey4, scale: 0.9 },
  // Ржавчик, the collector's dog: rust-red, thin, a copper collar
  // sand eels rise out of the riverbed; the queen is thick as a barrel; rust mites crawl over iron in swarms
  sand_eel: { eel: true, skin: P.sand2, dark: P.brown1, belly: P.sand4, scale: 1.3 },
  eel_queen: { eel: true, skin: P.brown2, dark: P.brown0, belly: P.sand3, scale: 2.1 },
  rust_mite: { mite: true, shell: P.rust1, dark: P.rust0, joint: P.dark2, scale: 0.8 },
  dog_rzhavchik: { dog: true, fur: P.rust2, dark: P.rust0, belly: P.sand3, collar: P.fire1, scale: 1.3 },
};

/** A four-legged beast: body along the facing, legs at the corners, head with a snout and ears, a brush of a tail. */
function dogParts(c, phase, walking, pose) {
  const out = [];
  const cap = (a, b, r, color, bias = 0) => out.push({ kind: 'cap', a, b, r, color, bias });
  const ball = (p, r, color, bias = 0) => out.push({ kind: 'ball', a: p, r, color, bias });
  const dead = pose === 'dead';
  const lunge = pose === 'attack1' ? 2.4 : pose === 'attack2' ? 1 : pose === 'hit' ? -1.5 : 0;
  const bz = dead ? 2.2 : 7.5;
  if (!dead)
    for (const [f, side, off] of [[3.2, -1, 0], [3.2, 1, Math.PI], [-3.6, -1, Math.PI], [-3.6, 1, 0]]) {
      const ph = phase + off;
      const sw = walking ? Math.sin(ph) * 2.2 : 0;
      const lift = walking ? Math.max(0, Math.cos(ph)) * 1.4 : 0;
      cap([side * 1.8, f + lunge * 0.5, bz - 0.5], [side * 2, f + sw * 0.5 + lunge * 0.5, 3.8 + lift], 1.1, c.fur);
      cap([side * 2, f + sw * 0.5 + lunge * 0.5, 3.8 + lift], [side * 2, f + sw + lunge * 0.5, 0.6 + lift], 0.8, c.dark);
    }
  // body
  cap([0, 3.4 + lunge, bz + 0.6], [0, -4 + lunge, bz], 3, c.fur);
  ball([0, 0 + lunge, bz - 1.2], 2.4, c.belly, -0.3);
  // tail
  cap([0, -4.2 + lunge, bz + 0.4], [0, -8 + lunge, bz - (dead ? 0 : 2.2)], 1.2, c.dark, -0.2);
  // head: neck up and forward, snout, ears
  const hz = dead ? 2.4 : bz + 3.6 - (pose === 'attack1' ? 2 : 0);
  const hy = 6.4 + lunge;
  cap([0, 3.6 + lunge, bz + 1.2], [0, hy, hz], 1.8, c.fur);
  ball([0, hy, hz], 2.4, c.fur);
  cap([0, hy + 1, hz - 0.4], [0, hy + 4, hz - 1], 1.1, c.fur, 0.3);
  ball([0, hy + 4.2, hz - 1], 0.6, P.ink, 0.5); // nose
  for (const side of [-1, 1]) cap([side * 1.2, hy - 0.4, hz + 1.4], [side * 1.6, hy - 0.8, hz + 4], 0.8, c.dark, 0.2);
  if (!dead) for (const side of [-1, 1]) ball([side * 1, hy + 1.8, hz + 0.6], 0.4, P.ink, 0.6);
  if (c.scar) cap([0.9, hy + 0.6, hz + 1.2], [0.5, hy + 2.6, hz - 0.6], 0.3, P.bone, 0.7);
  if (c.collar) for (const side of [-1, 1]) cap([side * 1.5, 4.4 + lunge, bz + 1.9], [side * 0.2, 5 + lunge, bz + 2.6], 0.55, c.collar, 0.5);
  return out;
}

/** An eel out of the sand: a mound where it went in, a body rising in an arc, a blunt head with jaws. */
function eelParts(c, phase, walking, pose) {
  const out = [];
  const cap = (a, b, r, color, bias = 0) => out.push({ kind: 'cap', a, b, r, color, bias });
  const ball = (p, r, color, bias = 0) => out.push({ kind: 'ball', a: p, r, color, bias });
  ball([0, -3, 0.2], 3.4, P.sand3, -0.4); // the sand heaped where it came up
  if (pose === 'dead') {
    for (let k = 0; k < 6; k++) cap([0, -3 + k * 1.8, 0.8], [0, -1.2 + k * 1.8, 0.8], 2 - k * 0.15, k % 2 ? c.skin : c.dark);
    return out;
  }
  const lunge = pose === 'attack1' ? 3.5 : pose === 'attack2' ? 1.5 : pose === 'hit' ? -1.5 : 0;
  const sway = Math.sin(phase * 2 + (pose === 'idle' ? 0 : 1)) * 0.8;
  let p = [0, -3, 0.5];
  const segs = 6;
  for (let k = 0; k < segs; k++) {
    const t = (k + 1) / segs;
    const q = [sway * t, -3 + t * (5 + lunge), 0.5 + Math.sin(t * Math.PI * 0.8) * 9 * (1 - lunge * 0.05)];
    cap(p, q, 2.3 - k * 0.12, k % 2 ? c.skin : shade(c.skin, -0.1));
    p = q;
  }
  ball(p, 2.2, c.skin);
  const open = pose === 'attack1' ? 1.4 : 0.4;
  cap(p, [p[0], p[1] + 2.4, p[2] + open], 0.9, c.dark, 0.3);
  cap(p, [p[0], p[1] + 2.4, p[2] - open], 0.9, c.belly, 0.3);
  for (const side of [-1, 1]) ball([p[0] + side * 1.1, p[1] + 0.8, p[2] + 1.2], 0.35, P.ink, 0.6);
  return out;
}

/** A rust mite: a flat round shell on eight short legs, feelers. */
function miteParts(c, phase, walking, pose) {
  const out = [];
  const cap = (a, b, r, color, bias = 0) => out.push({ kind: 'cap', a, b, r, color, bias });
  const ball = (p, r, color, bias = 0) => out.push({ kind: 'ball', a: p, r, color, bias });
  const dead = pose === 'dead';
  const bz = dead ? 1.4 : 3;
  for (let i = 0; i < 4; i++)
    for (const side of [-1, 1]) {
      const ph = phase * 2 + i * 1.3 + (side > 0 ? Math.PI : 0);
      const lift = walking ? Math.max(0, Math.sin(ph)) * 1 : 0;
      const f = 2 - i * 1.4;
      cap([side * 2, f, bz], [side * (dead ? 4 : 4.6), f + (walking ? Math.cos(ph) * 0.6 : 0), dead ? 3 : 0.6 + lift], 0.6, c.joint);
    }
  const lunge = pose === 'attack1' ? 1.2 : 0;
  ball([0, 0 + lunge, bz + 0.4], 3.4, c.shell);
  ball([0, 0.6 + lunge, bz + 1.4], 2.2, shade(c.shell, 0.15));
  ball([0, 3.2 + lunge, bz], 1.4, c.dark);
  if (!dead) for (const side of [-1, 1]) cap([side * 0.6, 4 + lunge, bz + 0.4], [side * 1.8, 6.2 + lunge, bz + 1.6], 0.3, c.dark);
  return out;
}

function scorpParts(c, phase, walking, pose) {
  const out = [];
  const cap = (a, b, r, color, bias = 0) => out.push({ kind: 'cap', a, b, r, color, bias });
  const ball = (p, r, color, bias = 0) => out.push({ kind: 'ball', a: p, r, color, bias });
  const dead = pose === 'dead';
  const bz = dead ? 2.4 : 5;
  // tail start angle, curl per segment, segment length, body shift along facing
  const [th0, curl, segLen, shift] = {
    idle: [0.45, 0.55, 2.6, 0],
    walk: [0.45, 0.55, 2.6, 0],
    attack1: [1.05, 0.26, 2.9, -0.8],
    attack2: [0.55, 0.64, 3.4, 2],
    hit: [0.45, 0.6, 2.4, -1.2],
    dead: [0.05, 0.02, 2.6, 0],
  }[pose];
  const back = shift;
  // legs: four pairs, alternating gait
  for (let i = 0; i < 4; i++)
    for (const side of [-1, 1]) {
      const ph = phase + i * (Math.PI / 2) + (side > 0 ? Math.PI : 0);
      const lift = walking ? Math.max(0, Math.sin(ph)) * 1.6 : 0;
      const sw = walking ? Math.cos(ph) * 1.3 : 0;
      const f = 3 - i * 2 + back;
      const knee = dead ? [side * 4.5, f, 6] : [side * 6.2, f + sw * 0.5, 4.8 + lift];
      const foot = dead ? [side * 5.5, f + 0.5, 8] : [side * 8.8, f + sw, 0.9 + lift * 0.5];
      cap([side * 2.4, f, bz], knee, 0.9, c.joint);
      cap(knee, foot, 0.8, c.dark);
    }
  // body segments, head at the front
  ball([0, 3 + back, bz + 0.3], 3.6, c.shell);
  ball([0, 0 + back, bz + 0.6], 3.9, c.shell);
  ball([0, -3 + back, bz + 0.4], 3.4, shade(c.shell, -0.08));
  ball([0, -5.6 + back, bz], 2.8, shade(c.shell, -0.12));
  if (!dead) for (const side of [-1, 1]) ball([side * 1.1, 5.9 + back, bz + 1.5], 0.7, P.ink, 0.5);
  // pincers
  const reach = pose === 'attack1' ? 1.5 : pose === 'hit' ? -1 : 0;
  for (const side of [-1, 1]) {
    const lift = pose === 'hit' ? 3 : 0;
    const elbow = [side * 4.6, 6.4 + back, bz - 0.4 + lift];
    const hand = [side * 3.4, 10 + reach + back, bz + lift];
    cap([side * 2.6, 4.4 + back, bz], elbow, 1.2, c.claw);
    cap(elbow, hand, 1.3, c.claw);
    ball(hand, 2.1, c.claw);
    const open = pose === 'attack1' ? 1.4 : 0.6;
    cap(hand, [hand[0] + side * open, hand[1] + 2.8, hand[2] + 0.5], 0.8, c.dark);
    cap(hand, [hand[0] - side * 0.7, hand[1] + 2.6, hand[2] - 0.4], 0.7, c.dark);
  }
  // tail: segments curling up and over the back; the strike throws the tip forward
  let p = [0, -7 + back, bz];
  let th = th0;
  for (let k = 0; k < 6; k++) {
    const r = 2.2 - k * 0.2;
    const q = [0, p[1] - Math.cos(th) * segLen, p[2] + Math.sin(th) * segLen];
    cap(p, q, r, k < 5 ? shade(c.shell, -0.05 * k) : c.dark, -0.2);
    p = q;
    th += curl;
  }
  ball(p, 1.7, c.tip, 0.2);
  cap(p, [p[0], p[1] - Math.cos(th) * 2.4, p[2] + Math.sin(th) * 2.4], 0.6, P.ink, 0.3);
  return out;
}

export function buildCreatureSheet(c) {
  const cols = S_POSES.length;
  const cv = canvas(S_FRAME_W * cols, S_FRAME_H * 8);
  for (let dir = 0; dir < 8; dir++)
    for (let col = 0; col < cols; col++) {
      const pose = S_POSES[col];
      const walking = pose === 'walk';
      const phase = walking ? ((col - 1) / 4) * Math.PI * 2 : 0;
      const body = c.dog ? dogParts(c, phase, walking, pose) : c.eel ? eelParts(c, phase, walking, pose) : c.mite ? miteParts(c, phase, walking, pose) : scorpParts(c, phase, walking, pose);
      renderParts(cv.ctx, col * S_FRAME_W + S_FOOT_X, dir * S_FRAME_H + S_FOOT_Y, dir, body, c.scale);
    }
  return finalize(cv);
}
