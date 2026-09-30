import Phaser from 'phaser';
import { loadingFor } from './LoadingScene';
import type { GenMeta, MapData } from '../world/MapData';
import { session } from '../session';
import { CONTENT, MAP_IDS } from '../content';
import type { WorldGridData } from '../core/travel/Travel';

// Cyrillic + Latin sample so the browser fetches both unicode-range subsets.
const SAMPLE = 'Сушь, Ржавый колодец 0123';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    loadingFor(this, { style: 'dusk', title: 'СУШЬ', subtitle: 'Низовье. Двести лет после воды.' });
    const base = 'assets/gen/';
    this.load.image('ground', base + 'ground.png');
    this.load.image('ground_arena', base + 'ground_arena.png');
    this.load.atlas('atlas', base + 'atlas.png', base + 'atlas.json');
    for (const id of MAP_IDS) this.load.json(`map_${id}`, `assets/maps/${id}.json`);
    this.load.json('world_low', 'assets/maps/world_low.json');
    // the plans of towns of several areas (the town screen)
    for (const [id, loc] of Object.entries(CONTENT.locations)) if ((loc.areas?.length ?? 0) > 1) this.load.image(`townplan_${id}`, `assets/gen/townplan_${id}.jpg`);
    // sprite sheet frame sizes live in meta.json, so queue the sheets once it arrives
    this.load.once('filecomplete-json-meta', (_k: string, _t: string, meta: GenMeta) => {
      for (const [key, s] of Object.entries(meta.sheets)) this.load.spritesheet(key, `${base}${key}.png`, { frameWidth: s.w, frameHeight: s.h });
    });
    this.load.json('meta', base + 'meta.json');
  }

  async create(): Promise<void> {
    try {
      await Promise.all([
        document.fonts.load('14px "IBM Plex Mono"', SAMPLE),
        document.fonts.load('700 14px "IBM Plex Mono"', SAMPLE),
        document.fonts.load('16px "Press Start 2P"', SAMPLE),
      ]);
    } catch {
      /* fall back to system fonts */
    }
    session().maps = Object.fromEntries(MAP_IDS.map((id) => [id, this.cache.json.get(`map_${id}`) as MapData]));
    session().worldMap = this.cache.json.get('world_low') as WorldGridData;
    // launch only after the atlas has finished loading, so the cursor frames exist
    this.scene.launch('Cursor');
    this.scene.start('Menu');
  }
}
