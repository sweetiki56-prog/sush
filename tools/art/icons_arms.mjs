// 32x32 icons for the stage G weapons, grenades and armor, drawn by family from small specs.
import { canvas, line, circle, ellipse, poly, px } from './draw.mjs';
import { P } from './palette.mjs';

function barrel(ctx, x0, y0, x1, y1, dark = P.dark1, lit = P.grey3) {
  line(ctx, x0, y0, x1, y1, dark);
  line(ctx, x0, y0 + 1, x1, y1 + 1, lit);
}

function stock(ctx, wood) {
  poly(ctx, [[2, 23], [10, 19], [12, 24], [3, 28]], wood);
  line(ctx, 3, 24, 10, 21, P.brown4);
}

const GUN = {
  pistol(ctx, s) {
    poly(ctx, [[7, 15], [24, 10], [25, 14], [8, 19]], s.body);
    line(ctx, 8, 15, 23, 11, s.lit ?? P.grey4);
    poly(ctx, [[8, 18], [13, 17], [15, 27], [10, 28]], s.wood ?? P.dark1);
    if (s.drum) circle(ctx, 16, 15, 3, s.drum);
    if (s.wide) circle(ctx, 25, 11, 3, s.wide);
    if (s.long) {
      poly(ctx, [[22, 10.5], [30, 8], [30.5, 10.5], [23, 13]], s.body);
      line(ctx, 23, 11, 30, 8.8, s.lit ?? P.grey4);
    }
    if (s.mark) px(ctx, 11, 22, s.mark);
  },
  rifle(ctx, s) {
    barrel(ctx, 2, 23, 30, 9);
    stock(ctx, s.wood ?? P.brown2);
    poly(ctx, [[10, 18], [18, 14], [19, 17], [11, 21]], s.body ?? P.grey1);
    if (s.scope) {
      ellipse(ctx, 17, 13, 5, 2.2, P.dark0);
      ellipse(ctx, 17, 12.5, 4, 1.4, s.scope);
    }
    if (s.mag) poly(ctx, [[14, 19], [18, 18], [20, 27], [16, 28]], s.mag);
    if (s.drum) circle(ctx, 17, 23, 4, s.drum);
    if (s.bipod) {
      line(ctx, 22, 14, 19, 22, P.grey2);
      line(ctx, 22, 14, 26, 21, P.grey2);
    }
    if (s.lever) {
      // the brass loop under the grip
      line(ctx, 11, 21, 11, 26, s.lever);
      line(ctx, 11, 26, 16, 24, s.lever);
      line(ctx, 16, 24, 15, 19, s.lever);
    }
  },
  shotgun(ctx, s) {
    const end = s.short ? 20 : 29;
    barrel(ctx, 4, 20, end, s.short ? 14 : 9);
    barrel(ctx, 5, 22, end, s.short ? 16 : 11, P.dark0, P.grey2);
    if (!s.short) stock(ctx, s.wood ?? P.brown3);
    else poly(ctx, [[3, 23], [8, 21], [10, 27], [5, 28]], s.wood ?? P.brown3);
    if (s.pump) poly(ctx, [[15, 17], [21, 15], [22, 18], [16, 20]], s.pump);
    if (s.mark) circle(ctx, 13, 19, 1.8, s.mark);
  },
  energy(ctx, s) {
    poly(ctx, [[6, 14], [22, 11], [24, 18], [8, 21]], s.body);
    poly(ctx, [[8, 15], [20, 13], [21, 16], [9, 18]], s.lit);
    poly(ctx, [[10, 20], [15, 19], [16, 28], [11, 28]], P.dark1);
    ctx.fillStyle = P.grey4;
    ctx.fillRect(23, 12, 3, 5);
    line(ctx, 26, 13, 29, 9, s.spark);
    line(ctx, 29, 9, 27, 7, s.spark);
    line(ctx, 26, 16, 30, 17, s.spark);
  },
  flamer(ctx) {
    ellipse(ctx, 10, 20, 6, 8, P.red1);
    ellipse(ctx, 9, 18, 3, 5, P.red2);
    line(ctx, 14, 16, 26, 9, P.grey2);
    line(ctx, 14, 17, 26, 10, P.grey4);
    circle(ctx, 28, 8, 2.5, P.fire1);
    px(ctx, 30, 6, P.fire2);
  },
  bow(ctx, s) {
    for (let a = -1.2; a < 1.2; a += 0.1) {
      const x = 16 + Math.cos(a + 0.8) * 13;
      const y = 16 - Math.sin(a + 0.8) * 13;
      px(ctx, x, y, s.body);
      px(ctx, x + 1, y, s.body);
    }
    line(ctx, 26, 4, 5, 25, P.bone);
    line(ctx, 6, 26, 26, 6, s.wood ?? P.brown3);
    poly(ctx, [[25, 5], [29, 3], [27, 7]], P.grey5);
    if (s.feather) poly(ctx, [[6, 24], [3, 29], [9, 27]], s.feather);
  },
  crossbow(ctx, s) {
    line(ctx, 5, 26, 25, 8, s.wood ?? P.brown3);
    line(ctx, 6, 26, 26, 8, s.wood ?? P.brown2);
    line(ctx, 14, 7, 27, 19, P.grey3);
    line(ctx, 14, 8, 27, 20, P.grey2);
    line(ctx, 14, 8, 20, 17, P.bone);
    line(ctx, 27, 19, 20, 17, P.bone);
  },
};

const BLADE = {
  knife(ctx, s) {
    poly(ctx, [[10, 22], [25, 7], [27, 9], [12, 24]], s.body);
    line(ctx, 11, 22, 25, 8, s.lit ?? P.grey6);
    poly(ctx, [[5, 29], [10, 22], [12, 24], [7, 30]], s.wood ?? P.brown2);
    if (s.drip) for (const [x, y] of [[20, 15], [17, 18]]) px(ctx, x, y, s.drip);
  },
  awl(ctx) {
    line(ctx, 8, 25, 27, 6, P.rust1);
    line(ctx, 9, 25, 27, 7, P.grey3);
    poly(ctx, [[4, 29], [9, 23], [12, 26], [7, 31]], P.dark2);
  },
  wrench(ctx) {
    line(ctx, 6, 27, 20, 13, P.grey3);
    line(ctx, 7, 27, 21, 13, P.grey4);
    poly(ctx, [[18, 9], [24, 4], [29, 9], [25, 11], [23, 9], [21, 13]], P.grey3);
    circle(ctx, 8, 26, 2.5, P.grey2);
  },
  cleaver(ctx) {
    poly(ctx, [[10, 20], [20, 6], [29, 12], [18, 25]], P.grey5);
    line(ctx, 11, 20, 20, 8, P.grey6);
    circle(ctx, 24, 11, 1.4, P.dark0);
    poly(ctx, [[4, 29], [11, 20], [14, 23], [7, 31]], P.brown1);
  },
  hook(ctx) {
    line(ctx, 3, 29, 24, 8, P.red1);
    line(ctx, 4, 29, 25, 8, P.red2);
    poly(ctx, [[23, 6], [30, 2], [26, 9]], P.grey4);
    line(ctx, 25, 7, 29, 11, P.grey4);
    line(ctx, 29, 11, 27, 13, P.grey4);
  },
  baton(ctx, s) {
    line(ctx, 6, 27, 23, 10, P.dark1);
    line(ctx, 7, 27, 24, 10, P.grey2);
    poly(ctx, [[21, 7], [26, 5], [27, 10], [23, 12]], P.grey4);
    line(ctx, 27, 5, 30, 2, s.spark);
    line(ctx, 28, 8, 31, 9, s.spark);
    poly(ctx, [[4, 29], [8, 25], [10, 27], [6, 31]], P.dark0);
  },
  saw(ctx) {
    poly(ctx, [[4, 21], [14, 15], [17, 22], [7, 28]], P.fire0);
    poly(ctx, [[14, 16], [28, 7], [30, 11], [16, 20]], P.grey4);
    for (let k = 0; k < 5; k++) px(ctx, 16 + k * 3, 14 - k * 2, P.grey6);
    circle(ctx, 9, 22, 2.5, P.dark1);
  },
  fist(ctx, s) {
    poly(ctx, [[8, 12], [22, 10], [24, 24], [10, 26]], s.body ?? P.grey3);
    for (let k = 0; k < 4; k++) circle(ctx, 11 + k * 4, 11, 2.2, s.lit ?? P.grey5);
    line(ctx, 4, 20, 9, 18, P.fire0);
    line(ctx, 4, 23, 9, 21, P.fire0);
    circle(ctx, 16, 18, 3, P.dark1);
  },
  spear(ctx, s) {
    line(ctx, 3, 29, 23, 9, s.wood ?? P.rust1);
    line(ctx, 4, 29, 24, 9, s.wood2 ?? P.rust2);
    poly(ctx, [[21, 7], [30, 1], [27, 11]], s.tip);
    if (s.hook) line(ctx, 25, 7, 28, 3, s.tip);
    for (const t of [10, 14]) line(ctx, t - 2, 29 - t + 1, t + 1, 29 - t - 2, P.brown3);
  },
  hammer(ctx, s) {
    line(ctx, 6, 28, 20, 10, P.brown3);
    line(ctx, 7, 28, 21, 10, P.brown2);
    poly(ctx, [[14, 8], [22, 2], [28, 9], [20, 15]], s.head);
    poly(ctx, [[20, 15], [28, 9], [29, 12], [21, 18]], s.dark);
    if (s.dots) for (const [x, y] of [[18, 6], [22, 9], [25, 7], [19, 11]]) px(ctx, x, y, s.dots);
  },
  machete(ctx, s) {
    poly(ctx, [[8, 24], [24, 5], [28, 5], [27, 9], [11, 27]], P.grey5);
    poly(ctx, [[4, 30], [8, 24], [11, 27], [6, 31]], P.brown2);
    if (s.fire) for (const [x, y] of [[20, 7], [24, 4], [16, 12], [26, 8]]) circle(ctx, x, y, 1.5, s.fire);
  },
};

const NADE = {
  can(ctx, s) {
    ellipse(ctx, 16, 10, 8, 3, P.grey5);
    poly(ctx, [[8, 10], [24, 10], [24, 25], [8, 25]], s.body);
    ellipse(ctx, 16, 25, 8, 3, P.grey2);
    line(ctx, 9, 15, 23, 15, s.band);
    line(ctx, 9, 20, 23, 20, s.band);
    line(ctx, 17, 8, 22, 3, P.bone);
    circle(ctx, 23, 3, 1.6, P.fire1);
    if (s.spikes) for (const [x, y] of [[7, 13], [25, 18], [8, 22], [24, 12]]) px(ctx, x, y, P.grey6);
  },
  extinguisher(ctx) {
    poly(ctx, [[11, 9], [21, 9], [21, 28], [11, 28]], P.red1);
    ellipse(ctx, 16, 9, 5, 2, P.red2);
    line(ctx, 16, 7, 16, 4, P.dark1);
    line(ctx, 16, 4, 24, 6, P.dark1);
    poly(ctx, [[12, 14], [15, 14], [15, 20], [12, 20]], P.bone);
  },
  ball(ctx, s) {
    circle(ctx, 16, 18, 9, s.body);
    circle(ctx, 13, 15, 3, s.lit);
    line(ctx, 16, 9, 20, 3, P.bone);
    circle(ctx, 21, 3, 1.6, P.fire1);
  },
};

function torso(ctx, main, dark, long = false) {
  poly(ctx, [[8, 6], [24, 6], [27, 12], [25, long ? 31 : 29], [7, long ? 31 : 29], [5, 12]], main);
  poly(ctx, [[13, 6], [19, 6], [16, 11]], P.dark0);
  line(ctx, 16, 11, 16, long ? 30 : 28, dark);
}

const ARMOR = {
  coat(ctx, s) {
    torso(ctx, s.main, s.dark, true);
    if (s.hood) poly(ctx, [[10, 2], [22, 2], [24, 8], [8, 8]], s.dark);
    line(ctx, 7, 20, 25, 20, s.belt ?? P.brown1);
  },
  plates(ctx, s) {
    torso(ctx, s.main, s.dark);
    for (const [x, y] of [[9, 12], [18, 12], [9, 20], [18, 20]]) poly(ctx, [[x, y], [x + 5, y], [x + 5, y + 6], [x, y + 6]], s.plate);
  },
  shell(ctx, s) {
    torso(ctx, s.main, s.dark);
    for (let y = 10; y < 28; y += 4) line(ctx, 7, y, 25, y, s.plate);
    if (s.scales) for (let y = 12; y < 28; y += 4) for (let x = 9; x < 24; x += 4) px(ctx, x + (y % 8 ? 2 : 0), y, s.scales);
  },
  crust(ctx, s) {
    torso(ctx, s.main, s.dark);
    for (const [x, y] of [[10, 12], [20, 14], [13, 22], [22, 24], [8, 26]]) poly(ctx, [[x, y + 3], [x + 2, y], [x + 4, y + 3]], P.bone);
  },
  cuirass(ctx, s) {
    torso(ctx, s.main, s.dark);
    poly(ctx, [[3, 8], [8, 6], [9, 14], [4, 15]], s.plate);
    poly(ctx, [[24, 6], [29, 8], [28, 15], [23, 14]], s.plate);
    ellipse(ctx, 16, 17, 6, 5, s.plate);
    if (s.filter) circle(ctx, 16, 17, 2.5, s.filter);
  },
  mail(ctx, s) {
    torso(ctx, s.main, s.dark);
    for (let y = 10; y < 28; y += 3) for (let x = 8; x < 25; x += 3) px(ctx, x, y, s.plate);
  },
};

// id -> family, drawing and colours
export const ARMS_ICONS = {
  awl: ['blade', 'awl'],
  wrench: ['blade', 'wrench'],
  cleaver: ['blade', 'cleaver'],
  hook: ['blade', 'hook'],
  stunbaton: ['blade', 'baton', { spark: P.water2 }],
  buzzsaw: ['blade', 'saw'],
  piston: ['blade', 'fist'],
  bugai_knuckles: ['blade', 'fist', { body: P.rust1, lit: P.sand4 }],
  reaper_spear: ['blade', 'spear', { tip: P.rust2, wood: P.brown3, wood2: P.brown2 }],
  shiv: ['blade', 'knife', { body: P.grey4, wood: P.sand3 }],
  queen_sting: ['blade', 'knife', { body: P.dark1, lit: P.grey2, wood: P.rust1 }],
  venom_knife: ['blade', 'knife', { body: P.grey5, drip: P.olive2 }],
  fire_machete: ['blade', 'machete', { fire: P.fire1 }],
  nut_sledge: ['blade', 'hammer', { head: P.grey2, dark: P.grey1, dots: P.sand4 }],
  salt_hammer: ['blade', 'hammer', { head: P.bone, dark: P.grey5, dots: P.grey6 }],
  zipgun: ['gun', 'pistol', { body: P.grey2, wood: P.brown2 }],
  service: ['gun', 'pistol', { body: P.dark1, lit: P.grey3, drum: P.grey2 }],
  flaregun: ['gun', 'pistol', { body: P.red1, lit: P.red2, wide: P.fire1 }],
  lastochka: ['gun', 'pistol', { body: P.grey4, lit: P.grey6, drum: P.grey3, wood: P.brown3, long: true }],
  lastochka_luka: ['gun', 'pistol', { body: P.grey5, lit: P.bone, drum: P.grey3, wood: P.red1, long: true, mark: P.sand5 }],
  dry_law: ['gun', 'pistol', { body: P.dark0, lit: P.sand4, drum: P.grey3, wood: P.brown3 }],
  nomad: ['gun', 'rifle', { wood: P.brown3 }],
  skoba: ['gun', 'rifle', { wood: P.rust2, body: P.dark1, lever: P.sand4 }],
  rifle_scoped: ['gun', 'rifle', { scope: P.grey2 }],
  thresher: ['gun', 'rifle', { body: P.dark2, mag: P.olive1, bipod: true, wood: P.dark1 }],
  stapler: ['gun', 'pistol', { body: P.fire0, lit: P.fire1, drum: P.grey4 }],
  drum_rattler: ['gun', 'rifle', { body: P.grey1, drum: P.olive1, wood: P.dark2 }],
  whisper_eye: ['gun', 'rifle', { scope: P.water1, wood: P.dark2 }],
  sawnoff: ['gun', 'shotgun', { short: true }],
  pump: ['gun', 'shotgun', { pump: P.brown2, wood: P.dark2 }],
  collector_gun: ['gun', 'shotgun', { mark: P.sand4 }],
  shore_zapper: ['gun', 'energy', { body: P.denim1, lit: P.teal1, spark: P.water2 }],
  boosted_sparker: ['gun', 'energy', { body: P.teal1, lit: P.teal2, spark: P.fire2 }],
  thunder: ['gun', 'energy', { body: P.dark2, lit: P.grey3, spark: P.sand5 }],
  spitter: ['gun', 'flamer'],
  crossbow: ['gun', 'crossbow'],
  laska_bow: ['gun', 'bow', { body: P.bone, wood: P.brown2, feather: P.red1 }],
  condor_claw: ['gun', 'bow', { body: P.brown3, feather: P.grey6 }],
  banger: ['nade', 'can', { body: P.grey4, band: P.sand5 }],
  soaker: ['nade', 'extinguisher'],
  saltnade: ['nade', 'ball', { body: P.grey5, lit: P.bone }],
  nailbomb: ['nade', 'can', { body: P.grey3, band: P.rust1, spikes: true }],
  duster: ['armor', 'coat', { main: P.grey4, dark: P.grey2 }],
  waterman: ['armor', 'coat', { main: P.teal1, dark: P.teal0, hood: true }],
  plated_jacket: ['armor', 'plates', { main: P.brown3, dark: P.brown1, plate: P.grey3 }],
  reaper_shell: ['armor', 'shell', { main: P.brown3, dark: P.brown0, plate: P.rust1 }],
  raider_rig: ['armor', 'plates', { main: P.dark1, dark: P.dark0, plate: P.red1 }],
  nut_mail: ['armor', 'mail', { main: P.grey2, dark: P.grey1, plate: P.grey5 }],
  bark: ['armor', 'shell', { main: P.brown2, dark: P.brown0, plate: P.olive1 }],
  salt_crust: ['armor', 'crust', { main: P.grey5, dark: P.grey3 }],
  shore_plate: ['armor', 'cuirass', { main: P.teal0, dark: P.dark1, plate: P.grey4 }],
  dew_cuirass: ['armor', 'cuirass', { main: P.grey5, dark: P.grey3, plate: P.bone, filter: P.teal1 }],
  snake_scale: ['armor', 'shell', { main: P.olive1, dark: P.olive0, plate: P.olive2, scales: P.sand4 }],
  wax_cloak: ['armor', 'coat', { main: P.dark1, dark: P.dark0, hood: true, belt: P.red1 }],
};

const FAMILIES = { gun: GUN, blade: BLADE, nade: NADE, armor: ARMOR };

export function armsIcon(id) {
  const cv = canvas(32, 32);
  const [family, shape, spec = {}] = ARMS_ICONS[id];
  FAMILIES[family][shape](cv.ctx, spec);
  return cv;
}
