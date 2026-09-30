// 32x32 inventory icons.
import { canvas, line, circle, ellipse, poly, px } from './draw.mjs';
import { P } from './palette.mjs';

export function icon(kind) {
  const cv = canvas(32, 32);
  const { ctx } = cv;
  if (kind === 'key') {
    circle(ctx, 9, 16, 6, P.sand3);
    circle(ctx, 9, 16, 2.5, P.dark0);
    ctx.fillStyle = P.sand3;
    ctx.fillRect(14, 15, 14, 3);
    ctx.fillRect(22, 18, 2, 4);
    ctx.fillRect(26, 18, 2, 3);
    line(ctx, 14, 15, 27, 15, P.sand5);
  } else if (kind === 'crowbar') {
    line(ctx, 6, 27, 25, 6, P.red1);
    line(ctx, 7, 27, 26, 6, P.red2);
    line(ctx, 25, 6, 28, 8, P.red1);
    line(ctx, 6, 27, 4, 24, P.grey4);
    line(ctx, 4, 24, 5, 22, P.grey4);
  } else if (kind === 'valve') {
    circle(ctx, 16, 16, 11, P.sand2);
    circle(ctx, 16, 16, 8, P.dark0);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) line(ctx, 16, 16, 16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9, P.sand3);
    circle(ctx, 16, 16, 3, P.brown4);
    px(ctx, 11, 9, P.sand5);
  } else if (kind === 'manual') {
    poly(ctx, [[6, 5], [24, 4], [26, 27], [8, 28]], P.teal1);
    poly(ctx, [[8, 7], [22, 6], [24, 25], [10, 26]], P.teal2);
    for (let y = 10; y < 22; y += 3) line(ctx, 11, y, 20, y - 1, P.teal0);
    ctx.fillStyle = P.bone;
    ctx.fillRect(24, 6, 2, 21);
  } else if (kind === 'note') {
    poly(ctx, [[7, 6], [25, 8], [23, 27], [6, 25]], P.bone);
    for (let y = 11; y < 24; y += 3) line(ctx, 9, y, 21, y + 1, P.grey3);
    circle(ctx, 20, 22, 2, P.brown2);
  } else if (kind === 'canteen') {
    ellipse(ctx, 16, 18, 10, 11, P.olive1);
    ellipse(ctx, 14, 16, 7, 8, P.olive2);
    ctx.fillStyle = P.grey3;
    ctx.fillRect(14, 4, 5, 5);
    line(ctx, 8, 10, 24, 10, P.brown2);
  } else if (kind === 'caps') {
    // капли: brass Trust tokens stamped with a drop
    for (const [x, y] of [[11, 20], [21, 21], [16, 12]]) {
      circle(ctx, x, y, 6.5, P.brown3);
      circle(ctx, x - 0.4, y - 0.4, 5.6, P.sand3);
      circle(ctx, x, y + 1.2, 1.9, P.brown2);
      poly(ctx, [[x - 1.7, y + 0.8], [x + 1.7, y + 0.8], [x, y - 3]], P.brown2);
      px(ctx, x - 3, y - 3, P.sand5);
    }
  } else if (kind === 'tube') {
    // the sealed brass tube with the Mandate: red wax on one end, the water authority's ring stamped mid-way
    poly(ctx, [[4, 23], [22, 5], [27, 10], [9, 28]], P.brown3);
    poly(ctx, [[5, 23], [22, 6], [25, 9], [8, 26]], P.sand3);
    line(ctx, 6, 22, 22, 6, P.sand5);
    circle(ctx, 6.5, 25.5, 3.4, P.brown2);
    circle(ctx, 24.5, 7.5, 3.6, P.red1);
    circle(ctx, 24, 7, 1.6, P.red2);
    circle(ctx, 15.5, 16.5, 2.4, P.brown2);
    circle(ctx, 15.5, 16.5, 1.2, P.sand3);
  } else if (kind === 'letter') {
    // Marta's letter: a folded sheet with a blob of wax
    poly(ctx, [[5, 9], [27, 7], [28, 24], [6, 26]], P.bone);
    line(ctx, 5, 9, 17, 18, P.grey4);
    line(ctx, 27, 7, 17, 18, P.grey4);
    line(ctx, 6, 26, 28, 24, P.grey5);
    circle(ctx, 17, 18, 3.2, P.red1);
    circle(ctx, 16.5, 17.5, 1.4, P.red2);
  } else if (kind === 'pass') {
    // the Trust's pass: a tin tag on a string, stamped with a drop and a number
    line(ctx, 16, 2, 16, 8, P.brown2);
    poly(ctx, [[8, 8], [24, 8], [26, 28], [6, 28]], P.grey3);
    poly(ctx, [[9, 9], [23, 9], [24, 27], [8, 27]], P.grey5);
    circle(ctx, 16, 18, 3.4, P.grey2);
    poly(ctx, [[12.8, 17.2], [19.2, 17.2], [16, 11.5]], P.grey2);
    for (let x = 10; x < 22; x += 3) px(ctx, x, 24, P.grey1);
    px(ctx, 10, 11, P.grey6);
  } else if (kind === 'bandage') {
    poly(ctx, [[5, 20], [20, 7], [27, 13], [12, 26]], P.bone);
    poly(ctx, [[8, 20], [20, 10], [24, 13], [12, 23]], P.grey6);
    for (let k = 0; k < 4; k++) line(ctx, 9 + k * 4, 18 - k * 3, 12 + k * 4, 21 - k * 3, P.grey5);
    ctx.fillStyle = P.red2;
    ctx.fillRect(14, 13, 4, 2);
    ctx.fillRect(15, 12, 2, 4);
  } else if (kind === 'ammo') {
    poly(ctx, [[5, 14], [22, 10], [27, 15], [10, 20]], P.olive2);
    poly(ctx, [[5, 14], [10, 20], [10, 27], [5, 21]], P.olive1);
    poly(ctx, [[10, 20], [27, 15], [27, 22], [10, 27]], P.olive0);
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = P.fire1;
      ctx.fillRect(9 + k * 4, 6 - k, 2, 7);
      ctx.fillStyle = P.brown4;
      ctx.fillRect(9 + k * 4, 5 - k, 2, 2);
    }
  } else if (kind === 'lizard') {
    ellipse(ctx, 16, 18, 9, 4, P.brown3);
    ellipse(ctx, 15, 17, 6, 2.5, P.brown4);
    circle(ctx, 25, 16, 3, P.brown3);
    line(ctx, 7, 19, 3, 23, P.brown2);
    for (const x of [11, 19]) {
      line(ctx, x, 21, x - 2, 25, P.brown2);
      line(ctx, x, 15, x - 2, 11, P.brown2);
    }
    line(ctx, 4, 28, 28, 6, P.grey3); // skewer
  } else if (kind === 'stinger') {
    ellipse(ctx, 12, 20, 6, 5, P.rust2);
    ellipse(ctx, 11, 19, 3, 2.5, P.rust3);
    for (let k = 0; k < 8; k++) circle(ctx, 16 + k * 1.4, 17 - k * 1.6, 2.6 - k * 0.25, k > 5 ? P.bone : P.rust1);
  } else if (kind === 'scrap') {
    poly(ctx, [[5, 22], [14, 16], [19, 24], [9, 28]], P.grey3);
    poly(ctx, [[14, 9], [24, 7], [26, 17], [17, 18]], P.rust2);
    circle(ctx, 22, 24, 4, P.grey4);
    circle(ctx, 22, 24, 1.5, P.dark0);
    line(ctx, 6, 8, 12, 15, P.grey5);
    line(ctx, 7, 8, 13, 15, P.grey4);
  } else if (kind === 'schematic') {
    poly(ctx, [[5, 6], [27, 5], [27, 26], [5, 27]], P.teal0);
    ctx.strokeStyle = P.water2;
    ctx.lineWidth = 1;
    ctx.strokeRect(9.5, 9.5, 8, 8);
    circle(ctx, 21, 19, 3.5, P.water1);
    circle(ctx, 21, 19, 2, P.teal0);
    line(ctx, 17, 13, 21, 16, P.water2);
    line(ctx, 9, 22, 16, 22, P.water1);
  } else if (kind === 'antidote') {
    ctx.fillStyle = P.grey5;
    ctx.fillRect(13, 5, 6, 5);
    ellipse(ctx, 16, 19, 8, 9, P.water1);
    ellipse(ctx, 16, 21, 6, 6, P.olive3);
    ellipse(ctx, 13, 16, 2, 3, P.water2);
    ctx.fillStyle = P.bone;
    ctx.fillRect(12, 19, 8, 4);
  } else if (kind === 'knife') {
    poly(ctx, [[6, 26], [21, 9], [25, 7], [23, 11], [9, 28]], P.grey5);
    line(ctx, 7, 26, 22, 10, P.grey6);
    line(ctx, 5, 24, 10, 29, P.dark1);
    poly(ctx, [[3, 30], [6, 26], [9, 28], [5, 31]], P.brown2);
  } else if (kind === 'firebomb') {
    ellipse(ctx, 16, 20, 9, 8, P.olive1);
    ellipse(ctx, 14, 18, 5, 4, P.olive3);
    ctx.fillStyle = P.grey3;
    ctx.fillRect(14, 7, 5, 6);
    line(ctx, 17, 7, 22, 3, P.bone);
    circle(ctx, 23, 3, 2, P.fire1);
    px(ctx, 24, 2, P.fire2);
  } else if (kind === 'rifle') {
    line(ctx, 3, 22, 29, 10, P.dark1);
    line(ctx, 3, 23, 29, 11, P.grey2);
    poly(ctx, [[3, 22], [11, 18], [13, 23], [4, 27]], P.brown3);
    poly(ctx, [[14, 17], [20, 14], [21, 17], [15, 20]], P.grey1);
    line(ctx, 16, 21, 15, 25, P.dark1);
  }
  return cv;
}

export const ICONS = ['key', 'crowbar', 'valve', 'manual', 'note', 'canteen', 'caps', 'bandage', 'ammo', 'lizard', 'stinger', 'scrap', 'schematic', 'antidote', 'knife', 'rifle', 'firebomb', 'tube', 'letter', 'pass'];
