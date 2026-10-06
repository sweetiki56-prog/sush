// The world as the room reports it: map, people, monsters, fights. Input becomes intents;
// every change arrives as a message from the room (local in solo, the server online).
import Phaser from 'phaser';
import { music, type TrackName } from '../audio/Music';
import { placeOfMap } from '../core/places';
import { session } from '../session';
import { loadingFor, type LoadingData } from './LoadingScene';
import { synth } from '../audio/Synth';
import { ZOOMS } from '../config';
import { settings } from '../core/Settings';
import type { FlagValue } from '../core/types';
import type { ServerMsg } from '../core/room/protocol';
import type { NetClient, NetEvents, Welcome } from '../net/NetClient';
import type { Actor } from '../world/Actor';
import { Ambience } from '../world/Ambience';
import { Cast } from '../world/Cast';
import { FightView } from '../world/CombatView';
import { WorldMap } from '../world/MapBuilder';
import { HostileOutlines } from '../world/HostileOutlines';
import { HARD_GROUND, type GenMeta, type MapData } from '../world/MapData';
import { Pointer } from '../world/Pointer';
import { blast } from '../world/Fx';
import { exposeDebug } from '../world/debug';
import { gridToScreen } from '../iso/IsoMath';
import type { Tile } from '../iso/Pathfinder';
import { pinchZoom } from '../ui/touch';
import { areaNameForDisplay, locationNameForDisplay, mapLabelForDisplay } from '../i18n/display';
import { uiText } from '../i18n/ui';

export class WorldScene extends Phaser.Scene {
  map!: WorldMap;
  cast!: Cast;
  private ready = false;
  fight!: FightView;
  pointer!: Pointer;
  net!: NetClient;
  private ambience!: Ambience;
  private hostileOutlines!: HostileOutlines;
  private zoomIdx = Math.max(0, ZOOMS.indexOf(settings().zoom));
  private campfire: Tile = { x: 0, y: 0 };
  private unsub: (() => void)[] = [];
  private mapId = 'rusty_well';

  constructor() {
    super('World');
  }

  /** This client's own character. */
  get player(): Actor {
    return this.cast?.actor(this.net.you) as Actor;
  }

  create(data?: { map?: string }): void {
    this.ready = false; // the scene object outlives a restart: the last map's cast is gone until this one is built
    this.net = session().net!;
    const s = session();
    this.mapId = data?.map ?? (this.net.mode === 'arena' ? 'arena' : String(s.game?.flag('at') ?? 'rusty_well'));
    if (this.mapId === 'world') return void this.scene.start('Travel'); // a save made on the road
    const mapData = s.maps[this.mapId] ?? s.maps.rusty_well;
    const meta = this.cache.json.get('meta') as GenMeta;
    // the baked ground of a map is big: it loads when the party first gets there
    const ground = meta.grounds?.[this.mapId];
    if (ground && !this.textures.exists(ground.key)) {
      loadingFor(this, this.arrival(mapData));
      this.load.image(ground.key, `assets/gen/${ground.key}.png`);
      this.load.once('complete', () => this.scene.restart({ map: this.mapId }));
      this.load.start();
      return;
    }
    this.map = new WorldMap(this, mapData, meta);
    this.cast = new Cast(this, meta);
    this.hostileOutlines = new HostileOutlines(this, this.map, this.cast);
    this.ready = true;
    this.fight = new FightView(this, this.net);
    this.pointer = new Pointer(this);
    this.input.mouse?.disableContextMenu(); // right click cancels a grenade throw
    this.ambience = new Ambience(this);
    const fire = mapData.objects.find((o) => o.frame === 'campfire');
    if (fire) {
      this.campfire = { x: fire.x, y: fire.y };
      this.ambience.campfire(fire.x, fire.y);
    }

    const cam = this.cameras.main;
    const b = this.map.bounds();
    cam.setBounds(b.x, b.y, b.width, b.height);
    cam.setZoom(ZOOMS[this.zoomIdx]);
    cam.setPostPipeline('WastelandFX');
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.zoomIdx = Phaser.Math.Clamp(this.zoomIdx + (dy > 0 ? -1 : 1), 0, ZOOMS.length - 1);
      cam.zoomTo(ZOOMS[this.zoomIdx], 180);
    });
    // two fingers step the zoom like the wheel: a quarter wider or closer per step
    let spread = 1;
    pinchZoom(this, (f) => {
      spread *= f;
      if (spread > 1.25 || spread < 0.8) {
        this.zoomIdx = Phaser.Math.Clamp(this.zoomIdx + (spread > 1 ? 1 : -1), 0, ZOOMS.length - 1);
        cam.zoomTo(ZOOMS[this.zoomIdx], 120);
        spread = 1;
      }
    });

    const on = <K extends keyof NetEvents>(k: K, fn: (...a: NetEvents[K]) => void) => this.unsub.push(this.net.events.on(k, fn));
    on('welcome', (m) => this.build(m));
    on('walk', (m) => this.walk(m));
    on('place', (m) => {
      const a = this.cast.actor(m.id);
      a?.teleport(m.x, m.y);
      a?.face(m.dir);
    });
    on('face', (m) => this.cast.actor(m.id)?.faceTile(m.x, m.y));
    on('spawn', (m) => this.cast.add(m.actor));
    on('despawn', (m) => this.cast.remove(m.id));
    on('hostile', (m) => this.cast.setHostile(m));
    on('flag', (m) => this.onFlag(m.key, m.value, false));
    on('fx', (m) => {
      const p = gridToScreen(m.x + 0.5, m.y + 0.5);
      blast(this, p.x, p.y - 8, m.r * 32, 450);
      synth.boom();
    });
    on('combat', (m) => {
      music.play('fight');
      void this.fight.onBatch(m);
    });
    on('combatEnd', () => {
      this.fight.onEnd();
      music.play(this.calm());
    });
    this.events.once('shutdown', () => {
      this.hostileOutlines.destroy();
      this.unsub.forEach((u) => u());
      this.unsub = [];
    });

    this.net.send({ t: 'resync' });
    if (import.meta.env.DEV) exposeDebug(this);
  }

  /** A fresh snapshot: rebuild everyone, restore the map from the flags. */
  /** The loading screen for a place seen for the first time: a notice with its name, or a fight on the road. */
  private arrival(map: MapData): LoadingData {
    const game = session().game;
    const locale = settings().language;
    if (this.mapId === 'rocket_outpost' && session().game?.flag('rocket_reveal'))
      return { style: 'rocket', title: uiText('loading.rocketTitle', locale), subtitle: uiText('loading.rocketSubtitle', locale) };
    if (this.mapId.startsWith('enc_')) return { style: 'dusk', title: uiText('loading.roadAmbush', locale), subtitle: `${mapLabelForDisplay(map.name, locale)}. ${uiText('loading.stayTogether', locale)}` };
    const place = placeOfMap(game.content.locations, this.mapId);
    const area = place && (place.loc.areas?.length ?? 0) > 1 ? areaNameForDisplay(game, place.id, this.mapId, locale) : null;
    const where = `${regionOf(place?.loc.cell, session().worldMap, locale)}, ${uiText('loading.basin', locale)}`;
    return { style: 'poster', title: place ? locationNameForDisplay(game, place.id, locale) : mapLabelForDisplay(map.name, locale), subtitle: this.mapId === 'arena' ? uiText('loading.arena', locale) : area ? `${area}. ${where}` : where };
  }

  /** The music of this place when nobody is fighting. */
  private calm(): TrackName {
    return this.mapId === 'arena' ? 'fight' : this.mapId.startsWith('enc_') ? 'road' : 'town';
  }

  private build(w: Welcome): void {
    // the party moved to another map: draw that one (the restart asks the room for a fresh snapshot)
    if (w.map === 'world') return void this.scene.start('Travel');
    if (w.map !== this.mapId) return void this.scene.restart({ map: w.map });
    this.cast.clear();
    this.map.reset();
    for (const a of w.actors) this.cast.add(a);
    for (const h of w.hostiles) this.cast.setHostile(h, false);
    for (const [k, v] of Object.entries(w.state.flags)) this.onFlag(k, v, true);
    const me = this.player;
    me.onStep = (t) => synth.step(HARD_GROUND.has(this.map.ground(t.x, t.y)));
    this.cameras.main.startFollow(me.sprite, true, 0.12, 0.12);
    this.fight.resume(w.combat);
    music.play(w.combat ? 'fight' : this.calm());
  }

  private walk(m: Extract<ServerMsg, { t: 'walk' }>): void {
    const a = this.cast.actor(m.id);
    if (!a) return;
    a.speed = m.speed;
    a.walk(m.path);
  }

  update(_t: number, dtMs: number): void {
    const ms = Math.min(dtMs, 50);
    this.net.tick(ms);
    if (!this.ready) return;
    this.cast.update(ms / 1000);
    this.hostileOutlines.update((id) => !!this.fight.combat?.unit(id));
    this.ambience.update(dtMs);
    const me = this.player;
    if (!me) return;
    this.map.roofs.update(me.tile.x, me.tile.y);
    const d = Math.hypot(me.gx - this.campfire.x - 0.5, me.gy - this.campfire.y - 0.5);
    synth.setFire(Phaser.Math.Clamp(1 - d / 7, 0, 1));
  }

  private onFlag(key: string, value: FlagValue, restoring: boolean): void {
    if (!this.map.applyFlag(key, value)) return;
    if (key === 'door_open' && !restoring) synth.creak();
    if (key === 'pump_fixed') {
      const pump = this.map.props.get('pump');
      if (pump) this.ambience.water(pump.obj.x, pump.obj.y);
      if (!restoring) synth.water();
    }
  }

  toScreen(p: { x: number; y: number }): { x: number; y: number } {
    const cam = this.cameras.main;
    return { x: (p.x - cam.worldView.x) * cam.zoom, y: (p.y - cam.worldView.y) * cam.zoom };
  }
}

/** The region a place lies in, by its cell on the chart: the Верховья on top, the Солончаки east of Низовье. */
function regionOf(cell: [number, number] | undefined, grid: { north?: number } | null | undefined, locale: 'ru' | 'en' | 'es' | 'zh-Hans'): string {
  if (!cell) return uiText('region.lowland', locale);
  if (cell[1] < (grid?.north ?? 0)) return uiText('region.upper', locale);
  return uiText(cell[0] >= 64 ? 'region.salt' : 'region.lowland', locale);
}
