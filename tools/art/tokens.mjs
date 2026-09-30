// 24x24 tokens for the world map: parties and places, drawn as brass badges so they read on the chart.
import { canvas, line, circle, ellipse, poly, px } from './draw.mjs';
import { P } from './palette.mjs';

function badge(ctx, rim, fill) {
  circle(ctx, 12, 12, 10.5, rim);
  circle(ctx, 12, 12, 8.5, fill);
}

const DRAW = {
  // our party: a bright arrow on a red rim
  player(ctx) {
    badge(ctx, P.red1, P.bone);
    poly(ctx, [[12, 5], [17, 17], [12, 14], [7, 17]], P.red2);
  },
  caravan(ctx) {
    badge(ctx, P.brown2, P.sand4);
    poly(ctx, [[6, 10], [17, 10], [17, 16], [6, 16]], P.brown3);
    ellipse(ctx, 11.5, 10, 6, 3, P.bone);
    circle(ctx, 8, 17, 2, P.dark1);
    circle(ctx, 15, 17, 2, P.dark1);
    line(ctx, 17, 13, 20, 12, P.dark1);
  },
  bandits(ctx) {
    badge(ctx, P.dark1, P.red1);
    circle(ctx, 12, 11, 5, P.bone);
    poly(ctx, [[9, 14], [15, 14], [14, 18], [10, 18]], P.bone);
    circle(ctx, 10, 11, 1.4, P.dark0);
    circle(ctx, 14, 11, 1.4, P.dark0);
    px(ctx, 12, 16, P.dark0);
  },
  trust(ctx) {
    badge(ctx, P.grey2, P.grey5);
    circle(ctx, 12, 12, 5, P.brown3);
    poly(ctx, [[9.5, 13], [14.5, 13], [12, 8]], P.sand4);
    circle(ctx, 12, 13.5, 2, P.sand4);
  },
  wanderers(ctx) {
    badge(ctx, P.olive0, P.olive2);
    ellipse(ctx, 12, 14, 5, 4, P.brown3);
    line(ctx, 12, 10, 12, 6, P.brown1);
    line(ctx, 10, 7, 14, 7, P.brown1);
  },
  dry(ctx) {
    badge(ctx, P.grey1, P.grey3);
    line(ctx, 12, 18, 12, 7, P.dark1);
    line(ctx, 12, 12, 8, 8, P.dark1);
    line(ctx, 12, 10, 16, 6, P.dark1);
    line(ctx, 12, 14, 16, 12, P.dark1);
  },
  beast(ctx) {
    badge(ctx, P.brown0, P.sand3);
    ellipse(ctx, 12, 15, 4, 3, P.dark1); // a paw print
    for (const [x, y] of [[7.5, 10], [10.5, 8], [13.5, 8], [16.5, 10]]) ellipse(ctx, x, y, 1.6, 1.8, P.dark1);
  },
  town(ctx) {
    circle(ctx, 12, 12, 10, P.dark1);
    circle(ctx, 12, 12, 8.5, P.sand5);
    poly(ctx, [[6, 12], [12, 6], [18, 12]], P.rust2);
    poly(ctx, [[8, 12], [16, 12], [16, 18], [8, 18]], P.brown3);
    poly(ctx, [[11, 14], [13, 14], [13, 18], [11, 18]], P.dark1);
  },
  town_closed(ctx) {
    circle(ctx, 12, 12, 9, P.dark1);
    circle(ctx, 12, 12, 7.5, P.sand2);
    poly(ctx, [[7, 12], [12, 7], [17, 12]], P.grey3);
    poly(ctx, [[9, 12], [15, 12], [15, 17], [9, 17]], P.grey3);
  },
  // a spot someone told you of: a red cross inked on the chart over a flat stone
  spot(ctx) {
    ellipse(ctx, 12, 15, 8, 4.5, P.dark1);
    ellipse(ctx, 12, 14, 7, 3.5, P.sand2);
    line(ctx, 7, 6, 17, 16, P.red1);
    line(ctx, 17, 6, 7, 16, P.red1);
    line(ctx, 8, 6, 17, 15, P.red2);
    line(ctx, 16, 6, 7, 15, P.red2);
  },
  exit(ctx) {
    circle(ctx, 12, 12, 9, P.dark1);
    circle(ctx, 12, 12, 7.5, P.sand4);
    poly(ctx, [[8, 10], [13, 10], [13, 7], [18, 12], [13, 17], [13, 14], [8, 14]], P.dark1);
  },
};

export const TOKENS = Object.keys(DRAW);

export function token(kind) {
  const cv = canvas(24, 24);
  DRAW[kind](cv.ctx);
  return cv;
}
