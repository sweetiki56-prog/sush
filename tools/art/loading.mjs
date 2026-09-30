// Backdrops of the loading screens, western and after the end of the world: a desert dusk with the three
// pylons, a notice nailed to weathered boards, the corner of the survey chart on a table with a compass.
// Text and the progress are drawn by the game over them (src/scenes/LoadingScene.ts). 1280×720.
import { canvas, makeNoise, rng } from './draw.mjs';

const W = 1280;
const H = 720;

function grain(ctx, amount, seed) {
  const img = ctx.getImageData(0, 0, W, H);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const k = (r() - 0.5) * amount;
    img.data[i] += k;
    img.data[i + 1] += k;
    img.data[i + 2] += k;
  }
  ctx.putImageData(img, 0, 0);
}

function vignette(ctx, strength = 0.75) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** A lattice pylon, standing with its feet on (x, y), `h` tall. */
function pylon(ctx, x, y, h, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  const top = y - h;
  const w0 = h * 0.22;
  const w1 = h * 0.05;
  const L = (a, b, c, d) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  };
  L(x - w0, y, x - w1, top);
  L(x + w0, y, x + w1, top);
  for (let k = 0; k < 6; k++) {
    const t0 = k / 6;
    const t1 = (k + 1) / 6;
    const ya = y - h * t0;
    const yb = y - h * t1;
    const wa = w0 + (w1 - w0) * t0;
    const wb = w0 + (w1 - w0) * t1;
    ctx.lineWidth = 1.6;
    L(x - wa, ya, x + wb, yb);
    L(x + wa, ya, x - wb, yb);
    L(x - wb, yb, x + wb, yb);
  }
  ctx.lineWidth = 3;
  for (const [yy, span] of [[top + h * 0.08, h * 0.32], [top + h * 0.22, h * 0.24]]) L(x - span, yy, x + span, yy);
}

/** A sagging wire between two points. */
function wire(ctx, a, b, sag, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(...a);
  ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag, ...b);
  ctx.stroke();
}

function ridge(ctx, base, amp, freq, seed, color, jag = 0) {
  const n = makeNoise(seed);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) {
    let y = base - n(x * freq, seed) * amp;
    if (jag) y -= Math.max(0, n(x * freq * 3, seed + 5) - 0.55) * jag;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

/** Dusk over the desert: a striped sun, mesas, the three pylons, a wreck and a lone traveller. */
export function loadingDusk() {
  const cv = canvas(W, H);
  const { ctx } = cv;
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.65);
  sky.addColorStop(0, '#1d1230');
  sky.addColorStop(0.45, '#6b2a3a');
  sky.addColorStop(0.75, '#d0602a');
  sky.addColorStop(1, '#f2b25c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // stars fading into the dusk
  const r = rng(8);
  for (let i = 0; i < 90; i++) {
    const y = r() * H * 0.35;
    ctx.fillStyle = `rgba(255,240,220,${0.6 * (1 - y / (H * 0.35))})`;
    ctx.fillRect(r() * W, y, 1.5, 1.5);
  }
  // the sun, cut by bands of sky near the horizon
  const sx = 820;
  const sy = 440;
  const sr = 170;
  const sun = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
  sun.addColorStop(0, '#fff0a0');
  sun.addColorStop(0.6, '#ffae4a');
  sun.addColorStop(1, '#ff6a2a');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < 7; k++) {
    const y = sy + 20 + k * 20;
    ctx.fillStyle = k % 2 ? '#e3874a' : '#d97040';
    ctx.fillRect(sx - sr, y, sr * 2, 4 + k * 1.4);
  }
  // a glow of dust over the horizon
  const haze = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.7);
  haze.addColorStop(0, 'rgba(255,170,90,0)');
  haze.addColorStop(1, 'rgba(255,170,90,0.45)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, H * 0.45, W, H * 0.25);
  // mesas far, dunes mid, the ground near
  ridge(ctx, 470, 120, 0.004, 3, 'rgba(110,50,70,0.85)', 160);
  ridge(ctx, 520, 60, 0.006, 9, '#4a2233');
  ridge(ctx, 585, 40, 0.01, 17, '#2a1420');
  ridge(ctx, 650, 25, 0.02, 23, '#140a10');
  // the three pylons with wires sagging between them, the last one fallen
  const ink = '#120810';
  pylon(ctx, 230, 600, 300, ink);
  pylon(ctx, 470, 560, 210, ink);
  ctx.save();
  ctx.translate(640, 548);
  ctx.rotate(0.55);
  pylon(ctx, 0, 0, 150, 'rgba(18,8,16,0.9)');
  ctx.restore();
  wire(ctx, [0, 330], [230 - 66, 324], 40, ink);
  wire(ctx, [230 + 66, 324], [470 - 46, 385], 50, ink);
  wire(ctx, [230 + 66, 340], [470 - 46, 400], 60, ink);
  wire(ctx, [470 + 46, 385], [700, 520], 70, ink);
  // a wrecked pickup, a dead tree, a cactus
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(960, 640);
  ctx.lineTo(975, 600);
  ctx.lineTo(1040, 596);
  ctx.lineTo(1060, 570);
  ctx.lineTo(1110, 570);
  ctx.lineTo(1125, 600);
  ctx.lineTo(1170, 606);
  ctx.lineTo(1180, 640);
  ctx.closePath();
  ctx.fill();
  for (const wx of [1000, 1140]) {
    ctx.beginPath();
    ctx.arc(wx, 640, 16, Math.PI, 0);
    ctx.fill();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(90, 690);
  ctx.lineTo(95, 560);
  ctx.moveTo(94, 610);
  ctx.lineTo(55, 570);
  ctx.moveTo(95, 590);
  ctx.lineTo(135, 540);
  ctx.moveTo(120, 560);
  ctx.lineTo(145, 555);
  ctx.stroke();
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(1230, 700);
  ctx.lineTo(1230, 590);
  ctx.moveTo(1230, 640);
  ctx.lineTo(1205, 640);
  ctx.lineTo(1205, 612);
  ctx.moveTo(1230, 625);
  ctx.lineTo(1252, 625);
  ctx.lineTo(1252, 598);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // a traveller on the ridge: long coat, a rifle over the shoulder, a staff
  const tx = 700;
  const ty = 586;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(tx - 9, ty);
  ctx.lineTo(tx - 6, ty - 40);
  ctx.lineTo(tx + 6, ty - 40);
  ctx.lineTo(tx + 10, ty);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(tx, ty - 47, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(tx - 11, ty - 55, 22, 3); // hat brim
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx - 12, ty - 20);
  ctx.lineTo(tx + 12, ty - 52);
  ctx.moveTo(tx + 14, ty + 2);
  ctx.lineTo(tx + 18, ty - 50);
  ctx.stroke();
  grain(ctx, 14, 5);
  vignette(ctx, 0.7);
  return cv;
}

/** Weathered boards with a notice nailed up: the title goes on the notice, bullet holes around it. */
export function loadingPoster() {
  const cv = canvas(W, H);
  const { ctx } = cv;
  const n = makeNoise(41);
  const r = rng(41);
  const PLANK = 90;
  for (let i = 0; i < H / PLANK + 1; i++) {
    const y0 = i * PLANK;
    const base = [96 + r() * 18, 62 + r() * 12, 38 + r() * 8];
    const img = ctx.createImageData(W, PLANK);
    for (let y = 0; y < PLANK; y++)
      for (let x = 0; x < W; x++) {
        const grainV = (n(x * 0.004 + i * 10, (y0 + y) * 0.09) - 0.5) * 40 + (n(x * 0.05, (y0 + y) * 0.6) - 0.5) * 16;
        const edge = y < 3 || y > PLANK - 4 ? -45 : 0;
        const k = (y * W + x) * 4;
        img.data[k] = base[0] + grainV + edge;
        img.data[k + 1] = base[1] + grainV * 0.8 + edge;
        img.data[k + 2] = base[2] + grainV * 0.6 + edge;
        img.data[k + 3] = 255;
      }
    ctx.putImageData(img, 0, y0);
    // knots and nails
    for (let k = 0; k < 2; k++) {
      ctx.fillStyle = 'rgba(40,22,12,0.5)';
      ctx.beginPath();
      ctx.ellipse(r() * W, y0 + PLANK / 2, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const nx of [40, W - 40]) {
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(nx, y0 + PLANK / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // the notice: paper, torn edges, stains, printed rules and stars; the title is printed by the game
  const px = 290;
  const py = 70;
  const pw = 700;
  const ph = 520;
  ctx.save();
  ctx.translate(W / 2, H / 2 - 20);
  ctx.rotate(-0.018);
  ctx.translate(-W / 2, -(H / 2 - 20));
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(px + 10, py + 14, pw, ph);
  ctx.beginPath();
  const tear = (x, y) => [x + (r() - 0.5) * 6, y + (r() - 0.5) * 6];
  ctx.moveTo(...tear(px, py));
  for (let x = px; x <= px + pw; x += 18) ctx.lineTo(...tear(x, py));
  for (let y = py; y <= py + ph; y += 18) ctx.lineTo(...tear(px + pw, y));
  for (let x = px + pw; x >= px; x -= 18) ctx.lineTo(...tear(x, py + ph));
  for (let y = py + ph; y >= py; y -= 18) ctx.lineTo(...tear(px, y));
  ctx.closePath();
  const paper = ctx.createLinearGradient(px, py, px + pw, py + ph);
  paper.addColorStop(0, '#e8d3a4');
  paper.addColorStop(1, '#cfb07a');
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.clip();
  const img = ctx.getImageData(px, py, pw, ph);
  for (let y = 0; y < ph; y++)
    for (let x = 0; x < pw; x++) {
      const k = (y * pw + x) * 4;
      const s = (n(x * 0.01 + 50, y * 0.01) - 0.5) * 50 + (n(x * 0.2, y * 0.2) - 0.5) * 10;
      img.data[k] += s;
      img.data[k + 1] += s * 0.9;
      img.data[k + 2] += s * 0.7;
    }
  ctx.putImageData(img, px, py);
  ctx.strokeStyle = 'rgba(52,34,20,0.85)';
  ctx.lineWidth = 4;
  ctx.strokeRect(px + 26, py + 26, pw - 52, ph - 52);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 36, py + 36, pw - 72, ph - 72);
  for (const y of [py + 150, py + ph - 150]) {
    ctx.beginPath();
    ctx.moveTo(px + 80, y);
    ctx.lineTo(px + pw - 80, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(52,34,20,0.85)';
  for (const [sx, sy] of [[px + 70, py + 70], [px + pw - 70, py + 70], [px + 70, py + ph - 70], [px + pw - 70, py + ph - 70]]) star(ctx, sx, sy, 14);
  ctx.restore();
  // nails through the notice and bullet holes about it
  for (const [nx, ny] of [[px + 14, py + 16], [px + pw - 12, py + 10], [px + 12, py + ph - 12], [px + pw - 16, py + ph - 6]]) {
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.arc(nx, ny, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(nx - 2, ny - 2, 2, 2);
  }
  for (const [bx, by] of [[1030, 210], [1090, 480], [210, 380], [860, 560], [440, 610]]) {
    ctx.fillStyle = '#1a0e08';
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,160,110,0.5)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const a = r() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * 8, by + Math.sin(a) * 8);
      ctx.lineTo(bx + Math.cos(a) * (12 + r() * 8), by + Math.sin(a) * (12 + r() * 8));
      ctx.stroke();
    }
  }
  grain(ctx, 10, 9);
  vignette(ctx, 0.8);
  return cv;
}

/** The survey chart's corner on a dark table: a brass compass (its needle is the game's), a lamp's glow. */
export function loadingChart(chart) {
  const cv = canvas(W, H);
  const { ctx } = cv;
  const n = makeNoise(63);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const g = (n(x * 0.003, y * 0.05) - 0.5) * 30 + (n(x * 0.04, y * 0.5) - 0.5) * 10;
      const k = (y * W + x) * 4;
      img.data[k] = 58 + g;
      img.data[k + 1] = 36 + g * 0.8;
      img.data[k + 2] = 22 + g * 0.6;
      img.data[k + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  // the chart, a quarter of it, turned a little on the table
  ctx.save();
  ctx.translate(120, 60);
  ctx.rotate(-0.06);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(14, 18, 900, 620);
  // the middle of the country: the dry river, the Dead fields
  const low = Math.min(chart.width, 2560); // Низовье: the first 64 cells of a chart that grew east
  ctx.drawImage(chart, low * 0.3, chart.height * 0.3, low * 0.5, chart.height * 0.52, 0, 0, 900, 620);
  ctx.restore();
  // a pencil and a coffee ring
  ctx.save();
  ctx.translate(960, 560);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#c89a3a';
  ctx.fillRect(0, 0, 200, 12);
  ctx.fillStyle = '#e8c890';
  ctx.beginPath();
  ctx.moveTo(200, 0);
  ctx.lineTo(228, 6);
  ctx.lineTo(200, 12);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.moveTo(220, 4);
  ctx.lineTo(228, 6);
  ctx.lineTo(220, 8);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,20,8,0.35)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(380, 520, 60, 0.4, Math.PI * 1.9);
  ctx.stroke();
  // the compass case (the needle is drawn by the game, it turns as things load)
  const cx = 1010;
  const cy = 300;
  const rad = 150;
  const brass = ctx.createRadialGradient(cx - 40, cy - 50, 20, cx, cy, rad + 20);
  brass.addColorStop(0, '#f0d38a');
  brass.addColorStop(0.6, '#b08a3a');
  brass.addColorStop(1, '#5a4018');
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.arc(cx + 12, cy + 16, rad + 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.arc(cx, cy, rad + 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#efe0bc';
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(52,34,20,0.8)';
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2;
    const long = k % 9 === 0;
    ctx.lineWidth = long ? 2.5 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rad * 0.92, cy + Math.sin(a) * rad * 0.92);
    ctx.lineTo(cx + Math.cos(a) * rad * (long ? 0.8 : 0.87), cy + Math.sin(a) * rad * (long ? 0.8 : 0.87));
    ctx.stroke();
  }
  // a faint rose printed on the card under the needle
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 - Math.PI / 2;
    const len = rad * (k % 2 ? 0.34 : 0.56);
    const w = rad * 0.07;
    ctx.fillStyle = k % 2 ? 'rgba(52,34,20,0.18)' : 'rgba(52,34,20,0.28)';
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a - Math.PI / 2) * w, cy + Math.sin(a - Math.PI / 2) * w);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.lineTo(cx + Math.cos(a + Math.PI / 2) * w, cy + Math.sin(a + Math.PI / 2) * w);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(52,34,20,0.9)';
  ctx.font = 'bold 30px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [t, a] of [['С', -Math.PI / 2], ['В', 0], ['Ю', Math.PI / 2], ['З', Math.PI]]) ctx.fillText(t, cx + Math.cos(a) * rad * 0.66, cy + Math.sin(a) * rad * 0.66);
  // a lamp's warm light from the upper right
  const lamp = ctx.createRadialGradient(1150, 60, 20, 1150, 60, 900);
  lamp.addColorStop(0, 'rgba(255,190,110,0.28)');
  lamp.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, 10, 13);
  vignette(ctx, 0.85);
  return cv;
}

function star(ctx, x, y, s) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k * Math.PI) / 5 - Math.PI / 2;
    const rr = k % 2 ? s * 0.45 : s;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}
