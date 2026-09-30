// 32x32 icons for the stage G catalog, drawn from small specs: charms on a cord, chems and food, parts and ammo.
import { canvas, line, circle, ellipse, poly, px } from './draw.mjs';
import { P } from './palette.mjs';

/** A leather cord hanging from the top corners down to the pendant at (x, y). */
function cord(ctx, x, y) {
  line(ctx, 5, 3, x - 2, y - 5, P.brown1);
  line(ctx, 27, 3, x + 2, y - 5, P.brown1);
  line(ctx, 5, 4, x - 2, y - 4, P.brown2);
}

const CHARM_SHAPES = {
  // a dried scorpion curled on itself
  scorp(ctx, c) {
    ellipse(ctx, 16, 20, 5, 4, c.base);
    ellipse(ctx, 15, 19, 3, 2, c.lit);
    for (const s of [-1, 1]) {
      line(ctx, 16 + s * 4, 18, 16 + s * 8, 14, c.base);
      circle(ctx, 16 + s * 8, 13, 1.6, c.base);
    }
    line(ctx, 16, 24, 20, 27, c.base);
    line(ctx, 20, 27, 23, 24, c.base);
    px(ctx, 23, 23, P.bone);
  },
  // a hex nut with a bright chip of wear
  nut(ctx, c) {
    poly(ctx, [[11, 15], [16, 12], [21, 15], [21, 21], [16, 24], [11, 21]], c.base);
    poly(ctx, [[12, 15.5], [16, 13], [20, 15.5], [16, 18]], c.lit);
    circle(ctx, 16, 18.5, 2.4, P.dark0);
    px(ctx, 13, 15, P.grey6);
  },
  drop(ctx, c) {
    poly(ctx, [[16, 11], [21, 19], [11, 19]], c.base);
    circle(ctx, 16, 20, 5, c.base);
    circle(ctx, 14, 19, 1.6, c.lit);
    circle(ctx, 17, 21, 1, P.dark1); // the thing caught inside
  },
  tooth(ctx, c) {
    poly(ctx, [[12, 13], [20, 13], [17, 27], [15, 27]], c.base);
    line(ctx, 13, 14, 16, 25, c.lit);
  },
  shell(ctx, c) {
    poly(ctx, [[13, 12], [19, 12], [19, 26], [13, 26]], c.base);
    ellipse(ctx, 16, 12, 3, 1.4, c.lit);
    line(ctx, 14, 13, 14, 25, c.lit);
    for (const [x, y] of [[15, 16], [17, 19], [15, 22]]) px(ctx, x, y, P.sand5);
  },
  button(ctx, c) {
    circle(ctx, 16, 19, 6, c.base);
    circle(ctx, 16, 19, 4.4, c.lit);
    for (const [x, y] of [[14, 17], [18, 17], [14, 21], [18, 21]]) px(ctx, x, y, P.dark0);
  },
  badge(ctx, c) {
    circle(ctx, 16, 19, 6.5, c.base);
    circle(ctx, 16, 19, 5, c.lit);
    poly(ctx, [[16, 15], [18.5, 20], [13.5, 20]], c.base);
    circle(ctx, 16, 20.5, 2, c.base);
  },
  finger(ctx, c) {
    poly(ctx, [[13, 12], [19, 12], [19, 27], [13, 27]], c.base);
    ellipse(ctx, 16, 12, 3, 2, c.base);
    poly(ctx, [[13, 12], [19, 12], [19, 17], [13, 17]], c.lit); // ink up to the knuckle
  },
  feather(ctx, c) {
    line(ctx, 12, 28, 20, 11, P.bone);
    for (let k = 0; k < 7; k++) {
      line(ctx, 13 + k, 26 - k * 2.3, 9 + k, 22 - k * 2.3, c.base);
      line(ctx, 14 + k, 26 - k * 2.3, 19 + k, 23 - k * 2.3, c.lit);
    }
  },
  band(ctx, c) {
    ellipse(ctx, 16, 19, 8, 6, c.base);
    ellipse(ctx, 16, 19, 5.5, 3.6, P.dark0);
    line(ctx, 10, 17, 14, 14, c.lit);
  },
  crystal(ctx, c) {
    poly(ctx, [[16, 10], [21, 17], [18, 27], [13, 27], [11, 17]], c.base);
    poly(ctx, [[16, 10], [18, 17], [16, 26], [13, 17]], c.lit);
  },
  amulet(ctx, c) {
    circle(ctx, 16, 19, 7, c.base);
    circle(ctx, 16, 19, 5, P.dark1);
    line(ctx, 16, 15, 16, 23, c.lit);
    line(ctx, 13, 17, 16, 20, c.lit);
    line(ctx, 19, 18, 16, 21, c.lit);
  },
  leaf(ctx, c) {
    ellipse(ctx, 16, 20, 5, 8, c.base);
    line(ctx, 16, 13, 16, 27, c.lit);
    for (const y of [17, 21, 24]) {
      line(ctx, 16, y, 13, y - 2, c.lit);
      line(ctx, 16, y, 19, y - 2, c.lit);
    }
  },
  gear(ctx, c) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) circle(ctx, 16 + Math.cos(a) * 6, 19 + Math.sin(a) * 6, 1.8, c.base);
    circle(ctx, 16, 19, 5.5, c.base);
    circle(ctx, 16, 19, 2.2, P.dark0);
    px(ctx, 13, 16, c.lit);
  },
  beads(ctx, c) {
    for (let k = 0; k < 7; k++) circle(ctx, 9 + k * 2.4, 14 + Math.sin(k / 2) * 6 + k * 0.6, 1.8, k % 3 ? c.base : c.lit);
    poly(ctx, [[15, 23], [18, 23], [18, 28], [15, 28]], c.lit);
  },
  compass(ctx, c) {
    circle(ctx, 16, 19, 7, c.base);
    circle(ctx, 16, 19, 5.4, c.lit);
    circle(ctx, 16, 19, 1, P.dark0); // no needle
  },
  lens(ctx, c) {
    circle(ctx, 16, 19, 6.5, c.base);
    circle(ctx, 16, 19, 5, c.lit);
    line(ctx, 13, 16, 15, 14, P.grey6);
  },
  bone(ctx, c) {
    line(ctx, 11, 24, 21, 14, c.base);
    line(ctx, 12, 24, 22, 14, c.base);
    for (const [x, y] of [[10, 23], [12, 26], [20, 12], [23, 15]]) circle(ctx, x, y, 2, c.base);
    line(ctx, 12, 22, 20, 14, c.lit);
  },
  key(ctx, c) {
    circle(ctx, 16, 15, 4, c.base);
    circle(ctx, 16, 15, 1.8, P.dark0);
    line(ctx, 16, 19, 16, 28, c.base);
    line(ctx, 17, 19, 17, 28, c.lit);
    line(ctx, 17, 25, 20, 25, c.base);
    line(ctx, 17, 27, 19, 27, c.base);
  },
};

// id -> the pendant and its colours
export const CHARM_ICONS = {
  venom_ward: { shape: 'scorp', base: P.rust1, lit: P.rust2 },
  lucky_nut: { shape: 'nut', base: P.grey3, lit: P.grey5 },
  resin_drop: { shape: 'drop', base: P.fire1, lit: P.sand5 },
  jackal_tooth: { shape: 'tooth', base: P.bone, lit: P.sand5 },
  sand_shell: { shape: 'shell', base: P.fire0, lit: P.fire1 },
  warden_button: { shape: 'button', base: P.brown3, lit: P.sand4 },
  collector_badge: { shape: 'badge', base: P.brown3, lit: P.sand4 },
  ink_finger: { shape: 'finger', base: P.skin1, lit: P.dark1 },
  condor_feather: { shape: 'feather', base: P.grey3, lit: P.grey5 },
  copper_band: { shape: 'band', base: P.fire0, lit: P.fire1 },
  salt_crystal: { shape: 'crystal', base: P.grey5, lit: P.bone },
  silence_amulet: { shape: 'amulet', base: P.olive1, lit: P.olive2 },
  mint_leaf: { shape: 'leaf', base: P.olive1, lit: P.olive2 },
  gear_charm: { shape: 'gear', base: P.grey3, lit: P.grey5 },
  ark_beads: { shape: 'beads', base: P.brown2, lit: P.teal1 },
  blind_compass: { shape: 'compass', base: P.brown3, lit: P.bone },
  lens: { shape: 'lens', base: P.grey3, lit: P.water1 },
  dry_bone: { shape: 'bone', base: P.sand4, lit: P.bone },
  nothing_key: { shape: 'key', base: P.grey4, lit: P.grey6 },
  dog_whistle: { shape: 'bone', base: P.bone, lit: P.sand5 },
  resin_amulet: { shape: 'drop', base: P.brown3, lit: P.fire1 },
  eel_hatchling: { shape: 'shell', base: P.grey4, lit: P.sand3 },
};

const CHEM_SHAPES = {
  // a corked glass bottle
  bottle(ctx, c) {
    poly(ctx, [[11, 12], [21, 12], [22, 27], [10, 27]], P.grey5);
    poly(ctx, [[12, 16], [20, 16], [21, 26], [11, 26]], c.liquid);
    poly(ctx, [[14, 6], [18, 6], [18, 12], [14, 12]], P.grey4);
    poly(ctx, [[14, 4], [18, 4], [18, 7], [14, 7]], P.brown2);
    line(ctx, 12, 17, 12, 25, P.grey6);
    if (c.mark) {
      ctx.fillStyle = c.mark;
      ctx.fillRect(15, 19, 2, 6);
      ctx.fillRect(13, 21, 6, 2);
    }
  },
  // a syringe with coloured liquid
  syringe(ctx, c) {
    poly(ctx, [[8, 22], [20, 10], [24, 14], [12, 26]], P.grey5);
    poly(ctx, [[10, 22], [19, 13], [21, 15], [12, 24]], c.liquid);
    line(ctx, 22, 12, 28, 6, P.grey6);
    line(ctx, 6, 24, 10, 28, P.dark1);
    line(ctx, 5, 26, 8, 29, P.dark1);
  },
  // a squat tin with its lid off
  jar(ctx, c) {
    ellipse(ctx, 16, 22, 9, 5, P.grey2);
    poly(ctx, [[7, 16], [25, 16], [25, 22], [7, 22]], P.grey3);
    ellipse(ctx, 16, 16, 9, 4, c.liquid);
    ellipse(ctx, 14, 15, 3, 1.5, P.sand5);
  },
  // a tin mug, black tea and steam
  cup(ctx, c) {
    poly(ctx, [[9, 13], [21, 13], [20, 27], [10, 27]], P.grey4);
    ellipse(ctx, 15, 13, 6, 2, c.liquid);
    line(ctx, 21, 16, 25, 17, P.grey4);
    line(ctx, 25, 17, 24, 23, P.grey4);
    line(ctx, 24, 23, 20, 23, P.grey4);
    for (const x of [13, 17]) line(ctx, x, 9, x + 1, 4, P.grey6);
  },
  // a drawstring pouch spilling pale dust
  pouch(ctx, c) {
    ellipse(ctx, 15, 20, 8, 8, P.brown2);
    ellipse(ctx, 13, 18, 4, 4, P.brown3);
    line(ctx, 11, 12, 19, 12, P.brown1);
    for (const [x, y] of [[23, 22], [25, 24], [22, 26], [26, 21]]) px(ctx, x, y, c.liquid);
  },
  // a dried fish on a string
  fish(ctx, c) {
    ellipse(ctx, 16, 18, 10, 4, c.liquid);
    ellipse(ctx, 14, 17, 6, 2, P.sand3);
    poly(ctx, [[26, 18], [30, 14], [30, 22]], c.liquid);
    px(ctx, 9, 17, P.dark0);
    line(ctx, 6, 18, 3, 10, P.brown1);
  },
  // a roasted lizard on a skewer, glistening with venom
  lizard(ctx, c) {
    ellipse(ctx, 16, 18, 9, 4, P.brown3);
    ellipse(ctx, 15, 17, 6, 2.5, c.liquid);
    circle(ctx, 25, 16, 3, P.brown3);
    line(ctx, 7, 19, 3, 23, P.brown2);
    for (const x of [11, 19]) {
      line(ctx, x, 21, x - 2, 25, P.brown2);
      line(ctx, x, 15, x - 2, 11, P.brown2);
    }
    line(ctx, 4, 28, 28, 6, P.grey3);
    for (const [x, y] of [[13, 13], [18, 12], [22, 20]]) px(ctx, x, y, P.olive2);
  },
  // the canteen, full: a water drop on the side
  canteen(ctx, c) {
    ellipse(ctx, 16, 18, 10, 11, P.olive1);
    ellipse(ctx, 14, 16, 7, 8, P.olive2);
    ctx.fillStyle = P.grey3;
    ctx.fillRect(14, 4, 5, 5);
    poly(ctx, [[16, 13], [19.5, 20], [12.5, 20]], c.liquid);
    circle(ctx, 16, 20, 3.4, c.liquid);
  },
};

// id -> container and liquid colour
export const CHEM_ICONS = {
  flask: { shape: 'canteen', liquid: P.teal2 },
  cactus_juice: { shape: 'bottle', liquid: P.olive2 },
  resin: { shape: 'jar', liquid: P.fire0 },
  dried_eel: { shape: 'fish', liquid: P.brown3 },
  ointment: { shape: 'jar', liquid: P.fire1 },
  chifir: { shape: 'cup', liquid: P.dark1 },
  coolant: { shape: 'bottle', liquid: P.teal1 },
  silence_pollen: { shape: 'pouch', liquid: P.grey6 },
  squint: { shape: 'syringe', liquid: P.sand4 },
  bonebreaker: { shape: 'syringe', liquid: P.red1 },
  mirage: { shape: 'syringe', liquid: P.teal2 },
  cleanse: { shape: 'bottle', liquid: P.bone, mark: P.olive1 },
  scent_lizard: { shape: 'lizard', liquid: P.olive1 },
};

const PART_SHAPES = {
  scope(ctx) {
    ellipse(ctx, 16, 16, 11, 4, P.dark0);
    ellipse(ctx, 16, 15, 10, 2.6, P.grey2);
    circle(ctx, 26, 16, 3, P.water1);
    for (const x of [11, 20]) line(ctx, x, 19, x, 23, P.grey3);
  },
  spring(ctx) {
    for (let k = 0; k < 6; k++) ellipse(ctx, 8 + k * 3.4, 16, 2, 7, k % 2 ? P.grey4 : P.grey5);
  },
  nuts(ctx) {
    for (const [x, y] of [[10, 12], [20, 13], [14, 21], [23, 22]]) {
      poly(ctx, [[x - 4, y], [x - 2, y - 3], [x + 2, y - 3], [x + 4, y], [x + 2, y + 3], [x - 2, y + 3]], P.grey3);
      circle(ctx, x, y, 1.4, P.dark0);
    }
  },
  plates(ctx) {
    for (let k = 0; k < 3; k++) poly(ctx, [[6 + k * 2, 12 + k * 4], [24 + k * 2, 10 + k * 4], [25 + k * 2, 14 + k * 4], [7 + k * 2, 16 + k * 4]], k % 2 ? P.grey2 : P.grey4);
  },
  sprayer(ctx) {
    ellipse(ctx, 13, 19, 7, 9, P.olive1);
    ellipse(ctx, 11, 17, 3, 5, P.olive2);
    line(ctx, 19, 13, 28, 8, P.grey2);
    line(ctx, 13, 10, 13, 5, P.dark1);
  },
  saw(ctx) {
    line(ctx, 6, 12, 26, 12, P.grey4);
    poly(ctx, [[6, 13], [26, 13], [26, 17], [6, 17]], P.grey5);
    for (let x = 7; x < 26; x += 2) px(ctx, x, 18, P.grey3);
    poly(ctx, [[2, 10], [7, 10], [7, 20], [2, 20]], P.red1);
  },
  drum(ctx) {
    circle(ctx, 16, 17, 10, P.dark1);
    circle(ctx, 16, 17, 7, P.olive1);
    circle(ctx, 16, 17, 2, P.dark0);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) px(ctx, 16 + Math.cos(a) * 5, 17 + Math.sin(a) * 5, P.fire1);
  },
  cell(ctx) {
    poly(ctx, [[9, 8], [23, 8], [23, 27], [9, 27]], P.teal0);
    poly(ctx, [[10, 9], [22, 9], [22, 16], [10, 16]], P.water2);
    ctx.fillStyle = P.grey4;
    ctx.fillRect(13, 5, 6, 3);
    line(ctx, 12, 21, 20, 21, P.fire1);
  },
  sting(ctx, c) {
    poly(ctx, [[8, 26], [18, 16], [22, 20], [12, 28]], c.base);
    poly(ctx, [[18, 16], [26, 6], [28, 8], [22, 20]], c.lit);
    poly(ctx, [[26, 6], [30, 2], [28, 8]], P.bone);
  },
  carapace(ctx, c) {
    ellipse(ctx, 16, 18, 12, 8, c.base);
    for (let y = 13; y < 25; y += 3) line(ctx, 6, y, 26, y, c.lit);
    ellipse(ctx, 12, 15, 4, 2, P.sand3);
  },
  bullets(ctx, c) {
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = c.base;
      ctx.fillRect(8 + k * 5, 12, 3, 12);
      ctx.fillStyle = c.lit;
      ctx.fillRect(8 + k * 5, 10, 3, 3);
    }
  },
  bolts(ctx) {
    for (let k = 0; k < 3; k++) {
      line(ctx, 6 + k * 4, 26, 22 + k * 4, 8, P.brown3);
      poly(ctx, [[21 + k * 4, 7], [25 + k * 4, 5], [23 + k * 4, 10]], P.grey5);
    }
  },
  flares(ctx) {
    for (let k = 0; k < 3; k++) {
      poly(ctx, [[8 + k * 7, 10], [13 + k * 7, 10], [13 + k * 7, 26], [8 + k * 7, 26]], P.red1);
      ellipse(ctx, 10.5 + k * 7, 10, 2.5, 1.2, P.fire1);
    }
  },
  map(ctx) {
    poly(ctx, [[5, 8], [27, 6], [27, 25], [5, 27]], P.sand4);
    poly(ctx, [[5, 8], [12, 7.4], [12, 26.4], [5, 27]], P.sand3);
    poly(ctx, [[20, 6.6], [27, 6], [27, 25], [20, 25.6]], P.sand3);
    for (let k = 0; k < 7; k++) ctx.fillRect(8 + k * 2.6, 22 - k * 2 + (k % 2), 2, 1); // the dashed trail
    ctx.fillStyle = P.red1;
    ctx.fillRect(23, 9, 2, 2);
  },
  hide(ctx, c) {
    poly(ctx, [[6, 12], [11, 7], [21, 7], [26, 12], [25, 24], [16, 27], [7, 24]], c.base);
    poly(ctx, [[9, 13], [23, 13], [22, 22], [10, 22]], c.lit);
    for (const [x, y] of [[6, 12], [26, 12], [7, 24], [25, 24]]) ctx.fillRect(x - 1, y - 1, 2, 2);
  },
  // a tin box with a paper tag
  seedbox(ctx) {
    poly(ctx, [[6, 12], [26, 12], [26, 27], [6, 27]], P.grey3);
    poly(ctx, [[6, 9], [26, 9], [26, 13], [6, 13]], P.grey4);
    poly(ctx, [[10, 16], [20, 16], [20, 23], [10, 23]], P.sand4);
    for (const y of [18, 20]) line(ctx, 11, y, 19, y, P.dark1);
    for (const x of [8, 24]) ellipse(ctx, x, 25, 1.2, 1.2, P.olive2);
  },
  barrel(ctx) {
    ellipse(ctx, 16, 26, 9, 3, P.brown0);
    poly(ctx, [[7, 9], [25, 9], [25, 26], [7, 26]], P.brown2);
    for (const y of [12, 22]) line(ctx, 7, y, 25, y, P.grey2);
    ellipse(ctx, 16, 9, 9, 3, P.water1);
  },
  traps(ctx) {
    for (const [x, y] of [[11, 14], [21, 20]]) {
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        line(ctx, x, y, x + Math.cos(a) * 6, y + Math.sin(a) * 6, k % 2 ? P.olive2 : P.brown2);
      }
      ctx.fillStyle = P.brown0;
      ctx.fillRect(x - 1, y - 1, 3, 3);
    }
  },
  fuel(ctx) {
    poly(ctx, [[8, 9], [24, 9], [24, 28], [8, 28]], P.red1);
    poly(ctx, [[8, 9], [15, 9], [15, 5], [8, 5]], P.red2);
    line(ctx, 10, 14, 22, 26, P.red2);
    line(ctx, 22, 14, 10, 26, P.red2);
  },
};

export const PART_ICONS = {
  scope: { shape: 'scope' },
  spring: { shape: 'spring' },
  nuts: { shape: 'nuts' },
  plates: { shape: 'plates' },
  sprayer: { shape: 'sprayer' },
  saw: { shape: 'saw' },
  drum: { shape: 'drum' },
  drone_cell: { shape: 'cell' },
  reaper_sting: { shape: 'sting', base: P.brown3, lit: P.brown2 },
  queen_sting_raw: { shape: 'sting', base: P.dark1, lit: P.dark2 },
  reaper_carapace: { shape: 'carapace', base: P.brown3, lit: P.brown1 },
  pistol: { shape: 'bullets', base: P.fire0, lit: P.grey4 },
  bolts: { shape: 'bolts' },
  flares: { shape: 'flares' },
  fuel: { shape: 'fuel' },
  water_path_map: { shape: 'map' },
  jackal_hide: { shape: 'hide', base: P.sand3, lit: P.sand4 },
  leader_hide: { shape: 'hide', base: P.brown2, lit: P.brown3 },
  behemoth_shell: { shape: 'carapace', base: P.olive1, lit: P.olive0 },
  water_barrel: { shape: 'barrel' },
  eel_skin: { shape: 'hide', base: P.grey3, lit: P.sand3 },
  crate_seed: { shape: 'seedbox' },
  thorn_traps: { shape: 'traps' },
};

export const KIT_ICONS = [...Object.keys(CHARM_ICONS), ...Object.keys(CHEM_ICONS), ...Object.keys(PART_ICONS)];

export function kitIcon(id) {
  const cv = canvas(32, 32);
  const { ctx } = cv;
  const charm = CHARM_ICONS[id];
  if (charm) {
    cord(ctx, 16, 17);
    CHARM_SHAPES[charm.shape](ctx, charm);
  }
  const chem = CHEM_ICONS[id];
  if (chem) CHEM_SHAPES[chem.shape](ctx, chem);
  const part = PART_ICONS[id];
  if (part) PART_SHAPES[part.shape](ctx, part);
  return cv;
}
