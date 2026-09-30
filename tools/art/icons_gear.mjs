// 32x32 inventory icons for the arena gear: guns, blades, grenades, ammo, armor, stims.
import { canvas, line, circle, ellipse, poly, px } from './draw.mjs';
import { P } from './palette.mjs';

/** A barrel from (x0,y0) to (x1,y1), two pixels thick with a lit top edge. */
function barrel(ctx, x0, y0, x1, y1, dark = P.dark1, lit = P.grey3) {
  line(ctx, x0, y0, x1, y1, dark);
  line(ctx, x0, y0 + 1, x1, y1 + 1, lit);
}

function gun(ctx, kind) {
  if (kind === 'nailgun') {
    poly(ctx, [[6, 12], [24, 9], [26, 15], [8, 18]], P.fire0);
    poly(ctx, [[8, 13], [22, 11], [23, 14], [9, 16]], P.fire1);
    poly(ctx, [[9, 17], [14, 16], [16, 27], [11, 28]], P.dark1);
    ctx.fillStyle = P.grey4;
    ctx.fillRect(24, 10, 4, 4);
    for (let k = 0; k < 3; k++) line(ctx, 12 + k * 4, 19, 12 + k * 4, 21, P.grey5);
  } else if (kind === 'shotgun') {
    barrel(ctx, 4, 20, 29, 9);
    barrel(ctx, 5, 22, 29, 11, P.dark0, P.grey2);
    poly(ctx, [[2, 23], [10, 19], [12, 24], [3, 28]], P.brown3);
    line(ctx, 3, 24, 10, 21, P.brown4);
  } else if (kind === 'rattler') {
    barrel(ctx, 5, 19, 29, 10);
    poly(ctx, [[9, 16], [20, 12], [22, 17], [11, 21]], P.grey1);
    poly(ctx, [[14, 19], [18, 18], [20, 28], [16, 29]], P.olive1); // magazine
    poly(ctx, [[3, 20], [9, 18], [10, 22], [4, 25]], P.dark2);
    for (let k = 0; k < 3; k++) px(ctx, 25 + k, 8 - k, P.fire2);
  } else if (kind === 'longsight') {
    barrel(ctx, 2, 23, 30, 9);
    poly(ctx, [[2, 23], [10, 19], [12, 24], [3, 28]], P.brown2);
    ellipse(ctx, 17, 13, 5, 2.2, P.dark0); // scope
    ellipse(ctx, 17, 12.5, 4, 1.4, P.grey2);
    circle(ctx, 22, 11, 2, P.water1);
  } else if (kind === 'sparker') {
    poly(ctx, [[6, 14], [22, 11], [24, 18], [8, 21]], P.teal1);
    poly(ctx, [[8, 15], [20, 13], [21, 16], [9, 18]], P.teal2);
    poly(ctx, [[10, 20], [15, 19], [16, 28], [11, 28]], P.dark1);
    ctx.fillStyle = P.grey4;
    ctx.fillRect(23, 12, 3, 5);
    line(ctx, 26, 13, 29, 9, P.water2);
    line(ctx, 29, 9, 27, 7, P.water2);
    line(ctx, 26, 16, 30, 17, P.water1);
  }
}

function blade(ctx, kind) {
  if (kind === 'machete') {
    poly(ctx, [[8, 24], [24, 5], [28, 5], [27, 9], [11, 27]], P.grey5);
    line(ctx, 10, 24, 25, 7, P.grey6);
    poly(ctx, [[4, 30], [8, 24], [11, 27], [6, 31]], P.brown2);
  } else if (kind === 'sledge') {
    line(ctx, 6, 28, 20, 10, P.brown3);
    line(ctx, 7, 28, 21, 10, P.brown2);
    poly(ctx, [[14, 8], [22, 2], [28, 9], [20, 15]], P.grey2);
    poly(ctx, [[20, 15], [28, 9], [29, 12], [21, 18]], P.grey1);
    line(ctx, 15, 8, 22, 3, P.grey4);
  } else if (kind === 'spear') {
    line(ctx, 3, 29, 24, 8, P.rust1);
    line(ctx, 4, 29, 25, 8, P.rust2);
    poly(ctx, [[23, 6], [30, 2], [26, 9]], P.grey5);
    for (const t of [10, 14]) line(ctx, t - 2, 29 - t + 1, t + 1, 29 - t - 2, P.brown3); // wrapping
  } else if (kind === 'knuckles') {
    for (let k = 0; k < 4; k++) {
      circle(ctx, 9 + k * 5, 14, 3, P.grey3);
      circle(ctx, 9 + k * 5, 14, 1.3, P.dark0);
    }
    poly(ctx, [[6, 17], [27, 17], [25, 24], [8, 24]], P.grey2);
    line(ctx, 7, 18, 26, 18, P.grey4);
  }
}

function pack(ctx, kind) {
  if (kind === 'tincan') {
    ellipse(ctx, 16, 10, 8, 3, P.grey5);
    poly(ctx, [[8, 10], [24, 10], [24, 25], [8, 25]], P.grey3);
    ellipse(ctx, 16, 25, 8, 3, P.grey2);
    line(ctx, 9, 15, 23, 15, P.rust1);
    line(ctx, 9, 20, 23, 20, P.rust1);
    line(ctx, 17, 8, 22, 3, P.bone);
    circle(ctx, 23, 3, 1.6, P.fire1);
  } else if (kind === 'nails') {
    for (let k = 0; k < 5; k++) {
      const x = 7 + k * 4;
      line(ctx, x, 9 + (k % 2), x + 3, 25, P.grey4);
      ctx.fillStyle = P.grey5;
      ctx.fillRect(x - 1, 8 + (k % 2), 3, 2);
    }
  } else if (kind === 'shells') {
    for (let k = 0; k < 3; k++) {
      const x = 7 + k * 7;
      ctx.fillStyle = P.red1;
      ctx.fillRect(x, 9, 5, 13);
      ctx.fillStyle = P.fire1;
      ctx.fillRect(x, 21, 5, 5);
      line(ctx, x + 1, 10, x + 1, 20, P.red2);
    }
  } else if (kind === 'cells') {
    for (let k = 0; k < 2; k++) {
      const x = 7 + k * 10;
      poly(ctx, [[x, 8], [x + 8, 8], [x + 8, 27], [x, 27]], P.teal0);
      poly(ctx, [[x + 1, 9], [x + 7, 9], [x + 7, 17], [x + 1, 17]], P.water1);
      ctx.fillStyle = P.grey4;
      ctx.fillRect(x + 3, 5, 3, 3);
    }
  }
}

function armor(ctx, kind) {
  const torso = (main, dark) => {
    poly(ctx, [[8, 6], [24, 6], [27, 12], [25, 29], [7, 29], [5, 12]], main);
    poly(ctx, [[13, 6], [19, 6], [16, 11]], P.dark0); // collar
    line(ctx, 16, 11, 16, 28, dark);
  };
  if (kind === 'jacket') {
    torso(P.brown3, P.brown1);
    line(ctx, 10, 14, 12, 26, P.brown4);
    for (let y = 14; y < 27; y += 4) px(ctx, 17, y, P.grey5);
  } else if (kind === 'tirevest') {
    torso(P.dark2, P.dark0);
    for (let y = 10; y < 28; y += 4) line(ctx, 7, y, 25, y, P.grey1);
    for (let x = 9; x < 25; x += 5) line(ctx, x, 8, x, 28, P.dark0);
  } else if (kind === 'vest') {
    torso(P.olive1, P.olive0);
    poly(ctx, [[9, 13], [15, 13], [15, 21], [9, 21]], P.olive2);
    poly(ctx, [[17, 13], [23, 13], [23, 21], [17, 21]], P.olive2);
    line(ctx, 7, 24, 25, 24, P.dark1);
  } else if (kind === 'tinplate') {
    torso(P.grey3, P.grey1);
    for (const [x, y] of [[9, 10], [22, 10], [9, 20], [22, 20], [12, 27], [20, 27]]) px(ctx, x, y, P.grey6);
    poly(ctx, [[3, 8], [8, 6], [9, 14], [4, 15]], P.grey2); // pauldrons
    poly(ctx, [[24, 6], [29, 8], [28, 15], [23, 14]], P.grey2);
    line(ctx, 8, 16, 24, 16, P.rust1);
  } else if (kind === 'exo') {
    line(ctx, 10, 4, 10, 30, P.fire0);
    line(ctx, 22, 4, 22, 30, P.fire0);
    for (let y = 7; y < 29; y += 5) line(ctx, 9, y, 23, y, P.grey2);
    circle(ctx, 10, 17, 2.5, P.grey4);
    circle(ctx, 22, 17, 2.5, P.grey4);
    poly(ctx, [[13, 9], [19, 9], [19, 15], [13, 15]], P.dark1);
    px(ctx, 16, 12, P.fire2);
  }
}

function stim(ctx, kind) {
  if (kind === 'resin') {
    line(ctx, 6, 26, 22, 10, P.grey5);
    line(ctx, 7, 27, 23, 11, P.grey4);
    poly(ctx, [[10, 20], [18, 12], [22, 16], [14, 24]], P.fire1); // amber resin
    line(ctx, 22, 10, 28, 4, P.grey6); // needle
    line(ctx, 4, 24, 9, 29, P.dark1);
  } else if (kind === 'rush') {
    poly(ctx, [[7, 12], [25, 12], [23, 27], [9, 27]], P.bone);
    ellipse(ctx, 16, 12, 9, 3, P.grey5);
    ellipse(ctx, 16, 19, 5, 4, P.red1);
    line(ctx, 14, 16, 18, 22, P.fire2);
  } else if (kind === 'hardbrew') {
    ctx.fillStyle = P.brown2;
    ctx.fillRect(13, 4, 6, 5);
    ellipse(ctx, 16, 19, 9, 10, P.grey2);
    ellipse(ctx, 16, 21, 7, 7, P.olive0);
    ellipse(ctx, 13, 16, 2, 3, P.grey4);
    poly(ctx, [[12, 18], [20, 18], [20, 24], [12, 24]], P.sand3);
  }
}

const GUNS = ['nailgun', 'shotgun', 'rattler', 'longsight', 'sparker'];
const BLADES = ['machete', 'sledge', 'spear', 'knuckles'];
const PACKS = ['tincan', 'nails', 'shells', 'cells'];
const ARMOR = ['jacket', 'tirevest', 'vest', 'tinplate', 'exo'];
const STIMS = ['resin', 'rush', 'hardbrew'];
export const GEAR_ICONS = [...GUNS, ...BLADES, ...PACKS, ...ARMOR, ...STIMS];

export function gearIcon(kind) {
  const cv = canvas(32, 32);
  const { ctx } = cv;
  if (GUNS.includes(kind)) gun(ctx, kind);
  else if (BLADES.includes(kind)) blade(ctx, kind);
  else if (PACKS.includes(kind)) pack(ctx, kind);
  else if (ARMOR.includes(kind)) armor(ctx, kind);
  else if (STIMS.includes(kind)) stim(ctx, kind);
  return cv;
}
