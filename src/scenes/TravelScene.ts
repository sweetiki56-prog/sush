// The world map of Низовье: the chart on a dark table, the fog, the towns, our party and the others walking
// as little figures (as in the old campaign maps), the route ahead and the trail of steps behind, the light
// of the hour and cloud shadows drifting over. Clicks become travel intents; the room moves everyone and
// reports it (the clock runs only while the party is on the move).
import Phaser from 'phaser';
import { music } from '../audio/Music';
import { session } from '../session';
import type { NetClient, NetEvents } from '../net/NetClient';
import type { MapParty, ServerMsg } from '../core/room/protocol';
import { Travel, fitWorld, freshTravel, type TravelState } from '../core/travel/Travel';
import { GAME_H, GAME_W, HUD_H } from '../config';
import { C, button, glass, txt } from '../ui/theme';
import { onKey } from '../ui/keys';
import { TOUCH, pinchZoom } from '../ui/touch';
import { dirFromVector } from '../iso/IsoMath';
import type { GenMeta } from '../world/MapData';
import { cloudTexture, daylight, heroSheet, walkAnims } from '../world/travelArt';
import { loadingFor } from './LoadingScene';
import { settings } from '../core/Settings';
import { locationNameForDisplay, mapLabelForDisplay } from '../i18n/display';
import { uiText } from '../i18n/ui';
import { strengthForDisplay, travelInfoLines } from '../i18n/travel';

export const CELL = 20; // px per world cell on the chart (tools/art/worldmap.mjs)
const STRIP = 64; // cells per chart strip: the chart is cut into strips a phone can hold as textures (tools/gen-assets.mjs)
const strips = (width: number, english: boolean) => Array.from({ length: Math.ceil(width / STRIP) }, (_, i) => `worldmap_low${english ? '_en' : ''}_${i}`);
const MIN_ZOOM = 1; // never smaller than the chart: no empty edges
const MAX_ZOOM = 2.4;
const START_ZOOM = 1.4;
const FIGURE_SCALE = 0.5;
const TRAIL_MAX = 400;
const FOG_RES = 8; // fog texture pixels per cell
type TravelMsg = Extract<ServerMsg, { t: 'travel' }>;

/** A party on the chart: a walking figure and its badge above it. */
interface Figure {
  body: Phaser.GameObjects.Sprite;
  badge: Phaser.GameObjects.Image;
  sheet: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: number;
  seen: number; // ms since the last move report
  bob: number;
}

export class TravelScene extends Phaser.Scene {
  private net!: NetClient;
  private t!: TravelState;
  private world!: Phaser.GameObjects.Layer;
  private hudLayer!: Phaser.GameObjects.Layer;
  private me!: Figure;
  private fog!: Phaser.GameObjects.Image;
  private route!: Phaser.GameObjects.Graphics;
  private trail!: Phaser.GameObjects.Graphics;
  private tint!: Phaser.GameObjects.Rectangle;
  private clouds: Phaser.GameObjects.Image[] = [];
  private trailPts: { x: number; y: number }[] = [];
  private info!: Phaser.GameObjects.Text;
  private sneakBtn!: ReturnType<typeof button>;
  private figures = new Map<string, Figure>();
  private zoom = START_ZOOM;
  private unsub: (() => void)[] = [];
  private day = 1;
  private storms: [number, number, number, number][] = [];
  private stormKey = '';
  private stormLayer: Phaser.GameObjects.GameObject[] = [];
  private escort: TravelMsg['escort'] = null;

  constructor() {
    super('Travel');
  }

  create(): void {
    this.net = session().net!;
    const keys = strips(session().worldMap!.width, settings().language === 'en');
    if (!keys.every((k) => this.textures.exists(k))) {
      loadingFor(this, { style: 'chart', title: uiText('travel.chartTitle', settings().language), subtitle: uiText('travel.chartSubtitle', settings().language) });
      for (const k of keys) this.load.image(k, `assets/gen/${k}.png`);
      this.load.once('complete', () => this.scene.restart());
      this.load.start();
      return;
    }
    music.play('road');
    const grid = session().worldMap!;
    const W = grid.width * CELL;
    const H = grid.height * CELL;
    this.t = structuredClone(session().game.state.travel ?? freshTravel(grid, [14, 36]));
    fitWorld(this.t, grid);
    this.trailPts = [];
    this.figures.clear();
    this.clouds = [];
    this.world = this.add.layer();
    this.hudLayer = this.add.layer().setDepth(1000);

    // the chart lies on a dark table; a shadow under it
    const desk = this.add.graphics().setDepth(-2);
    desk.fillStyle(0x1a110a, 1).fillRect(-600, -600, W + 1200, H + 1200);
    desk.fillStyle(0x000000, 0.45).fillRect(10, 14, W, H);
    // the chart is drawn at twice the resolution (tools/art/worldmap.mjs ART): smooth, crisp when zoomed in
    this.world.add(desk);
    keys.forEach((k, i) => {
      this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const cells = Math.min(STRIP, grid.width - i * STRIP);
      this.world.add(this.add.image(i * STRIP * CELL, 0, k).setOrigin(0).setDepth(0).setDisplaySize(cells * CELL, H));
    });
    this.trail = this.add.graphics().setDepth(2);
    this.route = this.add.graphics().setDepth(3);
    this.world.add([this.trail, this.route]);
    this.places();
    this.me = this.figure(heroSheet(session().game), 'token_player', this.t.x * CELL, this.t.y * CELL);
    this.me.body.setDepth(12);
    this.me.badge.setDepth(13);
    this.weather(W, H);
    this.tint = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setDepth(20);
    this.fog = this.add.image(0, 0, this.fogTexture(grid.width, grid.height)).setOrigin(0).setDisplaySize(W, H).setDepth(22);
    this.world.add([this.tint, this.fog]);

    // two cameras: the chart zooms and follows the party; the console stays put at any zoom
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H + HUD_H); // room to see the south edge above the console
    cam.setZoom(this.zoom);
    cam.startFollow(this.me.body, true, 0.08, 0.08);
    cam.ignore(this.hudLayer);
    const hudCam = this.cameras.add(0, 0, GAME_W, GAME_H);
    hudCam.ignore(this.world);

    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.zoom = Phaser.Math.Clamp(this.zoom + (dy > 0 ? -0.2 : 0.2), MIN_ZOOM, MAX_ZOOM);
      cam.zoomTo(this.zoom, 180);
    });
    // two fingers zoom the chart; a tap (not a pinch) sets the course
    const pinch = pinchZoom(this, (f) => {
      this.zoom = Phaser.Math.Clamp(this.zoom * f, MIN_ZOOM, MAX_ZOOM);
      cam.setZoom(this.zoom);
    });
    let pinched = false;
    this.input.on('pointerdown', () => (pinched = pinch.pinching()));
    this.input.on('pointermove', () => (pinched ||= pinch.pinching()));
    this.input.on(TOUCH ? 'pointerup' : 'pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length || session().modal || p.y > GAME_H - HUD_H || pinched || pinch.pinching()) return;
      const at = cam.getWorldPoint(p.x, p.y);
      this.net.send({ t: 'travel', x: Math.floor(at.x / CELL), y: Math.floor(at.y / CELL) });
    });
    onKey(this, (e) => {
      if (session().modal) return;
      if (e.key === ' ') this.net.send({ t: 'halt' });
    });
    this.hud();

    const on = <K extends keyof NetEvents>(k: K, fn: (...a: NetEvents[K]) => void) => this.unsub.push(this.net.events.on(k, fn));
    on('travel', (m) => this.update_(m));
    on('town', (m) => {
      if (this.scene.isActive('Town')) return;
      this.scene.launch('Town', { loc: m.loc });
      this.scene.bringToTop('Town');
    });
    on('welcome', (m) => {
      if (m.map !== 'world') return void this.scene.start('World', { map: m.map });
      if (m.state.travel) this.update_({ ...m.state.travel, day: Number(m.state.flags.day ?? 1), t: 'travel', parties: [], escort: this.escortOf(m.state.travel) });
    });
    this.events.once('shutdown', () => {
      if (this.scene.isActive('Town')) this.scene.stop('Town');
      this.unsub.forEach((u) => u());
      this.unsub = [];
    });
    this.draw();
    this.net.send({ t: 'resync' });
    if (import.meta.env.DEV)
      (window as unknown as Record<string, unknown>).__travel = {
        state: () => this.t,
        go: (x: number, y: number) => this.net.send({ t: 'travel', x, y }),
        to: (id: string) => this.net.send({ t: 'travel', to: id }),
        party: (tpl: string, dx: number, dy: number, members?: string[], route?: string) => this.net.send({ t: 'debug', op: { op: 'party', tpl, dx, dy, members, route } }),
        zoom: () => this.cameras.main.zoom,
      };
  }

  update(time: number, dtMs: number): void {
    this.net?.tick(Math.min(dtMs, 50)); // solo: the local room lives in this page
    if (!this.me) return;
    const dt = Math.min(dtMs, 100) / 1000;
    this.stepFigure(this.me, dt, time, this.t.path.length > 0 || (!!this.escort && !this.escort.paused));
    for (const f of this.figures.values()) this.stepFigure(f, dt, time, f.seen < 700);
    for (const c of this.clouds) {
      c.x += c.getData('vx') * dt;
      c.y += c.getData('vy') * dt;
      const grid = session().worldMap!;
      if (c.x > grid.width * CELL + 300) c.x = -300;
      if (c.y > grid.height * CELL + 300) c.y = -300;
    }
    this.drawRoute(time);
  }

  // ---------- the chart ----------

  /** Towns and edges: a token and a name; open ones glow and say come in, the rest are dim until their chapter. */
  private places(): void {
    const g = session().game;
    const locale = settings().language;
    for (const [id, loc] of Object.entries(g.content.locations)) {
      const [x, y] = loc.cell;
      const px = (x + 0.5) * CELL;
      const py = (y + 0.5) * CELL;
      if (loc.secret && !g.testAll(loc.open)) continue;
      const open = !!loc.map && g.testAll(loc.open);
      const frame = loc.secret ? 'token_spot' : id.startsWith('to_') ? 'token_exit' : open ? 'token_town' : 'token_town_closed';
      if (open) {
        const glow = this.add.image(px, py, 'atlas', 'glow').setDepth(4).setScale(0.6).setAlpha(0.5).setTint(0xffc070);
        this.tweens.add({ targets: glow, scale: 0.9, alpha: 0.15, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.world.add(glow);
      }
      const icon = this.add.image(px, py, 'atlas', frame).setDepth(5).setInteractive({ useHandCursor: false });
      const name = locationNameForDisplay(g, id, locale);
      const label = txt(this, px, py + 13, name, 12, open ? '#2b1f17' : '#5e3d24', undefined, true).setOrigin(0.5, 0).setDepth(5);
      label.setStroke('#e6cc97', 3);
      icon.on('pointerover', () => {
        this.tweens.add({ targets: icon, scale: 1.25, duration: 120 });
        const hint = loc.secret ? `${name}: ${uiText('map.go', locale)}` : open ? `${name}: ${uiText('map.enter', locale)}` : `${name}: ${uiText('map.opensInChapter', locale)} ${loc.chapter}`;
        session().ui.emit('hover', { label: hint, interact: true });
      });
      icon.on('pointerout', () => {
        this.tweens.add({ targets: icon, scale: 1, duration: 120 });
        session().ui.emit('hover', null);
      });
      icon.on('pointerdown', () => !session().modal && this.net.send({ t: 'travel', to: id }));
      this.world.add([icon, label]);
    }
  }

  /** Cloud shadows drifting on the wind, and dust in the air. */
  private weather(W: number, H: number): void {
    const key = cloudTexture(this);
    const r = new Phaser.Math.RandomDataGenerator(['sush']);
    for (let i = 0; i < 7; i++) {
      const c = this.add.image(r.between(-200, W), r.between(-200, H), key).setDepth(15).setScale(r.realInRange(1.6, 3.2));
      c.setData('vx', r.realInRange(5, 11)).setData('vy', r.realInRange(1, 3));
      this.clouds.push(c);
      this.world.add(c);
    }
    const dust = this.add.particles(0, 0, 'atlas', {
      frame: 'dust',
      x: { min: 0, max: W },
      y: { min: 0, max: H },
      speedX: { min: 8, max: 24 },
      speedY: { min: -3, max: 3 },
      lifespan: 5000,
      scale: { start: 0.35, end: 0.1 },
      alpha: { start: 0.35, end: 0 },
      frequency: 90,
    });
    dust.setDepth(16);
    this.world.add(dust);
  }

  /** A walking figure (the leader's own sprite) and a badge bobbing over it. */
  private figure(sheet: string, badge: string, x: number, y: number): Figure {
    const meta = (this.cache.json.get('meta') as GenMeta).sheets[sheet] ?? (this.cache.json.get('meta') as GenMeta).sheets.hero_0;
    const key = this.textures.exists(sheet) ? sheet : 'hero_0';
    walkAnims(this, key, meta.poses);
    const body = this.add.sprite(x, y, key, 1 * meta.poses.length).setOrigin(meta.footX / meta.w, meta.footY / meta.h).setScale(FIGURE_SCALE).setDepth(10);
    const flag = this.add.image(x, y - 34, 'atlas', badge).setScale(0.7).setDepth(11);
    this.world.add([body, flag]);
    return { body, badge: flag, sheet: key, x, y, tx: x, ty: y, dir: 1, seen: 9999, bob: Math.random() * 6 };
  }

  /** Glide to the reported spot; walk facing the way, stand still otherwise; the badge bobs. */
  private stepFigure(f: Figure, dt: number, time: number, moving: boolean): void {
    const dx = f.tx - f.x;
    const dy = f.ty - f.y;
    const k = Math.min(1, dt * 6);
    f.x += dx * k;
    f.y += dy * k;
    f.seen += dt * 1000;
    if (Math.hypot(dx, dy) > 0.4) f.dir = dirFromVector(dx, dy);
    const meta = (this.cache.json.get('meta') as GenMeta).sheets[f.sheet];
    if (moving && meta) f.body.anims.play(`${f.sheet}_walk_${f.dir}`, true);
    else if (meta) {
      f.body.anims.stop();
      f.body.setFrame(f.dir * meta.poses.length);
    }
    f.body.setPosition(f.x, f.y);
    f.badge.setPosition(f.x, f.y - 34 + Math.sin(time * 0.004 + f.bob) * 2);
  }

  // ---------- the console ----------

  private hud(): void {
    const x = GAME_W - 300;
    this.hudLayer.add(glass(this, x, 10, 288, 132));
    this.info = txt(this, x + 14, 20, '', 13, C.crtBright, 260);
    this.hudLayer.add(this.info);
    this.sneakBtn = button(this, x + 14, 104, 126, 26, uiText('travel.sneak', settings().language), () => this.net.send({ t: 'sneak', on: !this.t.sneak }));
    const camp = button(this, x + 148, 104, 126, 26, uiText('travel.camp', settings().language), () => this.net.send({ t: 'camp' }));
    this.hudLayer.add([this.sneakBtn.root, camp.root]);
  }

  // ---------- what the room reports ----------

  private update_(m: Omit<TravelMsg, 'seen'> & { seen?: string }): void {
    const moved = Math.hypot(m.x - this.t.x, m.y - this.t.y) > 0.05;
    Object.assign(this.t, { x: m.x, y: m.y, minute: m.minute, path: m.path, target: m.target, sneak: m.sneak });
    if (m.seen) this.t.seen = m.seen;
    this.day = m.day;
    this.escort = m.escort;
    this.showStorms(m.storms ?? []);
    Object.assign(this.me, { tx: m.x * CELL, ty: m.y * CELL, seen: 0 });
    if (!moved && this.trailPts.length === 0) Object.assign(this.me, { x: m.x * CELL, y: m.y * CELL });
    this.others(m.parties);
    if (moved || !this.trailPts.length) {
      this.trailPts.push({ x: m.x, y: m.y });
      if (this.trailPts.length > TRAIL_MAX) this.trailPts.shift();
    }
    this.draw(!!m.seen);
  }

  private escortOf(t: TravelState): TravelMsg['escort'] {
    return t.escort ? { to: session().game.content.locations[t.escort.to]?.name ?? t.escort.to, paused: t.escort.paused } : null;
  }

  /** The parties in sight: a figure each, hover for who they are and how they compare; a click goes to meet them. */
  private others(list: MapParty[]): void {
    const keep = new Set(list.map((p) => p.id));
    for (const [id, f] of this.figures)
      if (!keep.has(id)) {
        f.body.destroy();
        f.badge.destroy();
        this.figures.delete(id);
      }
    for (const p of list) {
      let f = this.figures.get(p.id);
      const x = p.x * CELL;
      const y = p.y * CELL;
      if (!f) {
        f = this.figure(p.sheet, `token_${p.kind}`, x, y);
        const fig = f;
        fig.badge.setInteractive();
        fig.badge.on('pointerout', () => session().ui.emit('hover', null));
        fig.badge.on('pointerdown', () => !session().modal && this.net.send({ t: 'travel', x: Math.floor(fig.tx / CELL), y: Math.floor(fig.ty / CELL) }));
        this.figures.set(p.id, f);
      }
      if (Math.hypot(x - f.tx, y - f.ty) > 0.2) f.seen = 0;
      f.tx = x;
      f.ty = y;
      f.badge.off('pointerover').on('pointerover', () => {
        const locale = settings().language;
        const name = mapLabelForDisplay(p.name, locale);
        const word = strengthForDisplay(p.word, locale);
        const heading = p.heading ? mapLabelForDisplay(p.heading, locale) : '';
        const label = locale === 'en'
          ? `${name} (${p.count}): ${word}${heading ? `, heading to ${heading}` : ''}${p.chasing ? '. Pursuing you!' : ''}`
          : `${name} (${p.count}): ${word}${heading ? `, идёт в ${heading}` : ''}${p.chasing ? '. Идёт за вами!' : ''}`;
        session().ui.emit('hover', { label, interact: true });
      });
      f.badge.setTint(p.chasing ? 0xff8866 : 0xffffff);
    }
  }

  private draw(fog = true): void {
    // the trail of steps behind: dots, fading with age (the old world maps did it this way)
    this.trail.clear();
    const n = this.trailPts.length;
    let last: { x: number; y: number } | null = null;
    this.trailPts.forEach((p, i) => {
      if (last && Math.hypot(p.x - last.x, p.y - last.y) * CELL < 7) return;
      last = p;
      this.trail.fillStyle(0x8a2a14, 0.25 + 0.6 * (i / n));
      this.trail.fillCircle(p.x * CELL, p.y * CELL, 1.8);
    });
    const light = daylight(this.t.minute);
    this.tweens.add({ targets: this.tint, fillAlpha: light.alpha, duration: 600 });
    this.tint.fillColor = light.color;
    if (fog) this.drawFog();
    this.drawInfo();
  }

  /** Salt storms as a white veil with blowing grit over their stretch of the chart (redrawn only when they change). */
  private showStorms(storms: [number, number, number, number][]): void {
    const key = JSON.stringify(storms);
    if (key === this.stormKey) return;
    this.stormKey = key;
    this.storms = storms;
    this.stormLayer.forEach((o) => o.destroy());
    this.stormLayer = [];
    for (const [x0, y0, x1, y1] of storms) {
      const [px, py, pw, ph] = [x0 * CELL, y0 * CELL, (x1 - x0 + 1) * CELL, (y1 - y0 + 1) * CELL];
      const veil = this.add.graphics().setDepth(18);
      for (let k = 0; k < 6; k++) veil.fillStyle(0xf4efe2, 0.07).fillRoundedRect(px - k * 6, py - k * 6, pw + k * 12, ph + k * 12, 18);
      const grit = this.add.particles(0, 0, 'atlas', {
        frame: 'dust',
        x: { min: px, max: px + pw },
        y: { min: py, max: py + ph },
        speedX: { min: 40, max: 90 },
        speedY: { min: -8, max: 8 },
        lifespan: 1800,
        scale: { start: 0.5, end: 0.15 },
        alpha: { start: 0.6, end: 0 },
        tint: 0xffffff,
        frequency: 25,
      });
      grit.setDepth(19);
      this.world.add([veil, grit]);
      this.stormLayer.push(veil, grit);
    }
  }

  private inStorm(): boolean {
    return this.storms.some(([x0, y0, x1, y1]) => this.t.x >= x0 && this.t.x < x1 + 1 && this.t.y >= y0 && this.t.y < y1 + 1);
  }

  /** The route ahead as running dashes, the destination pulsing. */
  private drawRoute(time: number): void {
    const g = this.route.clear();
    const t = this.t;
    if (!t.path.length) return;
    const pts = [{ x: this.me.x, y: this.me.y }, ...t.path.map(([x, y]) => ({ x: (x + 0.5) * CELL, y: (y + 0.5) * CELL }))];
    const DASH = 6;
    const GAP = 5;
    let phase = (time * 0.02) % (DASH + GAP);
    g.lineStyle(2, 0xa84e24, 0.95);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let s = -phase; s < len; s += DASH + GAP) {
        const s0 = Math.max(0, s);
        const s1 = Math.min(len, s + DASH);
        if (s1 <= s0) continue;
        g.lineBetween(a.x + ((b.x - a.x) * s0) / len, a.y + ((b.y - a.y) * s0) / len, a.x + ((b.x - a.x) * s1) / len, a.y + ((b.y - a.y) * s1) / len);
      }
      phase = (phase + len) % (DASH + GAP);
    }
    const end = pts[pts.length - 1];
    const pulse = 5 + Math.sin(time * 0.006) * 2;
    g.lineStyle(2, 0xa84e24, 0.9).strokeCircle(end.x, end.y, pulse);
    g.lineStyle(1, 0xa84e24, 0.5).strokeCircle(end.x, end.y, pulse + 4);
  }

  /** A small canvas, a pixel per cell (plus a margin), stretched smoothly over the chart: a soft veil. */
  private fogTexture(w: number, h: number): string {
    const key = 'travel_fog';
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.createCanvas(key, (w + 2) * FOG_RES, (h + 2) * FOG_RES)!.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return key;
  }

  /** Unknown land under a dark veil with soft edges; the veil is thinner next to what the party has seen. */
  private drawFog(): void {
    const grid = session().worldMap!;
    const tex = this.textures.get('travel_fog') as Phaser.Textures.CanvasTexture;
    const seen = (x: number, y: number) => x >= 0 && y >= 0 && x < grid.width && y < grid.height && this.t.seen[y * grid.width + x] === '1';
    // a crisp mask per cell, then blurred onto the texture
    const mask = document.createElement('canvas');
    mask.width = tex.width;
    mask.height = tex.height;
    const m = mask.getContext('2d')!;
    m.fillStyle = 'rgba(18,13,10,0.9)';
    m.fillRect(0, 0, mask.width, mask.height);
    for (let y = 0; y < grid.height; y++)
      for (let x = 0; x < grid.width; x++) if (seen(x, y)) m.clearRect((x + 1) * FOG_RES, (y + 1) * FOG_RES, FOG_RES, FOG_RES);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, tex.width, tex.height);
    ctx.filter = `blur(${FOG_RES * 0.9}px)`;
    ctx.drawImage(mask, 0, 0);
    ctx.filter = 'none';
    tex.refresh();
    // the texture has a one-cell margin all round, so it hangs over the chart edges evenly
    this.fog.setPosition(-CELL, -CELL).setDisplaySize((grid.width + 2) * CELL, (grid.height + 2) * CELL);
  }

  private drawInfo(): void {
    const g = session().game;
    const tr = new Travel(session().worldMap!, this.t);
    const pace = { survival: g.skill('survival'), perception: g.attr('per'), tracker: g.hasPerk('tracker'), wounded: g.state.hp < g.maxHp / 2, thirsty: !!g.body.thirsty, storm: this.inStorm() };
    const hh = String(Math.floor(this.t.minute / 60)).padStart(2, '0');
    const mm = String(Math.floor(this.t.minute % 60)).padStart(2, '0');
    const flasks = g.count('flask');
    const locale = settings().language;
    this.info.setText(travelInfoLines({
      day: this.day, time: `${hh}:${mm}`, night: tr.night(),
      terrain: tr.terrainAt(this.t.x, this.t.y).name, storm: pace.storm,
      pace: tr.pace(pace), flasks, thirsty: !!g.body.thirsty,
      escort: this.escort && { to: mapLabelForDisplay(this.escort.to, locale), paused: this.escort.paused },
      moving: tr.moving,
    }, locale).join('\n'));
    this.sneakBtn.label.setColor(this.t.sneak ? C.amber : C.crt);
  }
}
